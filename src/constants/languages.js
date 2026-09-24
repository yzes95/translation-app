export const SUPPORTED_LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    speechCode: 'en-US',
    speechCodesFallback: ['en-US', 'en-GB'],
    rtl: false,
    samplePhrases: [
      'Good morning everyone, let us review the quarterly milestones.',
      'We need to finalize the deployment schedule by Friday afternoon.',
      'The client requested an update on the multilingual interface.',
      'Let us assign the action items before concluding this sync.'
    ]
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    speechCode: 'ar-SA',
    speechCodesFallback: ['ar-SA', 'ar-EG', 'ar-AE'],
    rtl: true,
    samplePhrases: [
      'صباح الخير جميعاً، دعونا نبدأ بمراجعة بنود جدول الأعمال.',
      'يجب أن نتفق على الميزانية المخصصة للمشروع قبل نهاية هذا الأسبوع.',
      'العميل طلب إضافة خاصية التلخيص التلقائي للمحادثات.',
      'سنقوم بتوزيع المهام ومتابعة التنفيذ في الاجتماع القادم.'
    ]
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    flag: '🇵🇰',
    speechCode: 'ur-PK',
    speechCodesFallback: ['ur-PK', 'ur-IN'],
    rtl: true,
    samplePhrases: [
      'سب کو صبح بخیر، آئیے میٹنگ کا ایجنڈا شروع کرتے ہیں۔',
      'ہمیں جمعہ تک پروجیکٹ کے تمام اہم کام مکمل کرنے کی ضرورت ہے۔',
      'صارف نے ملٹی لینگویج فیچر پر بہت مثبت فیڈ بیک دیا ہے۔',
      'آئیے اگلی میٹنگ سے پہلے ایکشن آئٹمز کو حتمی شکل دیں۔'
    ]
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    speechCode: 'de-DE',
    speechCodesFallback: ['de-DE', 'de-AT'],
    rtl: false,
    samplePhrases: [
      'Guten Morgen allerseits, lassen Sie uns mit der Tagesordnung beginnen.',
      'Wir müssen den Projektplan bis Freitag finalisieren.',
      'Der Kunde hat um eine Zusammenfassung des Meetings gebeten.',
      'Lassen Sie uns nun die nächsten Schritte und Aufgaben verteilen.'
    ]
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    speechCode: 'fr-FR',
    speechCodesFallback: ['fr-FR', 'fr-CA'],
    rtl: false,
    samplePhrases: [
      'Bonjour à tous, commençons par faire le point sur le projet.',
      'Nous devons valider le calendrier de livraison avant vendredi.',
      'Le client est très satisfait des fonctionnalités multilingues.',
      'Récapitulons les actions prioritaires avant de clôturer la réunion.'
    ]
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    speechCode: 'hi-IN',
    speechCodesFallback: ['hi-IN'],
    rtl: false,
    samplePhrases: [
      'शुभ प्रभात सभी को, आइए आज की बैठक की कार्यसूची शुरू करते हैं।',
      'हमें शुक्रवार तक बजट और समय सीमा को अंतिम रूप देना होगा।',
      'ग्राहक ने लाइव अनुवाद और सारांश सुविधा की सराहना की है।',
      'आइए बैठक समाप्त करने से पहले सभी कार्य जिम्मेदारियां तय करें।'
    ]
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    speechCode: 'ru-RU',
    speechCodesFallback: ['ru-RU'],
    rtl: false,
    samplePhrases: [
      'Доброе утро всем, давайте начнем с обзора ключевых задач.',
      'Нам необходимо утвердить план релизов до конца этой недели.',
      'Клиент запросил автоматическое создание саммари встречи.',
      'Давайте зафиксируем договоренности и назначим ответственных.'
    ]
  },
  {
    code: 'uk',
    name: 'Ukrainian',
    nativeName: 'Українська',
    flag: '🇺🇦',
    speechCode: 'uk-UA',
    speechCodesFallback: ['uk-UA'],
    rtl: false,
    samplePhrases: [
      'Доброго ранку всім, переходимо до обговорення порядку денного.',
      'Нам потрібно узгодити фінальний дедлайн до п’ятниці.',
      'Користувач позитивно оцінив роботу системи синхронного перекладу.',
      'Давайте підсумуємо домовленості та визначимо наступні кроки.'
    ]
  },
  {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    flag: '🇹🇷',
    speechCode: 'tr-TR',
    speechCodesFallback: ['tr-TR'],
    rtl: false,
    samplePhrases: [
      'Herkese günaydın, toplantı gündemimizi gözden geçirmeye başlayalım.',
      'Cuma gününe kadar teslimat takvimini kesinleştirmemiz gerekiyor.',
      'Müşteri canlı çeviri ve toplantı özeti özelliğinden çok memnun kaldı.',
      'Toplantıyı bitirmeden önce görev dağılımını netleştirelim.'
    ]
  }
];

export const getLanguageByCode = (code) => {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code) || SUPPORTED_LANGUAGES[0];
};

export const isRTL = (code) => {
  return code === 'ar' || code === 'ur';
};
