import { apiService } from './apiService.js';
import { normalizeSpeech } from './dialectNormalizers.js';

const cache = new Map();

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .trim();
}

// Normalize colloquial spoken dialects (Egyptian, Levantine, Gulf)
// so translation models understand conversational idioms instead of literal dictionary terms.
export function normalizeArabicDialect(text) {
  if (!text) return '';
  let s = text.trim();

  const replacements = [
    // Prepositional phrases: "in the middle" vs literal "in the text"
    [/\bفي النص\b|\bفي النُص\b|\bفالنص\b/gi, 'في منتصف الجملة'],
    [/\bفي نص الكلام\b/gi, 'في منتصف الحديث'],
    [/\bفي الأول\b|\bفالاول\b/gi, 'في البداية'],
    [/\bفي الآخر\b|\bفالاخر\b/gi, 'في النهاية'],

    // Friendly slang addresses & greetings
    [/\bيا عم الحج\b|\bيا حاج\b/gi, 'يا أخي'],
    [/\bيا عمي\b|\bيا راجل\b/gi, 'يا صديقي'],
    [/\bالو\b|\bألو\b/gi, 'مرحباً'],
    [/\bتست\b/gi, 'اختبار تجريبي'],

    // Ownership & possessives
    [/\bالكلام بتاعي\b|\bكلامي بتاعي\b/gi, 'كلامي'],
    [/\bالترجمه بتاعتك\b|\bالترجمة بتاعتك\b/gi, 'ترجمتك'],
    [/\bبتاعي\b/gi, 'الخاص بي'],
    [/\bبتاعتي\b/gi, 'الخاصة بي'],
    [/\bبتاعنا\b/gi, 'الخاص بنا'],
    [/\bبتاعهم\b/gi, 'الخاص بهم'],

    // Cutting off / interrupting speech & outputting
    [/\bبتقطع كلامي\b|\bتقطع كلامي\b/gi, 'تقاطع حديثي'],
    [/\bبيقطع كلامي\b/gi, 'يقاطع حديثي'],
    [/\bبتطلع الكلام\b|\bبتطلع كلامي\b/gi, 'تُظهر الكلام'],
    [/\bبيطلع الكلام\b/gi, 'يُظهر الكلام'],

    // Binary choices: شغال ولا مش شغال
    [/\bشغال ولا مش شغال\b/gi, 'هل يعمل أم لا يعمل'],
    [/\bولا مش\b/gi, 'أم لست'],

    // Negative questions & assertions
    [/\bمش المفروض\b/gi, 'أليس من المفترض أن'],
    [/\bمش ليه\b/gi, 'وليس لماذا'],
    [/\bمش كده\b|\bمش كدا\b/gi, 'أليس كذلك'],
    [/\bمش عايز\b|\bمش عاوز\b/gi, 'لا أريد'],
    [/\bمش عارف\b/gi, 'لا أعلم'],
    [/\bمش فاهم\b/gi, 'لا أفهم'],

    // Activity state
    [/\bقاعد شغال\b|\bفاضل شغال\b|\bتفضل شغال\b|\bتبقى شغال\b/gi, 'تظل مستمراً في العمل'],
    [/\bما بتقفلش\b|\bمابتقفلش\b|\bمابيقفلش\b|\bما بيقفلش\b/gi, 'لا تتوقف عن العمل'],
    [/\bاوعى تكون\b/gi, 'إياك أن تكون'],
    [/\bاوعى\b/gi, 'إياك أن'],
    [/\bبتقفل\b/gi, 'تتوقف عن العمل'],
    [/\bبيقفل\b/gi, 'يتوقف عن العمل'],
    [/\bشغال\b/gi, 'يعمل'],

    // Question particles
    [/\bليه\b/gi, 'لماذا'],
    [/\bإيه\b|\bايه\b/gi, 'ماذا'],
    [/\bازاي\b|\bإزاي\b/gi, 'كيف'],
    [/\bفين\b/gi, 'أين'],
    [/\bامتى\b/gi, 'متى'],
    [/\bمين\b/gi, 'من'],

    // Connectors
    [/\bعشان\b|\bعلشان\b/gi, 'لكي'],
    [/\bدلوقتي\b/gi, 'الآن'],
    [/\bكده\b|\bكدا\b/gi, 'هكذا'],
    [/\bعايز\b|\bعاوز\b/gi, 'أريد'],
    [/\bشوية\b|\bشويه\b/gi, 'قليلاً'],
    [/\bكويس\b/gi, 'جيد'],
    [/\bخلاص\b/gi, 'انتهى الأمر'],
    [/\bيلا\b|\bيلّا\b/gi, 'هيا بنا'],
    [/\bمفيش\b|\bمافيش\b/gi, 'لا يوجد']
  ];

  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }

  return s;
}

export function normalizeNigerianPidgin(text) {
  if (!text) return '';
  let s = text.trim();
  const replacements = [
    [/\bhow you dey\b/gi, 'how are you'],
    [/\bhow body\b/gi, 'how are you feeling'],
    [/\bwetin dey happen\b|\bwetin dey sup\b/gi, 'what is happening'],
    [/\bwetin you dey do\b/gi, 'what are you doing'],
    [/\bwetin be dat\b|\bwetin be that\b/gi, 'what is that'],
    [/\bwetin\b/gi, 'what'],
    [/\bno wahala\b/gi, 'no problem'],
    [/\bwahala\b/gi, 'trouble'],
    [/\babeg\b/gi, 'please'],
    [/\bna so\b/gi, 'that is true'],
    [/\bna lie\b/gi, 'that is a lie'],
    [/\bmake we\b/gi, 'let us'],
    [/\bi dey go\b/gi, 'I am going'],
    [/\bwe dey go\b/gi, 'we are going'],
    [/\bdey go\b/gi, 'going'],
    [/\bdey come\b/gi, 'coming'],
    [/\bi fit\b/gi, 'I can'],
    [/\byou fit\b/gi, 'you can'],
    [/\bcomot\b/gi, 'leave'],
    [/\boya\b/gi, 'come on'],
    [/\babi\b/gi, 'right?'],
    [/\bwell well\b/gi, 'very well'],
    [/\bsmall small\b/gi, 'gradually']
  ];
  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

export class TranslationEngine {
  constructor() {
    this.activeBackend = 'online-fast';
    this.lastModelUsed = 'groq:llama-3.1-8b-instant';
    this.onModeFallback = null;
    this.onFallbackNotice = null;
    this.aiFailStreak = 0;
  }

  // A single slow/failed AI call only drops THAT line to Basic. The user is notified
  // after 3 consecutive failures (and every 10 after), the selected mode is never changed.
  reportAIFailure(mode, reason) {
    this.aiFailStreak += 1;
    const n = this.aiFailStreak;
    if (this.onModeFallback && (n === 3 || (n > 3 && (n - 3) % 10 === 0))) {
      this.onModeFallback({
        fromMode: mode,
        toMode: 'basic',
        temporary: true,
        reason: `${reason} Recent lines used Basic translation; ${mode === 'smart' ? 'Smart AI' : 'Unlimited AI'} retries automatically on every new line.`
      });
    }
  }

  getAIConfig() {
    try {
      const stored = localStorage.getItem('linguaflow_ai_config');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  async fetchSingleWebTranslation(queryText, src, tgt, externalSignal = null) {
    if (!queryText || src === tgt) return queryText;
    if (externalSignal && externalSignal.aborted) return '';

    // 1. Google Translate Multi-Endpoint Rotation (~40-90ms response, immune to 429)
    const googleEndpoints = [
      `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${src}&tl=${tgt}&q=${encodeURIComponent(queryText)}`,
      `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=${src}&tl=${tgt}&dt=t&q=${encodeURIComponent(queryText)}`,
      `https://translate.google.com/translate_a/single?client=at&sl=${src}&tl=${tgt}&dt=t&q=${encodeURIComponent(queryText)}`,
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${src}&tl=${tgt}&dt=t&q=${encodeURIComponent(queryText)}`
    ];

    for (const url of googleEndpoints) {
      if (externalSignal && externalSignal.aborted) return '';
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1600);
        const onAbort = () => controller.abort();
        if (externalSignal) {
          externalSignal.addEventListener('abort', onAbort, { once: true });
        }

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (externalSignal) externalSignal.removeEventListener('abort', onAbort);

        if (res.ok) {
          const json = await res.json();
          let translated = '';
          if (Array.isArray(json)) {
            if (typeof json[0] === 'string') {
              translated = json[0];
            } else if (Array.isArray(json[0])) {
              translated = json[0]
                .map((item) => (Array.isArray(item) ? item[0] : (typeof item === 'string' ? item : '')))
                .filter(Boolean)
                .join('');
            }
          }
          if (translated && translated.trim() && translated.trim().toLowerCase() !== queryText.trim().toLowerCase()) {
            return translated.trim();
          }
        }
      } catch {
        // Continue immediately to next endpoint
      }
    }

    if (externalSignal && externalSignal.aborted) return '';

    // 2. MyMemory Neural Web API (Secondary backup)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const onAbort = () => controller.abort();
      if (externalSignal) {
        externalSignal.addEventListener('abort', onAbort, { once: true });
      }

      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(queryText)}&langpair=${src}|${tgt}`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (externalSignal) externalSignal.removeEventListener('abort', onAbort);

      if (response.ok) {
        const data = await response.json();
        if (data && data.responseData && data.responseData.translatedText) {
          const result = decodeHtmlEntities(data.responseData.translatedText);
          if (
            result &&
            result.toLowerCase() !== queryText.toLowerCase() &&
            !result.includes('MYMEMORY WARNING') &&
            !result.includes('NO QUERY SPECIFIED')
          ) {
            return result.trim();
          }
        }
      }
    } catch (err) {
      console.warn(`MyMemory backup failed for ${src} -> ${tgt}:`, err.message);
    }

    return '';
  }

  async translate(text, sourceLang, targetLang, mode = 'basic', externalSignal = null) {
    if (!text || !text.trim()) return '';
    if (sourceLang === targetLang) return text;
    if (externalSignal && externalSignal.aborted) return '';

    const cleanText = text.trim();
    let cacheKey = `${mode}|${sourceLang}|${targetLang}|${cleanText.toLowerCase()}`;

    // 1. Check in-memory cache
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    // 2. Unlimited Mode: User-Configured AI API Key (Gemini or Groq)
    // AI receives the RAW dialect text: LLMs understand colloquial speech natively, and
    // rewriting it to MSA first loses person/gender/nuance.
    if (mode === 'unlimited') {
      const aiConfig = this.getAIConfig();
      if (aiConfig && aiConfig.apiKey && aiConfig.apiKey.trim()) {
        try {
          const aiResult = await this.translateWithAI(cleanText, sourceLang, targetLang, aiConfig);
          if (aiResult && aiResult.trim()) {
            this.aiFailStreak = 0;
            cache.set(cacheKey, aiResult.trim());
            return aiResult.trim();
          }
          this.reportAIFailure('unlimited', 'Personal AI key returned no result.');
        } catch (err) {
          console.warn('Unlimited AI translation error, this line uses Basic:', err);
          this.reportAIFailure('unlimited', 'Personal AI key error.');
        }
      }
    }

    // 3. Smart Mode: Render Backend (Groq 8B instant LPU -> Gemini Flash-Lite)
    if (mode === 'smart') {
      const smartRes = await apiService.translateSmart(cleanText, sourceLang, targetLang);
      if (smartRes && !smartRes.fallback && smartRes.translatedText) {
        this.aiFailStreak = 0;
        if (smartRes.modelUsed) {
          this.lastModelUsed = smartRes.modelUsed;
        }
        cache.set(cacheKey, smartRes.translatedText);
        return smartRes.translatedText;
      }
      this.reportAIFailure('smart', smartRes?.message || 'Smart AI busy.');
    }

    // 4. Basic path (also the per-line fallback for AI modes; the mode itself is NOT changed).
    // Results are cached under the BASIC key so a fallback never masks a future AI retry.
    const basicKey = `basic|${sourceLang}|${targetLang}|${cleanText.toLowerCase()}`;
    if (mode !== 'basic' && cache.has(basicKey)) {
      return cache.get(basicKey);
    }
    cacheKey = basicKey;
    const normalizedText = normalizeSpeech(cleanText, sourceLang) || cleanText;
    let queryText = normalizedText;
    let actualSource = sourceLang;
    if (sourceLang === 'pcm') {
      if (targetLang === 'en') {
        // Pidgin normalized into clear standard English
        cache.set(cacheKey, queryText);
        return queryText;
      }
      actualSource = 'en';
    }

    // 5. Free In-Browser Multi-Language Neural Translation (All languages with English Pivot)
    const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
    if (isOnline) {
      // Direct attempt
      let webResult = await this.fetchSingleWebTranslation(queryText, actualSource, targetLang, externalSignal);

      // Smart English Pivot: For non-English pairs (e.g. Urdu -> Ukrainian, Turkish -> Hindi)
      // If direct translation produced nothing or returned unchanged text, pivot through English
      if (!webResult && actualSource !== 'en' && targetLang !== 'en' && (!externalSignal || !externalSignal.aborted)) {
        try {
          const pivotToEn = await this.fetchSingleWebTranslation(queryText, actualSource, 'en', externalSignal);
          if (pivotToEn && pivotToEn.toLowerCase() !== queryText.toLowerCase() && (!externalSignal || !externalSignal.aborted)) {
            const finalFromEn = await this.fetchSingleWebTranslation(pivotToEn, 'en', targetLang, externalSignal);
            if (finalFromEn) {
              webResult = finalFromEn;
            }
          }
        } catch (pivotErr) {
          console.warn('English pivot translation failed:', pivotErr);
        }
      }

      if (webResult) {
        cache.set(cacheKey, webResult);
        return webResult;
      }
    }

    // 5. Chrome Built-in AI Translation (if supported natively)
    try {
      if (typeof window !== 'undefined' && window.translation?.canTranslate) {
        const canTranslate = await window.translation.canTranslate({
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        });
        if (canTranslate === 'readily' || canTranslate === 'after-download') {
          const translator = await window.translation.createTranslator({
            sourceLanguage: sourceLang,
            targetLanguage: targetLang
          });
          const result = await translator.translate(queryText);
          if (result) {
            cache.set(cacheKey, result);
            return result;
          }
        }
      }
    } catch {
      // ignore
    }

    return cleanText;
  }

  async translateWithAI(text, sourceLang, targetLang, { provider, apiKey, model }) {
    let dialectNote = '';
    if (sourceLang === 'ar') {
      dialectNote = ' Accurately translate spoken Arabic dialects (especially Egyptian slang like "في النص" = "in the middle").';
    } else if (sourceLang === 'pcm') {
      dialectNote = ' Accurately translate spoken Nigerian Pidgin English idioms (e.g. "wetin dey happen", "how you dey", "no wahala", "abeg") into standard natural speech.';
    } else if (sourceLang === 'yo') {
      dialectNote = ' Accurately translate conversational Yoruba idioms into standard natural speech.';
    }

    if (provider === 'gemini') {
      const selectedModel = model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
      const prompt = `You are a live simultaneous meeting interpreter. Translate the following speech from ${sourceLang} to ${targetLang}.${dialectNote} Output ONLY the translated text without quotes or explanations.\n\nSpeech:\n${text}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Gemini API error (HTTP ${res.status})`);
      }

      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } else if (provider === 'groq') {
      const selectedModel = model || 'llama-3.3-70b-versatile';
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'system',
              content: `You are a professional simultaneous interpreter. Translate conversational speech from ${sourceLang} to ${targetLang}.${dialectNote} Output ONLY the translated sentence.`
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: 0.2
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Groq API error (HTTP ${res.status})`);
      }

      const data = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() || '';
    }
    return '';
  }

  // Quick live test for user verification in Settings / Guide
  async testAIConnection({ provider, apiKey, model }) {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, error: 'Please enter an API key first.' };
    }

    try {
      const sampleText = 'Hello, this is a test.';
      const result = await this.translateWithAI(sampleText, 'en', 'ar', {
        provider,
        apiKey: apiKey.trim(),
        model
      });

      if (result && result.trim()) {
        return {
          success: true,
          message: `Connected successfully! Test translation: "${result.trim()}"`
        };
      } else {
        return {
          success: false,
          error: 'Connected, but the model returned an empty test response.'
        };
      }
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Connection failed. Please check the key and network connection.'
      };
    }
  }
}

export const translationEngine = new TranslationEngine();
