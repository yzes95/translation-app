// Speech & Dialect Normalizer Engine
// High-frequency spoken speech, oral contractions, and phonetic traps filter
// Normalizes oral dialect into standard semantic phrases in <0.2ms before translation.

export function normalizeArabic(text) {
  if (!text) return '';
  let s = text.trim();

  const replacements = [
    // Prepositional & locational idioms
    [/\bفي النص\b|\bفي النُص\b|\bفالنص\b/gi, 'في منتصف الجملة'],
    [/\bفي نص الكلام\b/gi, 'في منتصف الحديث'],
    [/\bعالهوا\b|\bع الهوا\b/gi, 'بشكل مباشر'],
    [/\bعلى طول\b|\bعطول\b/gi, 'مباشرة'],
    [/\bمن تحت لتحت\b/gi, 'سراً'],
    [/\bفي الأول\b|\bفالاول\b/gi, 'في البداية'],
    [/\bفي الآخر\b|\bفالاخر\b/gi, 'في النهاية'],

    // Verbs, continuous state & action
    [/\bشغال ولا مش شغال\b/gi, 'هل يعمل أم لا يعمل'],
    [/\bقاعد شغال\b|\bفاضل شغال\b|\bتفضل شغال\b|\bتبقى شغال\b/gi, 'تظل مستمراً في العمل'],
    [/\bشغال\b/gi, 'يعمل'],
    [/\bبيشتغل\b/gi, 'يعمل'],
    [/\bبتشتغل\b/gi, 'تعمل'],
    [/\bعمال يتكلم\b|\bعمال يتكلم\b/gi, 'يتحدث باستمرار'],
    [/\bبيقطع كلامي\b|\bبتقطع كلامي\b/gi, 'يقاطع حديثي'],
    [/\bبيقطع\b/gi, 'يتقطع'],
    [/\bبيلف ويدور\b/gi, 'يراوغ'],
    [/\bواخد باله\b/gi, 'منتبه'],
    [/\bمش واخد باله\b/gi, 'غير منتبه'],
    [/\bشايف\b/gi, 'يرى'],
    [/\bباصص\b/gi, 'ينظر'],

    // Negations & modals
    [/\bمش راضي\b/gi, 'يرفض'],
    [/\bمابيردش\b|\bما بيردش\b/gi, 'لا يجيب'],
    [/\bمابيقفلش\b|\bما بيقفلش\b/gi, 'لا يتوقف عن العمل'],
    [/\bمش فاهم\b/gi, 'لا أفهم'],
    [/\bمش عارف\b/gi, 'لا أعلم'],
    [/\bمش عايز\b|\bمش عاوز\b/gi, 'لا أريد'],
    [/\bمش كده\b|\bمش كدا\b/gi, 'أليس كذلك'],
    [/\bمش المفروض\b/gi, 'أليس من المفترض أن'],
    [/\bمفيش\b|\bمافيش\b/gi, 'لا يوجد'],
    [/\bعايز\b|\bعاوز\b/gi, 'أريد'],

    // Addresses & Slang
    [/\bيا عم الحج\b|\bيا حاج\b/gi, 'يا أخي'],
    [/\bيا باشا\b|\bيا بيه\b/gi, 'يا سيدي'],
    [/\bيا اسطى\b|\bيا أسطى\b/gi, 'يا سائق'],
    [/\bيا صاحبي\b|\bيا راجل\b/gi, 'يا صديقي'],
    [/\bيا حبيب قلبي\b/gi, 'يا عزيزي'],

    // Possessives & Demonstratives
    [/\bالكلام بتاعي\b/gi, 'حديثي'],
    [/\bبتاعي\b/gi, 'الخاص بي'],
    [/\bبتاعتي\b/gi, 'الخاصة بي'],
    [/\bبتاعك\b/gi, 'الخاص بك'],
    [/\bبتاعتك\b/gi, 'الخاصة بك'],
    [/\bبتاعنا\b/gi, 'الخاص بنا'],
    [/\bبتاعتنا\b/gi, 'الخاصة بنا'],
    [/\bبتاعهم\b/gi, 'الخاص بهم'],
    [/\bدلوقتي\b/gi, 'الآن'],
    [/\bكده\b|\bكدا\b|\bكدهون\b/gi, 'هكذا'],
    [/\bعشان\b|\bعلشان\b/gi, 'لكي'],
    [/\bخلاص\b/gi, 'انتهى الأمر'],
    [/\bيلا\b|\bيلّا\b/gi, 'هيا بنا'],

    // Questions
    [/\bليه\b/gi, 'لماذا'],
    [/\bإيه\b|\bايه\b/gi, 'ماذا'],
    [/\bازاي\b|\bإزاي\b/gi, 'كيف'],
    [/\bفين\b/gi, 'أين'],
    [/\bامتى\b/gi, 'متى'],
    [/\bمين\b/gi, 'من'],

    // Levantine & Gulf additions
    [/\bشو\b/gi, 'ماذا'],
    [/\bبدي\b/gi, 'أريد'],
    [/\bما بدي\b/gi, 'لا أريد'],
    [/\bهلق\b|\bهلأ\b/gi, 'الآن'],
    [/\bكتير\b/gi, 'كثيراً'],
    [/\bوايد\b/gi, 'كثيراً'],
    [/\bزين\b/gi, 'جيد'],
    [/\bشلونك\b/gi, 'كيف حالك'],
    [/\bشلون\b/gi, 'كيف']
  ];

  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

export function normalizeUrdu(text) {
  if (!text) return '';
  let s = text.trim();

  const replacements = [
    // Pharma / Medical loanword phonetic trap (stops "فارما -> تفضل" mistranslation)
    [/\bفارما\b|\bpharma\b/gi, 'میڈیکل اسٹور'],
    [/\bفارمیسی\b/gi, 'میڈیکل اسٹور'],

    // Common spoken Urdu idioms & discourse markers
    [/\bکوئی مسئلہ نہیں\b/gi, 'کوئی پریشانی نہیں'],
    [/\bپتا نہیں\b/gi, 'معلوم نہیں'],
    [/\bٹھیک ٹھاک\b/gi, 'بالکل ٹھیک'],
    [/\bابھی کے ابھی\b/gi, 'فوراً'],
    [/\bہو جائے گا\b/gi, 'مکمل ہو جائے گا'],
    [/\bکیا حال ہے\b/gi, 'آپ کیسے ہیں'],
    [/\bکیا چل رہا ہے\b/gi, 'کیا ہو رہا ہے']
  ];

  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

export function normalizeHindi(text) {
  if (!text) return '';
  let s = text.trim();

  const replacements = [
    [/\bफार्मा\b|\bpharma\b/gi, 'दवाखाना'],
    [/\bटेंशन मत लो\b/gi, 'चिंता मत करो'],
    [/\bकोई बात नहीं\b/gi, 'कोई समस्या नहीं'],
    [/\bएकदम सही\b/gi, 'बिल्कुल सही'],
    [/\bअभी के अभी\b/gi, 'तुरंत'],
    [/\bक्या चल रहा है\b/gi, 'क्या हो रहा है'],
    [/\bहो जाएगा\b/gi, 'पूर्ण हो जाएगा']
  ];

  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

export function normalizeTurkish(text) {
  if (!text) return '';
  let s = text.trim();

  const replacements = [
    [/\bn'oldu\b|\bnoldu\b/gi, 'ne oldu'],
    [/\bn'apıyorsun\b|\bnapıyon\b/gi, 'ne yapıyorsun'],
    [/\bbişey\b|\bbi şey\b/gi, 'bir şey'],
    [/\baynen\b/gi, 'kesinlikle'],
    [/\bvalla\b|\bvallahi\b/gi, 'gerçekten'],
    [/\bfalan filan\b|\bfalan\b|\bfilan\b/gi, 've benzeri'],
    [/\bhadi\b/gi, 'haydi'],
    [/\byok ya\b/gi, 'hayır']
  ];

  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

export function normalizeGerman(text) {
  if (!text) return '';
  let s = text.trim();

  const replacements = [
    [/\bnix\b/gi, 'nichts'],
    [/\bgibt's\b/gi, 'gibt es'],
    [/\bgeht's\b/gi, 'geht es'],
    [/\bmach's\b/gi, 'mache es'],
    [/\bdrauf\b/gi, 'darauf'],
    [/\bdrin\b/gi, 'darin'],
    [/\bdran\b/gi, 'daran'],
    [/\bhalt\b/gi, 'eben'],
    [/\bne\b/gi, 'nein']
  ];

  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

export function normalizeFrench(text) {
  if (!text) return '';
  let s = text.trim();

  const replacements = [
    [/\bouais\b/gi, 'oui'],
    [/\bchuis\b|\bch'suis\b/gi, 'je suis'],
    [/\bt'as\b/gi, 'tu as'],
    [/\by'a\b/gi, 'il y a'],
    [/\bfaut\b/gi, 'il faut'],
    [/\bd'ac\b|\bd'acc\b/gi, "d'accord"],
    [/\bboulot\b|\btaf\b/gi, 'travail'],
    [/\btruc\b/gi, 'chose'],
    [/\bmec\b|\bgars\b/gi, 'homme']
  ];

  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

export function normalizeRussian(text) {
  if (!text) return '';
  let s = text.trim();

  const replacements = [
    [/\bщас\b|\bща\b/gi, 'сейчас'],
    [/\bчё\b|\bче\b/gi, 'что'],
    [/\bтипа\b/gi, 'вроде'],
    [/\bкороче\b/gi, 'короче говоря'],
    [/\bваще\b/gi, 'вообще'],
    [/\bнеа\b/gi, 'нет'],
    [/\bладно\b/gi, 'хорошо']
  ];

  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

export function normalizeUkrainian(text) {
  if (!text) return '';
  let s = text.trim();

  const replacements = [
    [/\bшо\b/gi, 'що'],
    [/\bтіпа\b/gi, 'наче'],
    [/\bкоротше\b/gi, 'коротше кажучи'],
    [/\bнеа\b/gi, 'ні'],
    [/\bбувай\b/gi, 'до побачення']
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

export function normalizeEnglish(text) {
  if (!text) return '';
  let s = text.trim();

  const replacements = [
    [/\bgonna\b/gi, 'going to'],
    [/\bwanna\b/gi, 'want to'],
    [/\bgotta\b/gi, 'have to'],
    [/\bdunno\b/gi, 'do not know'],
    [/\bkinda\b/gi, 'kind of'],
    [/\bsorta\b/gi, 'sort of'],
    [/\bcuz\b|\b'cause\b/gi, 'because'],
    [/\blemme\b/gi, 'let me'],
    [/\bgimme\b/gi, 'give me']
  ];

  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

export function normalizeSpeech(text, langCode) {
  if (!text || !text.trim()) return '';
  switch (langCode) {
    case 'ar': return normalizeArabic(text);
    case 'ur': return normalizeUrdu(text);
    case 'hi': return normalizeHindi(text);
    case 'tr': return normalizeTurkish(text);
    case 'de': return normalizeGerman(text);
    case 'fr': return normalizeFrench(text);
    case 'ru': return normalizeRussian(text);
    case 'uk': return normalizeUkrainian(text);
    case 'pcm': return normalizeNigerianPidgin(text);
    case 'en': return normalizeEnglish(text);
    default: return text;
  }
}
