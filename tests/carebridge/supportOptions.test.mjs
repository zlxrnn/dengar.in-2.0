// AMD-12: /support-options data must show source, last verification and limits,
// and must never promise availability.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORT_OPTIONS, SUPPORT_OPTIONS_NOTICE } from '../../packages/config/src/supportOptions.ts';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const PROMISES = /\b(dijamin|pasti (dijawab|tersedia)|selalu tersedia|guaranteed|always available|instant)/i;

describe('Support options: source, verification, limits', () => {
  it('has unique ids and both languages everywhere', () => {
    assert.equal(new Set(SUPPORT_OPTIONS.map((o) => o.id)).size, SUPPORT_OPTIONS.length);
    for (const o of SUPPORT_OPTIONS) {
      for (const text of [o.name, o.summary, o.hours, o.cost]) {
        assert.ok(text.id.trim() && text.en.trim(), `${o.id}: teks dua bahasa wajib`);
      }
      assert.equal(o.limits.id.length, o.limits.en.length, `${o.id}: jumlah batas ID dan EN harus sama`);
    }
  });

  it('every option cites an https source with publisher and title', () => {
    for (const o of SUPPORT_OPTIONS) {
      assert.match(o.source.url, /^https:\/\//, o.id);
      assert.ok(o.source.publisher.trim() && o.source.title.trim(), o.id);
    }
  });

  it('every option has a real, non-future verification date', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const o of SUPPORT_OPTIONS) {
      assert.match(o.lastVerified, ISO, o.id);
      assert.ok(!Number.isNaN(Date.parse(o.lastVerified)), o.id);
      assert.ok(o.lastVerified <= today, `${o.id}: tanggal verifikasi di masa depan`);
    }
  });

  it('every option states at least two limits', () => {
    for (const o of SUPPORT_OPTIONS) {
      assert.ok(o.limits.id.length >= 2, `${o.id}: butuh minimal 2 batas`);
      for (const l of [...o.limits.id, ...o.limits.en]) assert.ok(l.trim().length > 10, o.id);
    }
  });

  it('makes no availability promises, in any text or in the page notice', () => {
    const all = SUPPORT_OPTIONS.flatMap((o) => [
      o.summary.id, o.summary.en, o.hours.id, o.hours.en, ...o.limits.id, ...o.limits.en,
    ]);
    all.push(SUPPORT_OPTIONS_NOTICE.id, SUPPORT_OPTIONS_NOTICE.en);
    for (const text of all) assert.doesNotMatch(text, PROMISES, text);
    assert.match(SUPPORT_OPTIONS_NOTICE.id, /tidak menjamin/);
    assert.match(SUPPORT_OPTIONS_NOTICE.en, /cannot guarantee/);
  });

  it('claims 24 hours only for the OJK phone line, which its official source states', () => {
    for (const o of SUPPORT_OPTIONS) {
      const hours = `${o.hours.id} ${o.hours.en}`;
      const claims24 = /24/.test(hours) && !/bukan 24|not 24/i.test(hours);
      assert.equal(claims24, o.id === 'ojk-157', o.id);
    }
  });

  it('keeps unverified facts out: Healing119 WhatsApp number, KPAI entry', () => {
    const healing = SUPPORT_OPTIONS.find((o) => o.id === 'healing119-kemenkes');
    assert.equal(healing.whatsapp, undefined);
    assert.equal(healing.phone, '119 ext 8');
    assert.ok(!SUPPORT_OPTIONS.some((o) => o.id === 'kpai-pengaduan'));
  });
});

