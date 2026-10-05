import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Stripe if secret key is present
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// CORS setup - allows Render static site, GitHub Pages, or localhost
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://yzes95.github.io',
  process.env.APP_ORIGIN
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) or if in allowed list
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive during early testing
      }
    },
    credentials: true
  })
);

// -------------------------------------------------------------
// Stripe Webhook Endpoint (needs raw body before express.json())
// -------------------------------------------------------------
app.post(
  '/api/tips/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !webhookSecret) {
      return res.status(400).send('Stripe or webhook secret not configured');
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle completed checkout session
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log(`Tip received: ${session.amount_total / 100} ${session.currency.toUpperCase()}`);
    }

    res.json({ received: true });
  }
);

// Body parser for all other JSON routes
app.use(express.json());

// -------------------------------------------------------------
// In-Memory Quota & Usage Store (Daily 30 min per user)
// -------------------------------------------------------------
// Maps userId -> { dateStr: 'YYYY-MM-DD', usedSeconds: number }
const dailyUsage = new Map();
const DAILY_LIMIT_SECONDS = 30 * 60; // 30 minutes

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getUserUsage(userId) {
  const today = getTodayStr();
  const record = dailyUsage.get(userId);
  if (!record || record.dateStr !== today) {
    const newRecord = { dateStr: today, usedSeconds: 0 };
    dailyUsage.set(userId, newRecord);
    return newRecord;
  }
  return record;
}

const APP_BUILD_VERSION = '2026.10.05.v3';

// Server-side fast cache for identical queries (saves Gemini quota)
const serverCache = new Map();
const CACHE_MAX_ITEMS = 600;

// Per-user request throttling (prevents accidental speech spam from exceeding 15 RPM)
const userLastRequest = new Map();

// -------------------------------------------------------------
// 0. Root Status Endpoint
// -------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    name: 'LinguaFlow API Backend',
    version: APP_BUILD_VERSION,
    uptime: process.uptime(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    stripeConfigured: !!stripe
  });
});

// -------------------------------------------------------------
// 1. Health Check (Used by PWA for warming-up detection & version verify)
// -------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: APP_BUILD_VERSION,
    uptime: process.uptime(),
    timestamp: Date.now(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    stripeConfigured: !!stripe
  });
});

// -------------------------------------------------------------
// 2. Usage Tracking Endpoint
// -------------------------------------------------------------
app.get('/api/usage', (req, res) => {
  const userId = req.headers['x-user-id'] || req.query.userId || req.ip;
  const usage = getUserUsage(userId);
  const remainingSeconds = Math.max(0, DAILY_LIMIT_SECONDS - usage.usedSeconds);

  res.json({
    dailyLimitMinutes: 30,
    usedMinutes: Math.round((usage.usedSeconds / 60) * 10) / 10,
    remainingMinutes: Math.round((remainingSeconds / 60) * 10) / 10,
    hasRemaining: remainingSeconds > 0
  });
});



// -------------------------------------------------------------
// -------------------------------------------------------------
// 3. Smart Mode AI Translation (Shared Gemini Key with limits)
// -------------------------------------------------------------
app.post('/api/translate', async (req, res) => {
  const { text, sourceLang, targetLang, sessionDurationSeconds = 5 } = req.body;
  const userId = req.headers['x-user-id'] || req.body.userId || req.ip;

  if (!text || !text.trim()) {
    return res.json({ translatedText: '' });
  }

  const cleanText = text.trim();

  // 1. Check daily quota
  const usage = getUserUsage(userId);
  if (usage.usedSeconds >= DAILY_LIMIT_SECONDS) {
    return res.json({
      translatedText: '',
      fallback: true,
      error: 'quota_exceeded',
      message: 'You have used your 30 minutes of Smart AI for today. Switched to Basic mode.'
    });
  }

  // 2. Per-user Throttling (gracefully smooths fast speech without 429)
  const now = Date.now();
  const lastTime = userLastRequest.get(userId) || 0;
  if (now - lastTime < 800) {
    return res.json({
      translatedText: '',
      fallback: true,
      rateLimited: true,
      message: 'Fast speaking pace detected. Using instant Basic translation.'
    });
  }
  userLastRequest.set(userId, now);

  // 3. Server-side Query Cache (saves Gemini API calls)
  const cacheKey = `${sourceLang}|${targetLang}|${cleanText.toLowerCase()}`;
  if (serverCache.has(cacheKey)) {
    return res.json({
      translatedText: serverCache.get(cacheKey),
      modelUsed: 'gemini-3.5-flash-lite (cache)',
      remainingMinutes: Math.round(((DAILY_LIMIT_SECONDS - usage.usedSeconds) / 60) * 10) / 10
    });
  }

  // 4. Check if server Gemini key is configured
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!geminiKey) {
    return res.json({
      translatedText: '',
      fallback: true,
      error: 'server_not_configured',
      message: 'Server AI key not yet configured. Using Basic mode.'
    });
  }

  // 5. Translate using Gemini with multi-model fallback & dialect awareness
  const languageNames = {
    en: 'English',
    ar: 'Arabic',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ur: 'Urdu',
    hi: 'Hindi',
    ru: 'Russian',
    uk: 'Ukrainian',
    tr: 'Turkish',
    pcm: 'Nigerian Pidgin English',
    yo: 'Yoruba'
  };

  const srcName = languageNames[sourceLang] || sourceLang || 'Auto-detect';
  const tgtName = languageNames[targetLang] || targetLang || 'English';

  let dialectContext = '';
  if (sourceLang === 'ar') {
    dialectContext = `
CRITICAL ARABIC DIALECT RULES:
1. In conversational Egyptian Arabic, the word "نص" and the phrase "في النص" almost always mean "in the middle" (e.g. "in the middle of my speech", "halfway through", "halfway in the sentence"), NOT "in the text".
2. Understand colloquial expressions: "شغال" = "working / running", "بيقطع" = "cutting off / interrupting", "كده" = "like this", "مش" = "not", "عايز" = "want", "طلع" = "appeared / showed".`;
  } else if (sourceLang === 'pcm') {
    dialectContext = `
CRITICAL NIGERIAN PIDGIN RULES:
1. The source is spoken Nigerian Pidgin English (e.g. "How you dey?" -> "How are you?", "Wetin dey happen?" -> "What is happening?", "I dey go" -> "I am going", "no wahala" -> "no problem", "abeg" -> "please", "na so" -> "that's true", "make we" -> "let us", "abi" -> "right?", "dey come" -> "is coming").
2. Translate all Nigerian Pidgin idioms and vocabulary accurately into natural standard ${tgtName}.`;
  } else if (sourceLang === 'yo') {
    dialectContext = `
CRITICAL YORUBA RULES:
1. The source is Yoruba. Accurately translate conversational Yoruba into natural standard ${tgtName}.`;
  }

  const prompt = `You are an expert simultaneous conference interpreter. Translate the following speech from ${srcName} into ${tgtName}.
${dialectContext}

Rules:
1. Translate conversational speech accurately, naturally, and contextually.
2. Output ONLY the translated text in ${tgtName} without quotation marks, markdown formatting, dialect labels, or explanations.

Speech to translate:
"${cleanText}"`;

  // Focus only on active models supported on the project
  const candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash'
  ];
  let translatedText = '';
  let modelUsed = '';
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);

      const apiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 256
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (apiRes.status === 429) {
        lastError = 'Rate limit reached';
        continue;
      }

      if (apiRes.ok) {
        const data = await apiRes.json();
        translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        if (translatedText) {
          modelUsed = model;
          break; // Success!
        }
      } else {
        const errBody = await apiRes.text().catch(() => '');
        console.warn(`Gemini model ${model} returned ${apiRes.status}:`, errBody);
        lastError = `Status ${apiRes.status} (${model}): ${errBody}`;
      }
    } catch (e) {
      lastError = e.message;
    }
  }

  if (translatedText) {
    // Save to server fast cache
    if (serverCache.size >= CACHE_MAX_ITEMS) {
      const firstKey = serverCache.keys().next().value;
      serverCache.delete(firstKey);
    }
    serverCache.set(cacheKey, translatedText);

    // Record time usage
    usage.usedSeconds += Math.min(10, sessionDurationSeconds);
    const remainingSeconds = Math.max(0, DAILY_LIMIT_SECONDS - usage.usedSeconds);

    return res.json({
      translatedText,
      modelUsed,
      remainingMinutes: Math.round((remainingSeconds / 60) * 10) / 10
    });
  }

  console.warn('Gemini models unavailable/rate-limited, falling back to basic:', lastError);
  res.json({
    translatedText: '',
    fallback: true,
    details: lastError,
    message: 'Smart AI rate limit reached. Switched smoothly to Basic mode.'
  });
});

// -------------------------------------------------------------
// 4. Smart Mode Meeting Summary
// -------------------------------------------------------------
app.post('/api/summary', async (req, res) => {
  const { entries, sourceLang, targetLang } = req.body;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey || !entries || entries.length === 0) {
    return res.status(503).json({ error: 'Cannot produce summary' });
  }

  try {
    const transcriptText = entries.map((e) => `${e.speaker}: ${e.text}`).join('\n');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`;

    const prompt = `You are a meeting assistant. Summarize the following meeting transcript into JSON format with keys:
"executiveOverview" (1-2 sentences),
"keyPoints" (array of strings),
"decisions" (array of strings),
"actionItems" (array of objects with "task", "owner", "status").
Produce all outputs translated in ${targetLang}. Return valid JSON only.

Transcript:
${transcriptText}`;

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    const data = await apiRes.json();
    const summaryJson = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    res.json(summaryJson);
  } catch (err) {
    console.error('Summary production error:', err.message);
    res.status(500).json({ error: 'Summary generation failed' });
  }
});

// -------------------------------------------------------------
// 5. Stripe Hosted Checkout Session for Tips (£1 to £5+)
// -------------------------------------------------------------
app.post('/api/tips/checkout', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on this server.' });
  }

  const { amountGbp = 5, returnUrl } = req.body;
  // Stripe minimum charge for GBP is 30p (£0.30)
  const amountPence = Math.max(30, Math.round(Number(amountGbp) * 100));
  
  let siteUrl = (returnUrl || req.headers.origin || 'https://yzes95.github.io/translation-app').replace(/\/$/, '');
  if (siteUrl.includes('github.io') && !siteUrl.includes('translation-app')) {
    siteUrl += '/translation-app';
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Support LinguaFlow Development',
              description: 'Thank you for supporting free multilingual live translation!'
            },
            unit_amount: amountPence
          },
          quantity: 1
        }
      ],
      success_url: `${siteUrl}/?tip=success&amount=${amountGbp}`,
      cancel_url: `${siteUrl}/?tip=cancelled`
    });

    res.json({
      url: session.url,
      clientSecret: session.client_secret
    });
  } catch (err) {
    console.error('Stripe session creation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Start Server
// -------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`LinguaFlow API Server running on port ${PORT}`);
});
