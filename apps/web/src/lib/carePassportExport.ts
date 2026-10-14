import type { CarePassport, EvidenceField, SelfHelpSuggestion } from '@dengarin/types';
import { getSelfHelpCard, selfHelpAttribution, selfHelpLicenseLabel } from '@dengarin/config';
import { LOCALE_TAG, type Language } from '../i18n/language.ts';
import { carePassportText } from '../i18n/pages/carePassport.ts';

/**
 * LOCAL EXPORT OF AN APPROVED CARE PASSPORT (AMD-11 slice of AMD-10)
 *
 * Pure text builder, no browser APIs, so it can be unit-tested. It only ever
 * serialises fields the user approved: values and the user's own questions.
 * A value quoted from a selected journal / check-in entry carries its date in
 * brackets (F-A "Bukti Bertanggal"), because "since when" is what the
 * professional will ask. Source quotes, model/provider ids, warnings and dropped-claim counters are
 * deliberately left out; a professional needs the user's statements, not the
 * machinery behind them. Nothing here sends data anywhere.
 *
 * `lang` only changes the fixed headings and labels; the user's own text and
 * the disclaimer are written exactly as approved.
 *
 * SCRUM-45: the self-help cards the user kept are appended as their own
 * section. Their text comes from the knowledge base (never from the model),
 * each with its source line, licence and, for CC BY-NC-SA material, the
 * adaptation disclaimer the licence requires. The quote the model gave as
 * the reason IS exported here: it is the user's own sentence and explains
 * why the card is on the page.
 */

export type CarePassportExportFormat = 'md' | 'txt';

export interface CarePassportExportOptions {
  format: CarePassportExportFormat;
  /** Defaults to now; injectable for deterministic tests. */
  generatedAt?: Date;
  /** Honest one-liner about how the draft was produced, e.g. "Disusun dengan bantuan AI di AMD". */
  provenanceLabel?: string;
  /** Interface language for headings and labels; defaults to Indonesian. */
  lang?: Language;
}

/** Indonesian section labels (kept for callers and tests that expect the default). */
export const EXPORT_SECTION_LABELS = carePassportText.id.exportFile.sections;

/** Section labels in the given interface language. */
export function exportSectionLabels(lang: Language = 'id'): typeof EXPORT_SECTION_LABELS {
  return carePassportText[lang].exportFile.sections;
}

/** "(jurnal, 24 September 2026)": the dated source behind a fact, when it came from a local entry. */
function datedSourceSuffix(field: EvidenceField, lang: Language): string {
  const ref = field.sourceRef;
  if (!ref || (ref.kind !== 'journal' && ref.kind !== 'checkin') || !ref.date) return '';
  const [y, m, d] = ref.date.split('-').map(Number);
  if (!y || !m || !d) return '';
  const when = new Intl.DateTimeFormat(LOCALE_TAG[lang], { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d));
  const text = carePassportText[lang].exportFile;
  return ` (${ref.kind === 'journal' ? text.journal : text.checkin}, ${when})`;
}

function presentValues(fields: EvidenceField[], lang: Language): string[] {
  return fields
    .map((f) => (typeof f.value === 'string' && f.value.trim() ? `${f.value.trim()}${datedSourceSuffix(f, lang)}` : ''))
    .filter((v) => v.length > 0);
}

function formatDate(date: Date, lang: Language): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[lang], { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(date);
}

export function carePassportExportFileName(format: CarePassportExportFormat, date = new Date(), lang: Language = 'id'): string {
  const stamp = date.toISOString().slice(0, 10);
  return `${carePassportText[lang].exportFile.fileStem}-${stamp}.${format}`;
}

/**
 * Returns null unless the passport has been approved by the user; the UI must
 * never offer a download before that affirmative step.
 */
export function buildCarePassportExport(
  passport: CarePassport,
  options: CarePassportExportOptions
): string | null {
  if (passport.reviewStatus !== 'user_approved') return null;
  const md = options.format === 'md';
  const date = options.generatedAt ?? new Date();
  const lang = options.lang ?? 'id';
  const text = carePassportText[lang].exportFile;
  const labels = text.sections;

  const h1 = (value: string) => (md ? `# ${value}` : value.toUpperCase());
  const h2 = (value: string) => (md ? `## ${value}` : `${value}`);
  const bullet = (value: string) => (md ? `- ${value}` : `- ${value}`);
  const quoteBlock = (value: string) => (md ? `> ${value}` : value);

  const lines: string[] = [];
  lines.push(h1(text.title));
  lines.push(text.generated(formatDate(date, lang)));
  if (options.provenanceLabel) lines.push(options.provenanceLabel);
  lines.push('');

  const sections: Array<[string, string[]]> = [
    [labels.concerns, presentValues(passport.concerns, lang)],
    [labels.dailyImpact, presentValues(passport.dailyImpact, lang)],
    [labels.duration, presentValues([passport.duration], lang)],
    [labels.relevantContext, presentValues(passport.relevantContext, lang)],
  ];
  for (const [label, values] of sections) {
    lines.push(h2(label));
    if (values.length === 0) {
      lines.push(text.empty);
    } else {
      for (const value of values) lines.push(bullet(value));
    }
    lines.push('');
  }

  lines.push(h2(labels.questionsForProfessional));
  const questions = passport.questionsForProfessional.map((q) => q.trim()).filter(Boolean);
  if (questions.length === 0) lines.push(text.noQuestions);
  else questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
  lines.push('');

  const unknowns = passport.unknowns.map((u) => u.trim()).filter(Boolean);
  if (unknowns.length > 0) {
    lines.push(h2(labels.unknowns));
    for (const u of unknowns) lines.push(bullet(u));
    lines.push('');
  }

  const selfHelp = selfHelpExportLines(passport.selfHelp ?? [], lang, md);
  if (selfHelp.length > 0) {
    lines.push(h2(labels.selfHelp));
    lines.push(...selfHelp);
    lines.push('');
  }

  lines.push(h2(text.important));
  lines.push(quoteBlock(passport.disclaimer));
  lines.push('');

  return lines.join('\n');
}

/**
 * One block per kept card: title, the user's own reason quote, the fixed
 * steps, when to seek help, cautions, and the source/licence line. Unknown
 * ids (should not happen after validation) are skipped rather than invented.
 */
function selfHelpExportLines(items: SelfHelpSuggestion[], lang: Language, md: boolean): string[] {
  const text = carePassportText[lang].exportFile.selfHelp;
  const out: string[] = [];
  const cards = items.map((item) => ({ item, card: getSelfHelpCard(item.cardId) }));
  if (!cards.some((c) => c.card)) return out;
  out.push(text.intro, '');
  for (const { item, card } of cards) {
    if (!card) continue;
    out.push(md ? `### ${card.title[lang]}` : card.title[lang].toUpperCase());
    out.push(`${text.why}: "${item.reasonQuote}"`);
    card.steps[lang].forEach((step, i) => out.push(`${i + 1}. ${step}`));
    out.push(`${text.seekHelp}: ${card.seekHelpWhen[lang]}`);
    if (card.cautions) out.push(`${text.cautions}: ${card.cautions[lang]}`);
    const attribution = selfHelpAttribution(card);
    const source = `${text.source}: ${attribution.publisher}, ${attribution.title} (${selfHelpLicenseLabel(card, lang)}). ${attribution.url}`;
    out.push(attribution.adapted ? `${source} ${text.adapted}` : source);
    out.push('');
  }
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out;
}
