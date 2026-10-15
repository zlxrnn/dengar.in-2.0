'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, ShieldOff } from 'lucide-react';
import { PageContainer, Button, Badge, Chip } from '@/components/ui';
import { useLanguage, useText } from '@/i18n';
import { reviewDemoText } from '@/i18n/pages/reviewDemo';
import { REVIEW_CHECKLIST, REVIEW_DEMO_CASES, REVIEW_DEMO_NOTICES } from '@/lib/reviewDemoData';

/**
 * /review-demo (AMD-12). Read-only and synthetic: no form field, no fetch, no
 * storage. The checklist is component state only and is lost on reload.
 */
export default function ReviewDemoPage() {
  const t = useText(reviewDemoText);
  const { lang } = useLanguage();
  const [caseId, setCaseId] = useState(REVIEW_DEMO_CASES[0].id);
  const [ticked, setTicked] = useState<Set<number>>(new Set());

  const current = REVIEW_DEMO_CASES.find((c) => c.id === caseId) ?? REVIEW_DEMO_CASES[0];
  const toggle = (i: number) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <PageContainer size="default" className="space-y-8 lg:space-y-10">
      <div>
        <Button href="/dashboard" variant="outline" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
          {t.back}
        </Button>
      </div>

      <div role="note" className="border-2 border-ink bg-[#FFD84D] rounded-md p-4 shadow-hard-sm space-y-2 text-left">
        <p className="flex items-center gap-2 text-base font-bold text-ink">
          <FlaskConical className="w-5 h-5 shrink-0" aria-hidden="true" />
          {REVIEW_DEMO_NOTICES.synthetic[lang]}
        </p>
        <p className="flex items-start gap-2 text-base text-ink font-semibold">
          <ShieldOff className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{REVIEW_DEMO_NOTICES.noRealIntake[lang]}</span>
        </p>
        <p className="text-base text-ink font-semibold">{REVIEW_DEMO_NOTICES.noClinical[lang]}</p>
      </div>

      <header className="space-y-4 text-left max-w-3xl">
        <Badge variant="calm" size="md">{t.badge}</Badge>
        <h1 className="text-[2.25rem] sm:text-5xl font-bold text-ink tracking-[-0.03em] leading-[1.05]">{t.title}</h1>
        <p className="text-base sm:text-lg text-[#4A453E] leading-relaxed">{t.intro}</p>
        <p className="text-base text-[#59544D]">{REVIEW_DEMO_NOTICES.notModelOutput[lang]}</p>
        <Link
          href="/crisis"
          className="inline-flex items-center min-h-[44px] text-base font-bold text-[#B3261E] underline underline-offset-4 decoration-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3357EE] rounded"
        >
          {t.urgent}
        </Link>
      </header>

      <div className="space-y-2">
        <p className="text-sm font-bold text-ink">{t.casesLabel}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.casesAria}>
          {REVIEW_DEMO_CASES.map((c) => (
            <Chip key={c.id} selected={caseId === c.id} onClick={() => setCaseId(c.id)} aria-pressed={caseId === c.id} size="sm">
              {t.caseWord} {c.id}: {c.title[lang]}
            </Chip>
          ))}
        </div>
      </div>

      <section aria-live="polite" className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-left">
        <div className="bg-white border-2 border-ink rounded-lg p-5 space-y-4 shadow-hard-sm">
          <h2 className="font-bold text-lg text-ink">{t.inputHeading}</h2>
          {current.input === null ? (
            <p className="text-base text-[#59544D] italic">{t.inputHidden}</p>
          ) : (
            <blockquote className="text-base text-ink border-l-4 border-ink pl-3">{current.input}</blockquote>
          )}
          {current.redactedInput && (
            <>
              <h3 className="text-sm font-bold text-ink">{t.redactedHeading}</h3>
              <blockquote className="text-base text-ink border-l-4 border-[#3357EE] pl-3">{current.redactedInput}</blockquote>
            </>
          )}
          <p className="text-sm">
            <span className="font-bold text-ink">{t.stateHeading}: </span>
            <span className="font-semibold">{t.states[current.state]}</span>
          </p>
        </div>

        <div className="bg-white border-2 border-ink rounded-lg p-5 space-y-4 shadow-hard-sm">
          <h2 className="font-bold text-lg text-ink">{t.fieldsHeading}</h2>
          {current.fields.length === 0 ? (
            <p className="text-base text-[#59544D]">{t.noFields}</p>
          ) : (
            <ul className="space-y-3">
              {current.fields.map((f) => (
                <li key={f.value} className="text-base">
                  <p className="font-bold text-ink">{f.label[lang]}: <span className="font-normal">{f.value}</span></p>
                  <p className="text-sm text-[#59544D]">{t.quote}: “{f.quote}”</p>
                </li>
              ))}
            </ul>
          )}
          {current.unknowns.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink">{t.unknownsHeading}</h3>
              <ul className="list-disc pl-5 text-base text-[#59544D]">
                {current.unknowns.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          )}
          {current.clarification && (
            <div>
              <h3 className="text-sm font-bold text-ink">{t.clarificationHeading}</h3>
              <p className="text-base text-[#59544D]">{current.clarification}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 border-2 border-dashed border-[#A3480B] bg-[#FFF8EF] rounded-lg p-5 space-y-1">
          <h2 className="font-bold text-lg text-ink">{t.noticeHeading}</h2>
          <p className="text-base text-ink">{current.notice[lang]}</p>
        </div>
      </section>

      <section className="border-2 border-ink rounded-lg p-5 bg-white shadow-hard-sm space-y-3 text-left" aria-labelledby="review-checklist">
        <h2 id="review-checklist" className="font-bold text-lg text-ink">{t.checklistHeading}</h2>
        <p className="text-sm text-[#59544D]">{t.checklistNote}</p>
        <ul className="space-y-1">
          {REVIEW_CHECKLIST.map((item, i) => (
            <li key={item.en}>
              <label className="flex items-start gap-3 min-h-[44px] py-2 text-base text-ink cursor-pointer">
                <input type="checkbox" checked={ticked.has(i)} onChange={() => toggle(i)} className="mt-1 w-5 h-5 shrink-0" />
                <span>{item[lang]}</span>
              </label>
            </li>
          ))}
        </ul>
        {ticked.size === REVIEW_CHECKLIST.length && (
          <p role="status" className="text-base font-bold text-ink">{t.checkedAll}</p>
        )}
      </section>
    </PageContainer>
  );
}

