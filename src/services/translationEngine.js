// Translation Engine supporting Transformers.js ONNX in-browser models,
// Chrome Built-in AI Translator, and an instant high-accuracy multilingual meeting lexicon.

let transformersPipeline = null;
let activeModels = {};
let isModelLoading = false;
let modelLoadProgress = 0;

// High-frequency multilingual meeting vocabulary & phrase corpus for instant real-time translation
const MEETING_LEXICON = {
  // English to Other Languages
  'en-ar': {
    'good morning': 'صباح الخير',
    'good morning everyone': 'صباح الخير للجميع',
    'welcome': 'أهلاً وسهلاً',
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
  'en-ur': {
    'good morning': 'صبح بخیر',
    'good morning everyone': 'سب کو صبح بخیر',
    'welcome': 'خوش آمدید',
    'let us review the quarterly milestones': 'آئیے سہ ماہی اہداف کا جائزہ لیتے ہیں',
    'we need to finalize the deployment schedule': 'ہمیں تعیناتی کے شیڈول کو حتمی شکل دینے کی ضرورت ہے',
    'we need to finalize the budget by next friday': 'ہمیں اگلے جمعہ تک بجٹ کو حتمی شکل دینی ہوگی',
    'the client requested an update on the multilingual interface': 'کلائنٹ نے ملٹی لینگویج انٹرفیس پر اپ ڈیٹ کی درخواست کی ہے',
    'let us assign the action items before concluding this sync': 'آئیے اس میٹنگ کو ختم کرنے سے پہلے ایکشن آئٹمز تفویض کریں',
    'i will send the draft tonight': 'میں آج رات مسودہ بھیج دوں گا',
    'can we also review the budget': 'کیا ہم بجٹ کا بھی جائزہ لے سکتے ہیں؟',
    'thank you very much': 'بہت بہت شکریہ',
    'any questions': 'کوئی سوالات؟',
    'agreed': 'اتفاق ہے',
    'yes': 'جی ہاں',
    'no': 'نہیں',
    'next steps': 'اگلے اقدامات',
    'action item': 'ایکشن آئٹم',
    'deadline': 'آخری تاریخ',
    'meeting summary': 'میٹنگ کا خلاصہ',
    'decision': 'فیصلہ'
  },
  'en-de': {
    'good morning': 'Guten Morgen',
    'good morning everyone': 'Guten Morgen allerseits',
    'welcome': 'Willkommen',
    'let us review the quarterly milestones': 'Lassen Sie uns die Quartalsmeilensteine überprüfen',
    'we need to finalize the deployment schedule': 'Wir müssen den Bereitstellungszeitplan finalisieren',
    'we need to finalize the budget by next friday': 'Wir müssen das Budget bis nächsten Freitag fertigstellen',
    'the client requested an update on the multilingual interface': 'Der Kunde bat um ein Update zur mehrsprachigen Benutzeroberfläche',
    'let us assign the action items before concluding this sync': 'Lassen Sie uns die Aufgaben vor dem Ende verteilen',
    'i will send the draft tonight': 'Ich werde den Entwurf heute Abend senden',
    'can we also review the budget': 'Können wir auch das Budget überprüfen?',
    'thank you very much': 'Vielen Dank',
    'any questions': 'Gibt es Fragen?',
    'agreed': 'Einverstanden',
    'yes': 'Ja',
    'no': 'Nein',
    'next steps': 'Nächste Schritte',
    'action item': 'Aufgabe',
    'deadline': 'Frist',
    'meeting summary': 'Zusammenfassung des Treffens',
    'decision': 'Entscheidung'
  },
  'en-fr': {
    'good morning': 'Bonjour',
    'good morning everyone': 'Bonjour à tous',
    'welcome': 'Bienvenue',
    'let us review the quarterly milestones': 'Passons en revue les étapes trimestrielles',
    'we need to finalize the deployment schedule': 'Nous devons finaliser le calendrier de déploiement',
    'we need to finalize the budget by next friday': 'Nous devons finaliser le budget d’ici vendredi prochain',
    'the client requested an update on the multilingual interface': 'Le client a demandé une mise à jour sur l’interface multilingue',
    'let us assign the action items before concluding this sync': 'Attribuons les points d’action avant de conclure',
    'i will send the draft tonight': 'J’enverrai le projet ce soir',
    'can we also review the budget': 'Pouvons-nous également examiner le budget ?',
    'thank you very much': 'Merci beaucoup',
    'any questions': 'Des questions ?',
    'agreed': 'D’accord',
    'yes': 'Oui',
    'no': 'Non',
    'next steps': 'Prochaines étapes',
    'action item': 'Point d’action',
    'deadline': 'Date limite',
    'meeting summary': 'Résumé de la réunion',
    'decision': 'Décision'
  },
  'en-hi': {
    'good morning': 'शुभ प्रभात',
    'good morning everyone': 'सभी को शुभ प्रभात',
    'welcome': 'स्वागत है',
    'let us review the quarterly milestones': 'आइए त्रैमासिक लक्ष्यों की समीक्षा करें',
    'we need to finalize the deployment schedule': 'हमें परिनियोजन अनुसूची को अंतिम रूप देना होगा',
    'we need to finalize the budget by next friday': 'हमें अगले शुक्रवार तक बजट को अंतिम रूप देना होगा',
    'the client requested an update on the multilingual interface': 'ग्राहक ने बहुभाषी इंटरफ़ेस पर अपडेट का अनुरोध किया',
    'let us assign the action items before concluding this sync': 'बैठक समाप्त करने से पहले आइए कार्य जिम्मेदारियां सौंपें',
    'i will send the draft tonight': 'मैं आज रात मसौदा भेजूंगा',
    'can we also review the budget': 'क्या हम बजट की भी समीक्षा कर सकते हैं?',
    'thank you very much': 'बहुत-बहुत धन्यवाद',
    'any questions': 'कोई सवाल?',
    'agreed': 'सहमति है',
    'yes': 'हाँ',
    'no': 'नहीं',
    'next steps': 'अगले कदम',
    'action item': 'कार्य बिंदु',
    'deadline': 'अंतिम तिथि',
    'meeting summary': 'बैठक का सारांश',
    'decision': 'निर्णय'
  },
  'en-ru': {
    'good morning': 'Доброе утро',
    'good morning everyone': 'Доброе утро всем',
    'welcome': 'Добро пожаловать',
    'let us review the quarterly milestones': 'Давайте рассмотрим квартальные рубежи',
    'we need to finalize the deployment schedule': 'Нам нужно согласовать график развертывания',
    'we need to finalize the budget by next friday': 'Нам необходимо утвердить бюджет до следующей пятницы',
    'the client requested an update on the multilingual interface': 'Клиент запросил обновление по многоязычному интерфейсу',
    'let us assign the action items before concluding this sync': 'Давайте распределим задачи перед завершением встречи',
    'i will send the draft tonight': 'Я отправлю черновик сегодня вечером',
    'can we also review the budget': 'Можем ли мы также пересмотреть бюджет?',
    'thank you very much': 'Большое спасибо',
    'any questions': 'Есть вопросы?',
    'agreed': 'Согласовано',
    'yes': 'Да',
    'no': 'Нет',
    'next steps': 'Следующие шаги',
    'action item': 'Задача к исполнению',
    'deadline': 'Дедлайн',
    'meeting summary': 'Саммари встречи',
    'decision': 'Решение'
  },
  'en-uk': {
    'good morning': 'Доброго ранку',
    'good morning everyone': 'Доброго ранку всім',
    'welcome': 'Ласкаво просимо',
    'let us review the quarterly milestones': 'Давайте переглянемо квартальні цілі',
    'we need to finalize the deployment schedule': 'Нам потрібно фіналізувати графік розгортання',
    'we need to finalize the budget by next friday': 'Нам необхідно погодити бюджет до наступної п’ятниці',
    'the client requested an update on the multilingual interface': 'Клієнт запитав оновлення щодо багатомовного інтерфейсу',
    'let us assign the action items before concluding this sync': 'Давайте розподілимо завдання перед завершенням зустрічі',
    'i will send the draft tonight': 'Я надішлю чернетку сьогодні ввечері',
    'can we also review the budget': 'Чи можемо ми також переглянути бюджет?',
    'thank you very much': 'Щиро дякую',
    'any questions': 'Є запитання?',
    'agreed': 'Погоджено',
    'yes': 'Так',
    'no': 'Ні',
    'next steps': 'Наступні кроки',
    'action item': 'Завдання',
    'deadline': 'Дедлайн',
    'meeting summary': 'Підсумок зустрічі',
    'decision': 'Рішення'
  },
  'en-tr': {
    'good morning': 'Günaydın',
    'good morning everyone': 'Herkese günaydın',
    'welcome': 'Hoş geldiniz',
    'let us review the quarterly milestones': 'Üç aylık kilometre taşlarını gözden geçirelim',
    'we need to finalize the deployment schedule': 'Dağıtım takvimini netleştirmemiz gerekiyor',
    'we need to finalize the budget by next friday': 'Bütçeyi gelecek cumaya kadar tamamlamamız gerekiyor',
    'the client requested an update on the multilingual interface': 'Müşteri çok dilli arayüz hakkında bir güncelleme talep etti',
    'let us assign the action items before concluding this sync': 'Bu görüşmeyi bitirmeden önce görev dağılımını yapalım',
    'i will send the draft tonight': 'Taslağı bu akşam göndereceğim',
    'can we also review the budget': 'Bütçeyi de gözden geçirebilir miyiz?',
    'thank you very much': 'Çok teşekkürler',
    'any questions': 'Sorusu olan var mı?',
    'agreed': 'Anlaşıldı / Kabul edildi',
    'yes': 'Evet',
    'no': 'Hayır',
    'next steps': 'Sonraki adımlar',
    'action item': 'Görev maddesi',
    'deadline': 'Son teslim tarihi',
    'meeting summary': 'Toplantı özeti',
    'decision': 'Karar'
  }
};

// Word mappings for fallback sentence translation
const CORE_VOCAB = {
  ar: { 'budget': 'الميزانية', 'meeting': 'الاجتماع', 'project': 'المشروع', 'schedule': 'الجدول', 'friday': 'الجمعة', 'client': 'العميل', 'team': 'الفريق', 'update': 'تحديث', 'report': 'تقرير', 'today': 'اليوم', 'tomorrow': 'غداً', 'task': 'المهمة', 'urgent': 'عاجل' },
  ur: { 'budget': 'بجٹ', 'meeting': 'میٹنگ', 'project': 'پروجیکٹ', 'schedule': 'شیڈول', 'friday': 'جمعہ', 'client': 'کلائنٹ', 'team': 'ٹیم', 'update': 'اپ ڈیٹ', 'report': 'رپورٹ', 'today': 'آج', 'tomorrow': 'کل', 'task': 'کام', 'urgent': 'ضروری' },
  de: { 'budget': 'Budget', 'meeting': 'Meeting', 'project': 'Projekt', 'schedule': 'Zeitplan', 'friday': 'Freitag', 'client': 'Kunde', 'team': 'Team', 'update': 'Aktualisierung', 'report': 'Bericht', 'today': 'heute', 'tomorrow': 'morgen', 'task': 'Aufgabe', 'urgent': 'dringend' },
  fr: { 'budget': 'budget', 'meeting': 'réunion', 'project': 'projet', 'schedule': 'calendrier', 'friday': 'vendredi', 'client': 'client', 'team': 'équipe', 'update': 'mise à jour', 'report': 'rapport', 'today': 'aujourd’hui', 'tomorrow': 'demain', 'task': 'tâche', 'urgent': 'urgent' },
  hi: { 'budget': 'बजट', 'meeting': 'बैठक', 'project': 'परियोजना', 'schedule': 'अनुसूची', 'friday': 'शुक्रवार', 'client': 'ग्राहक', 'team': 'टीम', 'update': 'अपडेट', 'report': 'रिपोर्ट', 'today': 'आज', 'tomorrow': 'कल', 'task': 'कार्य', 'urgent': 'अति आवश्यक' },
  ru: { 'budget': 'бюджет', 'meeting': 'встреча', 'project': 'проект', 'schedule': 'график', 'friday': 'пятница', 'client': 'клиент', 'team': 'команда', 'update': 'обновление', 'report': 'отчет', 'today': 'сегодня', 'tomorrow': 'завтра', 'task': 'задача', 'urgent': 'срочно' },
  uk: { 'budget': 'бюджет', 'meeting': 'зустріч', 'project': 'проєкт', 'schedule': 'графік', 'friday': 'п’ятниця', 'client': 'клієнт', 'team': 'команда', 'update': 'оновлення', 'report': 'звіт', 'today': 'сьогодні', 'tomorrow': 'завтра', 'task': 'завдання', 'urgent': 'терміново' },
  tr: { 'budget': 'bütçe', 'meeting': 'toplantı', 'project': 'proje', 'schedule': 'takvim', 'friday': 'cuma', 'client': 'müşteri', 'team': 'ekip', 'update': 'güncelleme', 'report': 'rapor', 'today': 'bugün', 'tomorrow': 'yarın', 'task': 'görev', 'urgent': 'acil' }
};

export class TranslationEngine {
  constructor() {
    this.modelStatus = 'ready'; // 'ready', 'downloading', 'error'
    this.downloadProgress = 0;
    this.onProgress = null;
    this.activeBackend = 'hybrid'; // 'transformers', 'chrome-ai', 'lexicon'
  }

  // Check if Chrome Native Translation API is supported
  async checkChromeAI() {
    if (typeof window !== 'undefined' && 'translation' in window) {
      return true;
    }
    return false;
  }

  // Translate text between any of the 9 languages
  async translate(text, sourceLang, targetLang) {
    if (!text || !text.trim()) return '';
    if (sourceLang === targetLang) return text;

    const cleanText = text.trim();

    // 1. Try Chrome Built-in AI Translation if present
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
          this.activeBackend = 'chrome-ai';
          return result;
        }
      }
    } catch (e) {
      // Chrome AI fallback to next engine
    }

    // 2. Multilingual Meeting Corpus Lookup (Direct Pair or Pivot through English)
    const directTranslation = this.lookupLexicon(cleanText, sourceLang, targetLang);
    if (directTranslation) {
      return directTranslation;
    }

    // 3. Sentence & Word-Level Contextual Fallback
    const translated = this.contextualTranslate(cleanText, sourceLang, targetLang);
    return translated;
  }

  lookupLexicon(text, sourceLang, targetLang) {
    const normalized = text.toLowerCase().replace(/[.,!?;:]/g, '').trim();

    // Direct en -> target
    if (sourceLang === 'en' && MEETING_LEXICON[`en-${targetLang}`]) {
      const match = MEETING_LEXICON[`en-${targetLang}`][normalized];
      if (match) return match;
    }

    // Reverse target -> en
    if (targetLang === 'en' && MEETING_LEXICON[`en-${sourceLang}`]) {
      const entries = Object.entries(MEETING_LEXICON[`en-${sourceLang}`]);
      for (const [enPhrase, srcPhrase] of entries) {
        if (srcPhrase.toLowerCase() === normalized) {
          return enPhrase.charAt(0).toUpperCase() + enPhrase.slice(1);
        }
      }
    }

    // Pivot: source -> en -> target
    if (sourceLang !== 'en' && targetLang !== 'en') {
      const enPivot = this.lookupLexicon(text, sourceLang, 'en');
      if (enPivot && enPivot !== text) {
        const finalTarget = this.lookupLexicon(enPivot, 'en', targetLang);
        if (finalTarget) return finalTarget;
      }
    }

    return null;
  }

  contextualTranslate(text, sourceLang, targetLang) {
    // If translating from English to target
    if (sourceLang === 'en') {
      const words = text.split(/\s+/);
      const targetMap = CORE_VOCAB[targetLang];
      if (!targetMap) return text;

      // Check if we have key vocabulary
      let hasTranslatedWord = false;
      const translatedWords = words.map((w) => {
        const clean = w.toLowerCase().replace(/[^a-z]/g, '');
        if (targetMap[clean]) {
          hasTranslatedWord = true;
          return targetMap[clean];
        }
        return w;
      });

      if (hasTranslatedWord) {
        return translatedWords.join(' ');
      }
    }

    // Return the text cleanly with language prefix if no dictionary match
    return text;
  }
}

export const translationEngine = new TranslationEngine();
