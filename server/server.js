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

// -------------------------------------------------------------
// 1. Health Check (Used by PWA for warming-up detection)
// -------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
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
// 3. Smart Mode AI Translation (Shared Gemini Key with limits)
// -------------------------------------------------------------
app.post('/api/translate', async (req, res) => {
  const { text, sourceLang, targetLang, sessionDurationSeconds = 5 } = req.body;
  const userId = req.headers['x-user-id'] || req.body.userId || req.ip;

  if (!text || !text.trim()) {
    return res.json({ translatedText: '' });
  }

  // 1. Check daily quota
  const usage = getUserUsage(userId);
  if (usage.usedSeconds >= DAILY_LIMIT_SECONDS) {
    return res.status(429).json({
      error: 'quota_exceeded',
      fallback: true,
      message: 'You have used your 30 minutes of Smart AI for today. Switched to Basic mode.'
    });
  }

  // 2. Check if server Gemini key is configured
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(503).json({
      error: 'server_not_configured',
      fallback: true,
      message: 'Server AI key not yet configured. Using Basic mode.'
    });
  }

  // 3. Translate using Gemini 1.5 Flash
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
    const prompt = `You are a live simultaneous meeting interpreter. Translate conversational speech from ${sourceLang} to ${targetLang}. Accurately understand colloquial dialect idioms (such as Egyptian Arabic slang). Output ONLY the translated sentence without quotes or explanations.\n\nSpeech:\n${text}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (apiRes.status === 429) {
      return res.status(429).json({
        error: 'capacity_busy',
        fallback: true,
        message: 'Smart mode is busy right now, so we switched you to Basic.'
      });
    }

    if (!apiRes.ok) {
      throw new Error(`Gemini API returned status ${apiRes.status}`);
    }

    const data = await apiRes.json();
    const translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Record time usage
    usage.usedSeconds += Math.min(10, sessionDurationSeconds);

    const remainingSeconds = Math.max(0, DAILY_LIMIT_SECONDS - usage.usedSeconds);

    res.json({
      translatedText,
      remainingMinutes: Math.round((remainingSeconds / 60) * 10) / 10
    });
  } catch (err) {
    console.warn('Smart mode Gemini call failed:', err.message);
    res.status(502).json({
      error: 'translation_failed',
      fallback: true,
      message: 'Smart mode temporary hiccup, falling back to Basic.'
    });
  }
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

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
// 5. Stripe Embedded Checkout Session for Tips (£1 to £5+)
// -------------------------------------------------------------
app.post('/api/tips/checkout', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on this server.' });
  }

  const { amountGbp = 5, returnUrl } = req.body;
  const amountPence = Math.max(100, Math.round(Number(amountGbp) * 100)); // Minimum £1.00

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
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
      return_url: `${returnUrl || req.headers.origin || 'https://linguaflow.onrender.com'}/?session_id={CHECKOUT_SESSION_ID}`
    });

    res.json({ clientSecret: session.client_secret });
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
