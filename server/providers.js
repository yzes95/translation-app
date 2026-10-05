// Provider Chain Module: Multi-Model AI Translation & Transcription
// Order of priority: Gemini (1st) -> Groq (2nd) -> Cloudflare Workers AI (3rd)

const cooldowns = new Map(); // providerName -> uncoolTimestamp

// Language display names
export const LANGUAGE_NAMES = {
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

// Dialect rules
export function getDialectContext(sourceLang, targetLang) {
  const tgtName = LANGUAGE_NAMES[targetLang] || targetLang || 'English';
  if (sourceLang === 'ar') {
    return `
CRITICAL ARABIC DIALECT RULES:
1. In conversational Egyptian Arabic, the word "نص" and the phrase "في النص" almost always mean "in the middle" (e.g. "in the middle of my speech", "halfway through", "halfway in the sentence"), NOT "in the text".
2. Understand colloquial expressions: "شغال" = "working / running", "بيقطع" = "cutting off / interrupting", "كده" = "like this", "مش" = "not", "عايز" = "want", "طلع" = "appeared / showed".`;
  }
  if (sourceLang === 'pcm') {
    return `
CRITICAL NIGERIAN PIDGIN RULES:
1. The source is spoken Nigerian Pidgin English (e.g. "How you dey?" -> "How are you?", "Wetin dey happen?" -> "What is happening?", "I dey go" -> "I am going", "no wahala" -> "no problem", "abeg" -> "please", "na so" -> "that's true", "make we" -> "let us", "abi" -> "right?", "dey come" -> "is coming").
2. Translate all Nigerian Pidgin idioms and vocabulary accurately into natural standard ${tgtName}.`;
  }
  if (sourceLang === 'yo') {
    return `
CRITICAL YORUBA RULES:
1. The source is Yoruba. Accurately translate conversational Yoruba into natural standard ${tgtName}.`;
  }
  return '';
}

// Shared interpreter prompt builder
export function buildInterpreterPrompt(cleanText, srcName, tgtName, dialectContext = '') {
  return `You are an expert simultaneous conference interpreter. Translate the following speech from ${srcName} into ${tgtName}.
${dialectContext}

Rules:
1. Translate conversational speech accurately, naturally, and contextually.
2. Output ONLY the translated text in ${tgtName} without quotation marks, markdown formatting, dialect labels, or explanations.

Speech to translate:
"${cleanText}"`;
}

// Shared audio interpreter prompt builder
export function buildAudioInterpreterPrompt(srcName, tgtName) {
  return `The audio is spoken Yoruba. Transcribe it in Yoruba with correct tone marks, then translate it into ${tgtName}. If the audio is not Yoruba or is silent, return an empty transcript. Reply ONLY as valid JSON in this format:
{"transcript":"...","translation":"..."}`;
}

// Key extractors with alias support
function getGeminiKey() {
  return (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
}

function getGroqKey() {
  return (process.env.GROCK_API_KEY || process.env.GROQ_API_KEY || '').trim().replace(/^["']|["']$/g, '');
}

function getCloudflareKey() {
  return (process.env.CLOUD_FARE_API_KEY || process.env.CLOUDFLARE_API_KEY || process.env.CLOUDFLARE_API_TOKEN || '').trim().replace(/^["']|["']$/g, '');
}

function getCloudflareAccountId() {
  return (process.env.CLOUD_FARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '').trim().replace(/^["']|["']$/g, '');
}

// -------------------------------------------------------------
// Provider 1: Gemini
// -------------------------------------------------------------
const geminiProvider = {
  name: 'gemini',
  isConfigured: () => Boolean(getGeminiKey()),

  translateText: async ({ text, srcName, tgtName, dialectContext }) => {
    const geminiKey = getGeminiKey();
    if (!geminiKey) throw new Error('Gemini key not configured');

    const prompt = buildInterpreterPrompt(text, srcName, tgtName, dialectContext);
    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
    let lastError = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6500);

        const res = await fetch(url, {
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

        if (res.status === 429) {
          lastError = new Error(`Gemini 429 rate-limited on ${model}`);
          continue;
        }

        if (res.ok) {
          const data = await res.json();
          const translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          if (translatedText) {
            return {
              translatedText,
              modelUsed: `gemini:${model}`
            };
          }
        } else {
          const errBody = await res.text().catch(() => '');
          lastError = new Error(`Gemini status ${res.status} (${model}): ${errBody}`);
        }
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('Gemini failed to translate');
  },

  translateAudio: async ({ buffer, mimeType, srcName, tgtName }) => {
    const geminiKey = getGeminiKey();
    if (!geminiKey) throw new Error('Gemini key not configured');

    const prompt = buildAudioInterpreterPrompt(srcName, tgtName);
    const base64Audio = buffer.toString('base64');
    const model = 'gemini-3.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType || 'audio/webm',
                  data: base64Audio
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Gemini audio error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Clean possible markdown code fences
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const transcript = (parsed.transcript || '').trim();
    const translation = (parsed.translation || '').trim();

    return {
      transcript,
      translatedText: translation,
      modelUsed: `gemini:${model}`,
      notYoruba: !transcript || transcript.length < 2
    };
  }
};

// -------------------------------------------------------------
// Provider 2: Groq
// -------------------------------------------------------------
const groqProvider = {
  name: 'groq',
  isConfigured: () => Boolean(getGroqKey()),

  translateText: async ({ text, srcName, tgtName, dialectContext }) => {
    const groqKey = getGroqKey();
    if (!groqKey) throw new Error('Groq key not configured');

    const prompt = buildInterpreterPrompt(text, srcName, tgtName, dialectContext);
    const model = 'llama-3.3-70b-versatile';
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 256,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text }
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Groq text error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const translatedText = data?.choices?.[0]?.message?.content?.trim() || '';

    return {
      translatedText,
      modelUsed: `groq:${model}`
    };
  },

  translateAudio: async ({ buffer, mimeType, srcName, tgtName }) => {
    const groqKey = getGroqKey();
    if (!groqKey) throw new Error('Groq key not configured');

    // Step 1: Groq Whisper transcription
    const formData = new FormData();
    const audioBlob = new Blob([buffer], { type: mimeType || 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'yo');
    formData.append('response_format', 'json');
    formData.append('temperature', '0');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const transcribeRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`
      },
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!transcribeRes.ok) {
      const errBody = await transcribeRes.text().catch(() => '');
      throw new Error(`Groq whisper error ${transcribeRes.status}: ${errBody}`);
    }

    const transcribeData = await transcribeRes.json();
    const transcript = (transcribeData?.text || '').trim();

    if (!transcript || transcript.length < 2) {
      return {
        transcript: '',
        translatedText: '',
        modelUsed: 'groq:whisper-large-v3',
        notYoruba: true
      };
    }

    // Step 2: Groq Llama translation
    const dialectContext = getDialectContext('yo', tgtName);
    const translationResult = await groqProvider.translateText({
      text: transcript,
      srcName: 'Yoruba',
      tgtName,
      dialectContext
    });

    return {
      transcript,
      translatedText: translationResult.translatedText,
      modelUsed: `groq:whisper-large-v3+${translationResult.modelUsed}`,
      notYoruba: false
    };
  }
};

// -------------------------------------------------------------
// Provider 3: Cloudflare Workers AI
// -------------------------------------------------------------
const cloudflareProvider = {
  name: 'cloudflare',
  isConfigured: () => Boolean(getCloudflareKey() && getCloudflareAccountId()),

  translateText: async ({ text, srcName, tgtName, dialectContext }) => {
    const key = getCloudflareKey();
    const accountId = getCloudflareAccountId();
    if (!key || !accountId) throw new Error('Cloudflare credentials not configured');

    const prompt = buildInterpreterPrompt(text, srcName, tgtName, dialectContext);
    const candidateModels = [
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      '@cf/meta/llama-3.1-8b-instruct'
    ];
    let lastError = null;

    for (const model of candidateModels) {
      try {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: text }
            ]
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          lastError = new Error(`Cloudflare status ${res.status} (${model}): ${errBody}`);
          continue;
        }

        const data = await res.json();
        const translatedText = data?.result?.response?.trim() || '';
        if (translatedText) {
          return {
            translatedText,
            modelUsed: `cloudflare:${model}`
          };
        }
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('Cloudflare text translation failed');
  },

  translateAudio: async ({ buffer, mimeType, srcName, tgtName }) => {
    const key = getCloudflareKey();
    const accountId = getCloudflareAccountId();
    if (!key || !accountId) throw new Error('Cloudflare credentials not configured');

    // Step 1: Cloudflare Whisper transcription
    const whisperModel = '@cf/openai/whisper-large-v3-turbo';
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${whisperModel}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/octet-stream'
      },
      body: buffer,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Cloudflare audio error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const transcript = (data?.result?.text || '').trim();

    if (!transcript || transcript.length < 2) {
      return {
        transcript: '',
        translatedText: '',
        modelUsed: `cloudflare:${whisperModel}`,
        notYoruba: true
      };
    }

    // Step 2: Translate transcript using Cloudflare text model
    const dialectContext = getDialectContext('yo', tgtName);
    const translationResult = await cloudflareProvider.translateText({
      text: transcript,
      srcName: 'Yoruba',
      tgtName,
      dialectContext
    });

    return {
      transcript,
      translatedText: translationResult.translatedText,
      modelUsed: `cloudflare:${whisperModel}+${translationResult.modelUsed}`,
      notYoruba: false
    };
  }
};

// -------------------------------------------------------------
// Provider Chain & Execution Orchestrator
// -------------------------------------------------------------
export const CHAIN = [geminiProvider, groqProvider, cloudflareProvider];

export function getProviderStatus() {
  return {
    gemini: geminiProvider.isConfigured(),
    groq: groqProvider.isConfigured(),
    cloudflare: cloudflareProvider.isConfigured()
  };
}

export async function runChain(method, args) {
  const forceFail = (process.env.FORCE_FAIL || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const now = Date.now();
  let lastError = null;

  for (const provider of CHAIN) {
    if (!provider.isConfigured()) continue;
    if (typeof provider[method] !== 'function') continue;

    // Check if forcefully bypassed for testing
    if (forceFail.includes(provider.name.toLowerCase())) {
      console.log(`[Chain] Provider ${provider.name} bypassed via FORCE_FAIL`);
      continue;
    }

    // Check cooldown
    const uncoolAt = cooldowns.get(provider.name) || 0;
    if (now < uncoolAt) {
      const remainingSec = Math.round((uncoolAt - now) / 1000);
      console.log(`[Chain] Provider ${provider.name} in cooldown (${remainingSec}s remaining)`);
      continue;
    }

    try {
      const result = await provider[method](args);
      if (result) {
        return result;
      }
    } catch (err) {
      console.warn(`[Chain] Provider ${provider.name} ${method} failed:`, err.message);
      lastError = err;

      const msg = (err.message || '').toLowerCase();
      const isQuotaOrRate =
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('resource_exhausted') ||
        msg.includes('rate limit');
      const isServerDown =
        msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504');

      if (isQuotaOrRate) {
        const cooldownMs = msg.includes('quota') || msg.includes('exhausted') ? 10 * 60 * 1000 : 60 * 1000;
        cooldowns.set(provider.name, Date.now() + cooldownMs);
      } else if (isServerDown) {
        cooldowns.set(provider.name, Date.now() + 30 * 1000);
      }
    }
  }

  throw lastError || new Error('All AI providers failed or are currently unavailable');
}
