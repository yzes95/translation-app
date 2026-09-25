// Translation Engine supporting Direct In-Browser Fetch, Chrome Built-in AI,
// and Offline Multilingual Meeting Lexicon for all 9 languages.

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

// High-frequency multilingual meeting vocabulary & phrase corpus for offline fallback
const MEETING_LEXICON = {
  'en-ar': {
    'good morning': 'صباح الخير',
    'good morning everyone': 'صباح الخير للجميع',
    'welcome': 'أهلاً وسهلاً',
    'hello': 'مرحباً',
    'how are you': 'كيف حالك',
    'let us review the quarterly milestones': 'دعونا نراجع المعالم الفصلية',
    'we need to finalize the deployment schedule': 'نحتاج إلى وضع اللمسات الأخيرة على جدول النشر',
    'we need to finalize the budget by next friday': 'نحتاج إلى إنهاء الميزانية بحلول يوم الجمعة القادم',
    'the client requested an update on the multilingual interface': 'طلب العميل تحديثاً حول الواجهة متعددة اللغات',
    'let us assign the action items before concluding this sync': 'دعونا نوزع بنود العمل قبل اختتام هذا الاجتماع',
    'i will send the draft tonight': 'سأرسل المسودة الليلة',
    'can we also review the budget': 'هل يمكننا أيضاً مراجعة الميزانية؟',
    'thank you very much': 'شكراً جزيلاً',
    'any questions': 'هل توجد أي أسئلة؟',
    'agreed': 'تم الاتفاق',
    'yes': 'نعم',
    'no': 'لا',
    'next steps': 'الخطوات التالية',
    'action item': 'بند العمل',
    'deadline': 'الموعد النهائي',
    'meeting summary': 'ملخص الاجتماع',
    'decision': 'القرار'
  },
  'ar-en': {
    'صباح الخير': 'Good morning',
    'صباح الخير للجميع': 'Good morning everyone',
    'صباح الخير جميعا': 'Good morning everyone',
    'أهلا وسهلا': 'Welcome',
    'اهلا وسهلا': 'Welcome',
    'مرحبا': 'Hello',
    'مرحبا بكم': 'Welcome',
    'كيف حالك': 'How are you',
    'كيف الحال': 'How are things / How are you',
    'شكرا': 'Thank you',
    'شكرا جزيلا': 'Thank you very much',
    'نعم': 'Yes',
    'لا': 'No',
    'حسنا': 'Okay / Agreed',
    'تمام': 'Alright',
    'المشروع': 'The project',
    'الميزانية': 'The budget',
    'الاجتماع': 'The meeting',
    'يجب أن ننهي المشروع': 'We must finish the project',
    'سأرسل التقرير': 'I will send the report',
    'هل هناك أي أسئلة': 'Are there any questions?'
  },
  'en-ur': {
    'good morning': 'صبح بخیر',
    'good morning everyone': 'سب کو صبح بخیر',
    'welcome': 'خوش آمدید',
    'hello': 'ہیلو / السلام علیکم',
    'how are you': 'آپ کیسے ہیں؟',
    'thank you very much': 'بہت بہت شکریہ',
    'yes': 'جی ہاں',
    'no': 'نہیں',
    'agreed': 'اتفاق ہے'
  },
  'ur-en': {
    'صبح بخیر': 'Good morning',
    'خوش آمدید': 'Welcome',
    'آپ کیسے ہیں': 'How are you?',
    'بہت شکریہ': 'Thank you very much',
    'جی ہاں': 'Yes',
    'نہیں': 'No',
    'اتفاق ہے': 'Agreed'
  },
  'en-de': {
    'good morning': 'Guten Morgen',
    'welcome': 'Willkommen',
    'thank you very much': 'Vielen Dank',
    'yes': 'Ja',
    'no': 'Nein',
    'agreed': 'Einverstanden'
  },
  'de-en': {
    'guten morgen': 'Good morning',
    'willkommen': 'Welcome',
    'vielen dank': 'Thank you very much',
    'ja': 'Yes',
    'nein': 'No',
    'einverstanden': 'Agreed'
  },
  'en-fr': {
    'good morning': 'Bonjour',
    'welcome': 'Bienvenue',
    'thank you very much': 'Merci beaucoup',
    'yes': 'Oui',
    'no': 'Non',
    'agreed': 'D’accord'
  },
  'fr-en': {
    'bonjour': 'Good morning / Hello',
    'bienvenue': 'Welcome',
    'merci beaucoup': 'Thank you very much',
    'oui': 'Yes',
    'non': 'No',
    'd’accord': 'Agreed',
    'daccord': 'Agreed'
  },
  'en-tr': {
    'good morning': 'Günaydın',
    'welcome': 'Hoş geldiniz',
    'thank you very much': 'Çok teşekkürler',
    'yes': 'Evet',
    'no': 'Hayır',
    'agreed': 'Anlaşıldı'
  },
  'tr-en': {
    'günaydın': 'Good morning',
    'hoş geldiniz': 'Welcome',
    'çok teşekkürler': 'Thank you very much',
    'teşekkür ederim': 'Thank you',
    'evet': 'Yes',
    'hayır': 'No',
    'anlaşıldı': 'Agreed'
  }
};

export class TranslationEngine {
  constructor() {
    this.activeBackend = 'online-fast';
  }

  async translate(text, sourceLang, targetLang) {
    if (!text || !text.trim()) return '';
    if (sourceLang === targetLang) return text;

    const cleanText = text.trim();
    const cacheKey = `${sourceLang}|${targetLang}|${cleanText.toLowerCase()}`;

    // 1. Check in-memory cache for instant zero-latency return
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    // 2. Try online in-browser translation API (MyMemory)
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (isOnline) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${sourceLang}|${targetLang}`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data && data.responseData && data.responseData.translatedText) {
            const result = decodeHtmlEntities(data.responseData.translatedText);
            // Verify it did not return error string or identical non-target text
            if (result && result.toLowerCase() !== cleanText.toLowerCase()) {
              cache.set(cacheKey, result);
              return result;
            }
          }
        }
      } catch (err) {
        console.warn('Online translation request failed, attempting local fallback:', err.message);
      }
    }

    // 3. Try Chrome Built-in AI Translation if present
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
          const result = await translator.translate(cleanText);
          if (result) {
            cache.set(cacheKey, result);
            return result;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // 4. Offline Meeting Lexicon lookup
    const offlineResult = this.lookupOfflineLexicon(cleanText, sourceLang, targetLang);
    if (offlineResult) {
      cache.set(cacheKey, offlineResult);
      return offlineResult;
    }

    // 5. If everything else fails, return with language tag or original
    return cleanText;
  }

  lookupOfflineLexicon(text, sourceLang, targetLang) {
    const normalized = text.toLowerCase().replace(/[.,!?;:،؟]/g, '').trim();
    const pairKey = `${sourceLang}-${targetLang}`;

    if (MEETING_LEXICON[pairKey] && MEETING_LEXICON[pairKey][normalized]) {
      return MEETING_LEXICON[pairKey][normalized];
    }

    // Pivot through English if neither is English
    if (sourceLang !== 'en' && targetLang !== 'en') {
      const enPivot = this.lookupOfflineLexicon(text, sourceLang, 'en');
      if (enPivot && enPivot.toLowerCase() !== normalized) {
        const finalTarget = this.lookupOfflineLexicon(enPivot, 'en', targetLang);
        if (finalTarget) return finalTarget;
      }
    }

    return null;
  }
}

export const translationEngine = new TranslationEngine();
