'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PhoneCall, MessageCircle, ExternalLink, ArrowLeft, Info } from 'lucide-react';
import { SUPPORT_OPTIONS, SUPPORT_OPTIONS_NOTICE, toTelHref, type SupportOptionCategory } from '@dengarin/config';
import { PageContainer, Button, Badge, Chip } from '@/components/ui';
import { useLanguage, useText } from '@/i18n';
import { supportOptionsText } from '@/i18n/pages/supportOptions';

type Filter = 'all' | SupportOptionCategory;

const FILTERS: readonly Filter[] = ['all', 'mental_health_line', 'counselling', 'health_facility', 'child_protection', 'financial'];

const linkClass =
  'inline-flex items-center gap-2 px-4 py-2 text-base font-bold rounded border-2 border-ink shadow-hard-sm min-h-[48px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3357EE] focus-visible:ring-offset-2';

export default function SupportOptionsPage() {
  const t = useText(supportOptionsText);
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<Filter>('all');

  const items = SUPPORT_OPTIONS.filter((o) => filter === 'all' || o.category === filter);

  return (
    <PageContainer size="default" className="space-y-8 lg:space-y-10">
      <div>
        <Button href="/dashboard" variant="outline" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
          {t.back}
        </Button>
      </div>

      <header className="space-y-4 text-left max-w-3xl">
        <Badge variant="calm" size="md">{t.badge}</Badge>
        <h1 className="text-[2.25rem] sm:text-5xl font-bold text-ink tracking-[-0.03em] leading-[1.05]">{t.title}</h1>
        <p className="text-base sm:text-lg text-[#4A453E] leading-relaxed">{t.intro}</p>
        <p role="note" className="flex gap-2 text-base text-ink font-semibold border-2 border-ink bg-[#FFF8EF] rounded-md p-4">
          <Info className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{SUPPORT_OPTIONS_NOTICE[lang]}</span>
        </p>
        <Link
          href="/crisis"
          className="inline-flex items-center min-h-[44px] text-base font-bold text-[#B3261E] underline underline-offset-4 decoration-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3357EE] rounded"
        >
          {t.urgent}
        </Link>
      </header>

      <div className="space-y-2">
        <p className="text-sm font-bold text-ink">{t.filterLabel}</p>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t.filterAria}>
          {FILTERS.map((id) => (
            <Chip key={id} selected={filter === id} onClick={() => setFilter(id)} aria-pressed={filter === id} size="sm">
              {t.categories[id]}
            </Chip>
          ))}
        </div>
      </div>

      <section aria-label={t.listAria} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {items.map((o) => {
          const name = o.name[lang];
          return (
            <article key={o.id} className="bg-white border-2 border-ink rounded-lg p-5 sm:p-6 space-y-4 shadow-hard-sm text-left">
              <div className="space-y-2">
                <Badge variant="calm" size="sm">{t.categories[o.category]}</Badge>
                <h2 className="font-bold text-lg text-ink leading-[1.25]">{name}</h2>
                <p className="text-base text-[#59544D] leading-relaxed">{o.summary[lang]}</p>
              </div>

              <dl className="text-base text-[#59544D] space-y-1">
                <div><dt className="inline font-bold text-ink">{t.hours}: </dt><dd className="inline">{o.hours[lang]}</dd></div>
                <div><dt className="inline font-bold text-ink">{t.cost}: </dt><dd className="inline">{o.cost[lang]}</dd></div>
              </dl>

              <div className="border-2 border-dashed border-[#A3480B] rounded-md p-3 bg-[#FFF8EF]">
                <h3 className="text-sm font-bold text-ink mb-1">{t.limits}</h3>
                <ul className="list-disc pl-5 space-y-1 text-base text-[#59544D]">
                  {o.limits[lang].map((limit) => (
                    <li key={limit}>{limit}</li>
                  ))}
                </ul>
              </div>

              <div className="text-sm text-[#59544D] space-y-1 border-t border-[#D8D3C9] pt-3">
                <p>
                  <span className="font-bold text-ink">{t.source}: </span>
                  <a
                    href={o.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t.openSource(o.source.publisher)}
                    className="underline underline-offset-4 decoration-2 font-semibold text-ink"
                  >
                    {o.source.publisher}: {o.source.title}
                  </a>
                </p>
                <p>
                  <span className="font-bold text-ink">{t.verified}: </span>
                  <time dateTime={o.lastVerified} className="tabular-nums">{o.lastVerified}</time>
                </p>
              </div>

              {(o.phone || o.whatsapp || o.website) && (
                <div className="flex flex-wrap items-center gap-2">
                  {o.phone && (
                    <a href={toTelHref(o.phone)} aria-label={t.callAria(name, o.phone)} className={`${linkClass} bg-cobalt text-white`}>
                      <PhoneCall className="w-5 h-5" aria-hidden="true" />
                      <span>{t.call} <span className="tabular-nums">{o.phone}</span></span>
                    </a>
                  )}
                  {o.whatsapp && (
                    <a
                      href={`https://wa.me/62${o.whatsapp.replace(/^0/, '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t.whatsappAria(name, o.whatsapp)}
                      className={`${linkClass} bg-lime text-ink`}
                    >
                      <MessageCircle className="w-5 h-5" aria-hidden="true" />
                      <span>WhatsApp <span className="tabular-nums">{o.whatsapp}</span></span>
                    </a>
                  )}
                  {o.website && (
                    <a href={o.website} target="_blank" rel="noopener noreferrer" aria-label={t.websiteAria(name)} className={`${linkClass} bg-paper text-ink`}>
                      <ExternalLink className="w-5 h-5" aria-hidden="true" />
                      <span>{t.website}</span>
                    </a>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <p>
        <Link href="/resources" className="inline-flex items-center min-h-[44px] text-base font-bold text-ink underline underline-offset-4 decoration-2 rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3357EE]">
          {t.generalDirectory}
        </Link>
      </p>
    </PageContainer>
  );
}

