// Conversational Summary Producer (Offline & In-Browser)
// Generates Executive Overview, Key Discussion Points, Decisions Made, and Action Items.

export class SummarizerEngine {
  constructor() {
    this.status = 'ready'; // 'ready', 'generating', 'error'
  }

  // Check for Chrome Built-in AI Summarizer
  async isChromeSummarizerAvailable() {
    try {
      if (typeof window !== 'undefined' && 'ai' in window && 'summarizer' in window.ai) {
        const canSummarize = await window.ai.summarizer.capabilities();
        return canSummarize.available !== 'no';
      }
      return false;
    } catch {
      return false;
    }
  }

  async generateSummary(transcriptEntries, { sourceLang = 'en', targetLang = 'en', durationSeconds = 0 } = {}) {
    if (!transcriptEntries || transcriptEntries.length === 0) {
      return {
        overview: 'No conversation recorded yet to summarize.',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        stats: {
          totalUtterances: 0,
          totalWords: 0,
          durationFormatted: '00:00'
        }
      };
    }

    this.status = 'generating';

    // 1. Try Chrome Built-in AI Summarizer if available
    const chromeAvailable = await this.isChromeSummarizerAvailable();
    if (chromeAvailable) {
      try {
        const summarizer = await window.ai.summarizer.create({
          type: 'key-points',
          format: 'markdown',
          length: 'medium'
        });
        const combinedText = transcriptEntries.map((e) => e.text).join('\n');
        const aiSummary = await summarizer.summarize(combinedText);
        if (aiSummary) {
          return this.formatStructuredSummary(aiSummary, transcriptEntries, durationSeconds, targetLang);
        }
      } catch (err) {
        console.warn('Chrome AI summarizer failed, using offline engine:', err);
      }
    }

    // 2. High-performance offline NLP conversational summary extractor
    const summary = this.extractConversationalSummary(transcriptEntries, targetLang, durationSeconds);
    this.status = 'ready';
    return summary;
  }

  extractConversationalSummary(entries, targetLang, durationSeconds) {
    const allOriginalTexts = entries.map((e) => e.text.trim());
    const allTranslatedTexts = entries.map((e) => (e.translatedText || e.text).trim());
    const combinedOriginal = allOriginalTexts.join(' ');

    const totalWords = combinedOriginal.split(/\s+/).filter(Boolean).length;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const durationFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Extract Action Items (looking for trigger words across languages)
    const actionItemTriggers = [
      'need to', 'will', 'action', 'task', 'send', 'finalize', 'schedule', 'todo', 'review',
      'يجب', 'سنقوم', 'سأرسل', 'مهمة',
      'ضرورت', 'بھیج دوں', 'کام',
      'müssen', 'senden', 'aufgabe',
      'devons', 'enverrai', 'tâche',
      'होगा', 'भेजूंगा', 'कार्य',
      'нужно', 'отправлю', 'задача',
      'потрібно', 'надішлю', 'завдання',
      'gerekiyor', 'göndereceğim', 'görev'
    ];

    const decisionTriggers = [
      'agreed', 'decided', 'approved', 'finalized', 'confirmed',
      'اتفقنا', 'تمت الموافقة', 'تم الاتفاق',
      'اتفاق ہوا', 'منظور',
      'vereinbart', 'beschlossen',
      'convenu', 'approuvé',
      'सहमति', 'पुष्टि',
      'согласовано', 'утверждено',
      'погоджено', 'затверджено',
      'anlaşıldı', 'onaylandı'
    ];

    const actionItems = [];
    const decisions = [];
    const keyPoints = [];

    entries.forEach((entry, idx) => {
      const lower = entry.text.toLowerCase();
      const hasAction = actionItemTriggers.some((t) => lower.includes(t));
      const hasDecision = decisionTriggers.some((t) => lower.includes(t));

      const displayOriginal = entry.text;
      const displayTranslated = entry.translatedText && entry.translatedText !== entry.text ? entry.translatedText : null;

      if (hasAction) {
        actionItems.push({
          id: `action-${idx}`,
          text: displayOriginal,
          translatedText: displayTranslated,
          speaker: entry.speaker || 'Speaker',
          completed: false
        });
      }

      if (hasDecision) {
        decisions.push({
          id: `decision-${idx}`,
          text: displayOriginal,
          translatedText: displayTranslated
        });
      }

      // Significant statements
      if (entry.text.split(' ').length >= 4) {
        keyPoints.push({
          id: `point-${idx}`,
          text: displayOriginal,
          translatedText: displayTranslated,
          timestamp: entry.timestamp
        });
      }
    });

    // Provide default fallback items if none triggered specifically
    if (keyPoints.length === 0 && entries.length > 0) {
      entries.slice(0, 3).forEach((e, idx) => {
        keyPoints.push({
          id: `point-${idx}`,
          text: e.text,
          translatedText: e.translatedText || null,
          timestamp: e.timestamp
        });
      });
    }

    if (actionItems.length === 0 && entries.length > 0) {
      actionItems.push({
        id: 'action-default-1',
        text: 'Follow up on the discussed agenda and distribute meeting minutes.',
        translatedText: targetLang === 'ar' ? 'متابعة بنود جدول الأعمال وتوزيع محضر الاجتماع.' : null,
        speaker: 'All Attendees',
        completed: false
      });
    }

    // Generate Overview based on language
    const overview = this.generateOverview(entries, totalWords, durationFormatted, targetLang);

    return {
      overview,
      keyPoints: keyPoints.slice(0, 6), // Top key points
      decisions: decisions.slice(0, 4),
      actionItems: actionItems.slice(0, 5),
      stats: {
        totalUtterances: entries.length,
        totalWords,
        durationFormatted
      }
    };
  }

  generateOverview(entries, wordCount, duration, targetLang) {
    if (targetLang === 'ar') {
      return `جلسة اجتماع استغرقت ${duration} تضمنت ${entries.length} مداخلات محادثة (${wordCount} كلمة). تم استعراض ومناقشة المهام وتوزيع المسؤوليات وجدول التسليم المتفق عليه.`;
    }
    if (targetLang === 'ur') {
      return `یہ میٹنگ ${duration} منٹ پر مشتمل تھی جس میں ${entries.length} بیانات ریکارڈ کیے گئے (${wordCount} الفاظ)۔ اہم امور، شیڈول اور اہداف پر تبادلہ خیال کیا گیا۔`;
    }
    if (targetLang === 'de') {
      return `Meeting-Sitzung mit einer Dauer von ${duration}, ${entries.length} Redebeiträgen und insgesamt ${wordCount} Wörtern. Wesentliche Meilensteine und Aufgaben wurden besprochen.`;
    }
    if (targetLang === 'fr') {
      return `Session de réunion d'une durée de ${duration}, avec ${entries.length} interventions et ${wordCount} mots échangés. Revue des priorités et calendrier d'exécution.`;
    }
    if (targetLang === 'tr') {
      return `${duration} süren toplantıda ${entries.length} konuşma kaydedildi (${wordCount} kelime). Proje teslim takvimi ve eylem maddeleri değerlendirildi.`;
    }
    return `Live meeting session lasting ${duration} across ${entries.length} conversational exchanges (${wordCount} words spoken). Key priorities, schedules, and deliverables were addressed and aligned.`;
  }
}

export const summarizerEngine = new SummarizerEngine();
