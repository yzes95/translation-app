// Translation Engine with Dialect Normalizer, Free In-Browser Online Engine,
// Optional AI (Gemini / Groq / OpenAI), and Offline Lexicon Fallback.

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

// Normalize colloquial spoken dialects (especially Egyptian, Levantine, Gulf)
// so that translation models understand conversational idioms instead of literal dictionary terms.
export function normalizeArabicDialect(text) {
  if (!text) return '';
  let s = text.trim();

  // Dialectal idioms & common phrases
  const replacements = [
    // Egyptian friendly addresses & slang
    [/\bيا عم الحج\b/gi, 'يا أخي'],
    [/\bيا حج\b/gi, 'يا أخي'],
    [/\bيا عمي\b/gi, 'يا صديقي'],
    [/\bيا راجل\b/gi, 'يا صديقي'],
    [/\bتست\b/gi, 'اختبار'],

    // Expressions of warning / caution
    [/\bاوعى تكون\b/gi, 'إياك أن تكون'],
    [/\bاوعى\b/gi, 'إياك أن'],

    // Verbs of state / staying active vs stopping
    [/\bما بتقفلش\b/gi, 'لا تتوقف عن العمل'],
    [/\bمابتقفلش\b/gi, 'لا تتوقف عن العمل'],
    [/\bمابيقفلش\b/gi, 'لا يتوقف عن العمل'],
    [/\bما بيقفلش\b/gi, 'لا يتوقف عن العمل'],
    [/\bمش المفروض\b/gi, 'أليس من المفترض أن'],
    [/\bقاعد شغال\b/gi, 'تظل مستمراً في العمل'],
    [/\bفاضل شغال\b/gi, 'تظل مستمراً في العمل'],
    [/\bتفضل شغال\b/gi, 'تظل مستمراً في العمل'],
    [/\bتبقى شغال\b/gi, 'تستمر في العمل'],
    [/\bبتقفل\b/gi, 'تتوقف عن العمل'],
    [/\bبيقفل\b/gi, 'يتوقف عن العمل'],
    [/\bشغال\b/gi, 'يعمل'],

    // Question words & particles
    [/\bليه\b/gi, 'لماذا'],
    [/\bإيه\b|\bايه\b/gi, 'ماذا'],
    [/\bازاي\b|\bإزاي\b/gi, 'كيف'],
    [/\bفين\b/gi, 'أين'],
    [/\bامتى\b/gi, 'متى'],
    [/\bمين\b/gi, 'من'],

    // Conjunctions & adverbs
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

export class TranslationEngine {
  constructor() {
    this.activeBackend = 'online-fast';
  }

  getAIConfig() {
    try {
      const stored = localStorage.getItem('linguaflow_ai_config');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  async translate(text, sourceLang, targetLang) {
    if (!text || !text.trim()) return '';
    if (sourceLang === targetLang) return text;

    const cleanText = text.trim();
    const cacheKey = `${sourceLang}|${targetLang}|${cleanText.toLowerCase()}`;

    // 1. Check in-memory cache
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    // 2. Check for User-Configured AI API Key (Gemini or Groq)
    const aiConfig = this.getAIConfig();
    if (aiConfig && aiConfig.apiKey && aiConfig.apiKey.trim()) {
      try {
        const aiResult = await this.translateWithAI(cleanText, sourceLang, targetLang, aiConfig);
        if (aiResult && aiResult.trim()) {
          cache.set(cacheKey, aiResult.trim());
          return aiResult.trim();
        }
      } catch (err) {
        console.warn('AI translation error, falling back to neural web engine:', err);
      }
    }

    // 3. Dialect Pre-Processing for Arabic
    let queryText = cleanText;
    if (sourceLang === 'ar') {
      queryText = normalizeArabicDialect(cleanText);
    }

    // 4. Free In-Browser Neural Translation API
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (isOnline) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(queryText)}&langpair=${sourceLang}|${targetLang}`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data && data.responseData && data.responseData.translatedText) {
            const result = decodeHtmlEntities(data.responseData.translatedText);
            if (result && result.toLowerCase() !== cleanText.toLowerCase()) {
              cache.set(cacheKey, result);
              return result;
            }
          }
        }
      } catch (err) {
        console.warn('Online translation failed:', err.message);
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

    // 6. Return normalized text or original
    return cleanText;
  }

  async translateWithAI(text, sourceLang, targetLang, { provider, apiKey, model }) {
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
      const prompt = `You are a live simultaneous meeting interpreter. Translate the following speech from ${sourceLang} to ${targetLang}. Preserve the natural conversational tone and translate colloquial dialect idioms accurately. Output ONLY the translated text, nothing else.\n\nSpeech:\n${text}`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } else if (provider === 'groq') {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are a professional simultaneous interpreter. Translate conversational speech from ${sourceLang} to ${targetLang}. Handle colloquial dialect idioms naturally. Output ONLY the translated sentence.`
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: 0.2
        })
      });
      const data = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() || '';
    }
    return '';
  }
}

export const translationEngine = new TranslationEngine();
