'use client';

import React from 'react';
import { Sparkles, X } from 'lucide-react';
import type { SelfHelpSuggestion } from '@dengarin/types';
import { getSelfHelpCard, selfHelpAttribution, selfHelpLicenseLabel, type SelfHelpCard } from '@dengarin/config';
import { useLanguage, type Language } from '@/i18n';
import { MUTED, SectionCard, Tag, usePassportText } from './shared';

/**
 * "Langkah yang bisa dicoba" (SCRUM-45). Every word of a card comes from the
 * knowledge base in @dengarin/config, in the interface language; the model
 * only chose the card id and quoted the user's sentence that made it
 * relevant. Rendered for READY_FOR_USER_REVIEW and HUMAN_SUPPORT_RECOMMENDED
 * (alongside, never instead of, the professional suggestion). Never on the
 * urgent-help screen, which has its own static safety plan.
 *
 * Accessibility: one labelled region, h2/h3 headings, real lists, 44 px
 * remove buttons, single column so it works at 320 px.
 */
export interface SelfHelpStepsProps {
  items: SelfHelpSuggestion[];
  /** Absent once the passport is approved: the list is read-only then. */
  onRemove?: (cardId: string) => void;
}

export function SelfHelpSteps({ items, onRemove }: SelfHelpStepsProps) {
  const t = usePassportText().review.selfHelp;
  const { lang } = useLanguage();
  const cards = items
    .map((item) => ({ item, card: getSelfHelpCard(item.cardId) }))
    .filter((entry): entry is { item: SelfHelpSuggestion; card: SelfHelpCard } => entry.card !== undefined);
  if (cards.length === 0) return null;
  const headingId = 'self-help-steps-title';

  return (
    <SectionCard as="section" tone="paper" className="space-y-5" aria-labelledby={headingId}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#3357EE] shrink-0" aria-hidden="true" />
          <h2 id={headingId} className="text-lg font-bold text-[#151515] leading-[1.25]">
            {t.title}
          </h2>
          <Tag tone="white">{t.tag}</Tag>
        </div>
        <p className={`text-sm leading-relaxed ${MUTED}`}>{t.lede}</p>
      </div>

      <ul className="space-y-4">
        {cards.map(({ item, card }) => (
          <li key={card.id}>
            <SelfHelpCardView card={card} reasonQuote={item.reasonQuote} lang={lang} onRemove={onRemove ? () => onRemove(card.id) : undefined} />
          </li>
        ))}
      </ul>
      {onRemove && <p className={`text-sm leading-relaxed ${MUTED}`}>{t.hiddenNote}</p>}
    </SectionCard>
  );
}

function SelfHelpCardView({
  card,
  reasonQuote,
  lang,
  onRemove,
}: {
  card: SelfHelpCard;
  reasonQuote: string;
  lang: Language;
  onRemove?: () => void;
}) {
  const t = usePassportText().review.selfHelp;
  const attribution = selfHelpAttribution(card);
  const titleId = `self-help-${card.id}`;
  return (
    <article aria-labelledby={titleId} className="rounded-[6px] border-2 border-[#151515] bg-white p-4 sm:p-5 shadow-[2px_2px_0px_#151515] space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={titleId} className="text-base font-bold text-[#151515] leading-[1.3]">
          {card.title[lang]}
        </h3>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t.hideAria(card.title[lang])}
            className="shrink-0 inline-flex items-center gap-1 min-h-[44px] px-2.5 rounded-[4px] border-2 border-[#151515] bg-white text-sm font-bold hover:bg-[#FFF8EF] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3357EE] focus-visible:ring-offset-2"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            <span>{t.hide}</span>
          </button>
        )}
      </div>

      <p className={`text-base leading-relaxed ${MUTED}`}>{card.summary[lang]}</p>

      <blockquote className={`text-base leading-relaxed border-l-2 border-[#3357EE] pl-3 ${MUTED}`}>
        <span className="block text-sm font-bold text-[#2B51E6]">{t.why}</span>
        &ldquo;{reasonQuote}&rdquo;
      </blockquote>

      <div className="space-y-1.5">
        <h4 className="text-sm font-bold text-[#151515]">{t.steps}</h4>
        <ol className="list-decimal pl-5 space-y-1.5">
          {card.steps[lang].map((step, index) => (
            <li key={index} className="text-base text-[#151515] leading-[1.5]">
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-bold text-[#151515]">{t.seekHelp}</h4>
        <p className="text-base leading-relaxed text-[#151515]">{card.seekHelpWhen[lang]}</p>
      </div>

      {card.cautions && (
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-[#151515]">{t.cautions}</h4>
          <p className={`text-base leading-relaxed ${MUTED}`}>{card.cautions[lang]}</p>
        </div>
      )}

      <p className={`text-sm leading-relaxed border-t border-[#D8D3C9] pt-3 ${MUTED}`}>
        <span className="font-bold">{t.source}:</span> {attribution.publisher}, {attribution.title} ({selfHelpLicenseLabel(card, lang)}).
        {attribution.adapted && <> {t.adapted}</>}
      </p>
    </article>
  );
}

/**
 * Static safety plan for the urgent-help screen: the two `safety_plan` cards
 * from the knowledge base, no AI call, no network, no reason quote. Rendered
 * below the emergency contacts, never above them.
 */
export function SafetyPlanCards({ cards }: { cards: SelfHelpCard[] }) {
  const t = usePassportText().immediate.safetyPlan;
  const { lang } = useLanguage();
  if (cards.length === 0) return null;
  const headingId = 'safety-plan-title';
  return (
    <section aria-labelledby={headingId} className="space-y-4 border-t border-[#D8D3C9] pt-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={headingId} className="text-xl font-bold text-[#151515] leading-[1.25]">
            {t.title}
          </h2>
          <Tag tone="paper">{t.tag}</Tag>
        </div>
        <p className={`text-base leading-relaxed max-w-[38rem] ${MUTED}`}>{t.lede}</p>
      </div>
      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.map((card) => {
          const titleId = `safety-plan-${card.id}`;
          return (
            <li key={card.id}>
              <article aria-labelledby={titleId} className="h-full rounded-[8px] border-2 border-[#151515] bg-white p-5 shadow-[2px_2px_0px_#151515] space-y-3">
                <h3 id={titleId} className="text-lg font-bold text-[#151515] leading-[1.25]">
                  {card.title[lang]}
                </h3>
                <p className={`text-base leading-relaxed ${MUTED}`}>{card.summary[lang]}</p>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-[#151515]">{t.steps}</h4>
                  <ol className="list-decimal pl-5 space-y-1.5">
                    {card.steps[lang].map((step, index) => (
                      <li key={index} className="text-base text-[#151515] leading-[1.5]">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#B3261E]">{t.seekHelp}</h4>
                  <p className="text-base leading-relaxed text-[#151515] font-medium">{card.seekHelpWhen[lang]}</p>
                </div>
                {card.cautions && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#151515]">{t.cautions}</h4>
                    <p className={`text-base leading-relaxed ${MUTED}`}>{card.cautions[lang]}</p>
                  </div>
                )}
                <p className={`text-sm leading-relaxed border-t border-[#D8D3C9] pt-3 ${MUTED}`}>
                  <span className="font-bold">{t.source}:</span> {card.source.publisher}, {card.source.title} ({selfHelpLicenseLabel(card, lang)}).
                </p>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
