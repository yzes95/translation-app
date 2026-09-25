// Translation Engine with Advanced Dialect Normalizer, Free In-Browser Online Engine,
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

    return cleanText;
  }

  async translateWithAI(text, sourceLang, targetLang, { provider, apiKey, model }) {
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
      const prompt = `You are a live simultaneous meeting interpreter. Translate the following speech from ${sourceLang} to ${targetLang}. Preserve natural conversational tone and accurately translate colloquial dialect idioms (such as Egyptian Arabic slang). Output ONLY the translated text without quotes or explanations.\n\nSpeech:\n${text}`;
      
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
              content: `You are a professional simultaneous interpreter. Translate conversational speech from ${sourceLang} to ${targetLang}. Accurately understand colloquial dialect idioms (like Egyptian slang). Output ONLY the translated sentence.`
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
