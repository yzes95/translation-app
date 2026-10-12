// Speech & Dialect Normalizer Engine
// High-frequency spoken speech, oral contractions, and phonetic traps filter.
// Applied ONLY on the Basic (Google/MyMemory) path; AI models read raw dialect natively.
//
// IMPORTANT: JavaScript `\b` only understands ASCII [A-Za-z0-9_], so it never matches
// around Arabic/Urdu/Hindi/Cyrillic/Turkish letters. All rules are built with Unicode-aware
// boundaries instead. Rules that change person, gender or meaning (e.g. "شغال" -> "يعمل",
// "عايز" -> "أريد", "خلاص" -> "انتهى الأمر") were deliberately removed: a wrong rewrite is
// worse than letting the translator see the original word.

const START = '(?<![\\p{L}\\p{M}\\p{N}_])';
const END = '(?![\\p{L}\\p{M}\\p{N}_])';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a rule: list of literal phrases (or raw regex sources via {re}) -> replacement.
 * Longest phrases first so "مش واخد باله" wins over "واخد باله".
 */
function rule(phrases, replacement, { prefix = '' } = {}) {
  const alts = phrases
    .map((p) => (typeof p === 'string' ? escapeRegex(p).replace(/ /g, '\\s+') : p.re))
    .sort((a, b) => b.length - a.length);
  return [new RegExp(`${prefix}${START}(?:${alts.join('|')})${END}`, 'giu'), replacement];
}

function applyRules(text, rules) {
  if (!text) return '';
  let s = text.trim();
  for (const [pattern, replacement] of rules) {
    s = s.replace(pattern, replacement);
  }
  return s.replace(/\s{2,}/g, ' ').trim();
}

const ARABIC_RULES = [
  // Phrases (must run before their sub-words)
  rule(['شغال ولا مش شغال', 'شغال ولا لا'], 'هل يعمل أم لا'),
  rule(['مش واخد باله', 'مش واخده باله'], 'غير منتبه'),
  rule(['بيقطع كلامي', 'بتقطع كلامي'], 'يقاطع كلامي'),
  rule(['بيلف ويدور'], 'يراوغ'),
  rule(['في نص الكلام'], 'في منتصف الكلام'),
  rule(['في النص', 'في النُص', 'فالنص'], 'في المنتصف'),
  rule(['عالهوا', 'ع الهوا', 'على الهوا'], 'على الهواء مباشرة'),
  rule(['على طول', 'عطول', 'ع طول'], 'مباشرة'),
  rule(['في الأول', 'في الاول', 'فالاول', 'فالأول'], 'في البداية'),
  rule(['في الآخر', 'في الاخر', 'فالاخر', 'فالآخر'], 'في النهاية'),
  rule(['يا عم الحج'], 'يا أخي'),
  rule(['يا باشا', 'يا بيه'], 'يا سيدي'),
  rule(['يا صاحبي'], 'يا صديقي'),

  // Negations with an unambiguous first-person reading in speech
  rule(['مش فاهم', 'مش فاهمة'], 'لا أفهم'),
  rule(['مش عارف', 'مش عارفة'], 'لا أعرف'),
  rule(['مش كده', 'مش كدا'], 'أليس كذلك'),
  rule(['ما بيردش', 'مابيردش'], 'لا يرد'),
  rule(['مفيش', 'مافيش', 'ما فيش'], 'لا يوجد'),
  rule(['ما بدي', 'مابدي'], 'لا أريد'),

  // Possessives
  rule(['بتاعي'], 'الخاص بي'),
  rule(['بتاعتي'], 'الخاصة بي'),
  rule(['بتاعك'], 'الخاص بك'),
  rule(['بتاعتك'], 'الخاصة بك'),
  rule(['بتاعنا'], 'الخاص بنا'),
  rule(['بتاعتنا'], 'الخاصة بنا'),
  rule(['بتاعهم'], 'الخاص بهم'),

  // Unambiguous adverbs / question words
  rule(['دلوقتي', 'دلوقت', 'هلق', 'هلأ', 'هسه', 'هسع'], 'الآن'),
  rule(['ازاي', 'إزاي'], 'كيف'),
  rule(['شلونك'], 'كيف حالك'),
  rule(['شلون'], 'كيف'),
  rule(['فين', 'وين'], 'أين'),
  rule(['امتى', 'إمتى'], 'متى'),
  rule(['شو'], 'ماذا'),
  rule(['بدي'], 'أريد'),
  rule(['كتير'], 'كثيراً'),
  rule(['وايد'], 'كثيراً')
];

const URDU_RULES = [
  // Pharma loanword trap (was mistranslated as "تفضل")
  rule(['فارما', 'فارمیسی', 'pharma', 'pharmacy'], 'میڈیکل اسٹور'),
  rule(['پتا نہیں', 'پتہ نہیں'], 'معلوم نہیں'),
  rule(['ابھی کے ابھی'], 'فوراً'),
  rule(['کیا چل رہا ہے'], 'کیا ہو رہا ہے')
];

const HINDI_RULES = [
  rule(['फार्मा', 'pharma'], 'दवाखाना'),
  rule(['टेंशन मत लो', 'टेंशन मत लीजिए'], 'चिंता मत करो'),
  rule(['अभी के अभी'], 'तुरंत'),
  rule(['क्या चल रहा है'], 'क्या हो रहा है')
];

const TURKISH_RULES = [
  rule(["n'oldu", 'noldu'], 'ne oldu'),
  rule(["n'apıyorsun", 'napıyon', 'napıyorsun'], 'ne yapıyorsun'),
  rule(['bişey', 'bi şey'], 'bir şey'),
  rule(['yok ya'], 'hayır')
];

const GERMAN_RULES = [
  rule(['nix'], 'nichts'),
  rule(["gibt's", 'gibts'], 'gibt es'),
  rule(["geht's", 'gehts'], 'geht es'),
  rule(["mach's"], 'mache es')
];

const FRENCH_RULES = [
  rule(['ouais'], 'oui'),
  rule(['chuis', "ch'suis", "j'suis"], 'je suis'),
  rule(["t'as"], 'tu as'),
  // Guarded: do not turn an existing "il y a" / "il faut" into "il il ..."
  rule(["y'a"], 'il y a', { prefix: '(?<!il\\s)' }),
  rule(['faut'], 'il faut', { prefix: '(?<!il\\s)' }),
  rule(["d'ac", "d'acc"], "d'accord"),
  rule(['boulot', 'taf'], 'travail'),
  rule(['truc'], 'chose')
];

const RUSSIAN_RULES = [
  rule(['щас', 'ща'], 'сейчас'),
  rule(['чё', 'чо'], 'что'),
  rule(['ваще'], 'вообще'),
  rule(['неа'], 'нет')
];

const UKRAINIAN_RULES = [
  rule(['шо'], 'що'),
  rule(['тіпа'], 'наче'),
  rule(['неа'], 'ні')
];

const PIDGIN_RULES = [
  rule(['how you dey'], 'how are you'),
  rule(['how body'], 'how are you feeling'),
  rule(['wetin dey happen', 'wetin dey sup'], 'what is happening'),
  rule(['wetin you dey do'], 'what are you doing'),
  rule(['wetin be dat', 'wetin be that'], 'what is that'),
  rule(['wetin'], 'what'),
  rule(['no wahala'], 'no problem'),
  rule(['wahala'], 'trouble'),
  rule(['abeg'], 'please'),
  rule(['na so'], 'that is true'),
  rule(['na lie'], 'that is a lie'),
  rule(['make we'], 'let us'),
  rule(['i dey go'], 'I am going'),
  rule(['we dey go'], 'we are going'),
  rule(['dey go'], 'going'),
  rule(['dey come'], 'coming'),
  rule(['i fit'], 'I can'),
  rule(['you fit'], 'you can'),
  rule(['comot'], 'leave'),
  rule(['oya'], 'come on'),
  rule(['abi'], 'right?'),
  rule(['well well'], 'very well'),
  rule(['small small'], 'gradually')
];

const ENGLISH_RULES = [
  rule(['gonna'], 'going to'),
  rule(['wanna'], 'want to'),
  rule(['gotta'], 'have to'),
  rule(['dunno'], 'do not know'),
  rule(['kinda'], 'kind of'),
  rule(['sorta'], 'sort of'),
  rule(['cuz', "'cause"], 'because'),
  rule(['lemme'], 'let me'),
  rule(['gimme'], 'give me')
];

export const normalizeArabic = (t) => applyRules(t, ARABIC_RULES);
export const normalizeUrdu = (t) => applyRules(t, URDU_RULES);
export const normalizeHindi = (t) => applyRules(t, HINDI_RULES);
export const normalizeTurkish = (t) => applyRules(t, TURKISH_RULES);
export const normalizeGerman = (t) => applyRules(t, GERMAN_RULES);
export const normalizeFrench = (t) => applyRules(t, FRENCH_RULES);
export const normalizeRussian = (t) => applyRules(t, RUSSIAN_RULES);
export const normalizeUkrainian = (t) => applyRules(t, UKRAINIAN_RULES);
export const normalizeNigerianPidgin = (t) => applyRules(t, PIDGIN_RULES);
export const normalizeEnglish = (t) => applyRules(t, ENGLISH_RULES);

export function normalizeSpeech(text, langCode) {
  if (!text || !text.trim()) return '';
  try {
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
      default: return text.trim();
    }
  } catch (err) {
    // Never let normalization break translation
    console.warn('normalizeSpeech failed, using raw text:', err);
    return text.trim();
  }
}
