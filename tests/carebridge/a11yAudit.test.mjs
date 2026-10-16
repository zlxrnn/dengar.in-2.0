import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { crisisText } from '../../apps/web/src/i18n/pages/crisis.ts';
import { carePassportText } from '../../apps/web/src/i18n/pages/carePassport.ts';
import { commonText } from '../../apps/web/src/i18n/common.ts';
import { EMERGENCY_CONTACTS, toTelHref } from '@dengarin/config';

/**
 * Calculates standard sRGB relative luminance per WCAG 2.1 specs:
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
function srgbLuminance(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = srgbLuminance(hex1);
  const l2 = srgbLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Accessibility Audit: WCAG 2.1 AA Contrast Ratios', () => {
  const paper = '#FFF8EF';
  const surface = '#FFFFFF';

  it('ink-main (#151515) exceeds WCAG AAA (7:1) on paper and white surfaces', () => {
    const ratioPaper = contrastRatio('#151515', paper);
    const ratioWhite = contrastRatio('#151515', surface);
    assert.ok(ratioPaper >= 7.0, `Expected ink on paper to exceed 7:1, got ${ratioPaper.toFixed(2)}:1`);
    assert.ok(ratioWhite >= 7.0, `Expected ink on white to exceed 7:1, got ${ratioWhite.toFixed(2)}:1`);
  });

  it('secondary text (#59544D) and muted text (#6B665E) pass WCAG AA (4.5:1) on paper', () => {
    const ratioSecondary = contrastRatio('#59544D', paper);
    const ratioMuted = contrastRatio('#6B665E', paper);
    assert.ok(ratioSecondary >= 4.5, `Expected secondary text to exceed 4.5:1, got ${ratioSecondary.toFixed(2)}:1`);
    assert.ok(ratioMuted >= 4.5, `Expected muted text to exceed 4.5:1, got ${ratioMuted.toFixed(2)}:1`);
  });

  it('cobalt (#3357EE) text on paper passes WCAG AA (4.5:1)', () => {
    const ratio = contrastRatio('#3357EE', paper);
    assert.ok(ratio >= 4.5, `Expected cobalt text on paper to exceed 4.5:1, got ${ratio.toFixed(2)}:1`);
  });

  it('white text on cobalt button (#3357EE) passes WCAG AA (4.5:1)', () => {
    const ratio = contrastRatio('#FFFFFF', '#3357EE');
    assert.ok(ratio >= 4.5, `Expected white on cobalt to exceed 4.5:1, got ${ratio.toFixed(2)}:1`);
  });

  it('white text on emergency red (#D32F2F) passes WCAG AA (4.5:1)', () => {
    const ratio = contrastRatio('#FFFFFF', '#D32F2F');
    assert.ok(ratio >= 4.5, `Expected white on red to exceed 4.5:1, got ${ratio.toFixed(2)}:1`);
  });

  it('dark crisis text (#B3261E) on paper passes WCAG AA (4.5:1)', () => {
    const ratio = contrastRatio('#B3261E', paper);
    assert.ok(ratio >= 4.5, `Expected dark red on paper to exceed 4.5:1, got ${ratio.toFixed(2)}:1`);
  });

  it('ink text (#151515) on lime button (#B8F34A) exceeds WCAG AAA (7:1)', () => {
    const ratio = contrastRatio('#151515', '#B8F34A');
    assert.ok(ratio >= 7.0, `Expected ink on lime to exceed 7:1, got ${ratio.toFixed(2)}:1`);
  });

  it('ink text (#151515) on warning yellow (#FFD84D) exceeds WCAG AAA (7:1)', () => {
    const ratio = contrastRatio('#151515', '#FFD84D');
    assert.ok(ratio >= 7.0, `Expected ink on yellow to exceed 7:1, got ${ratio.toFixed(2)}:1`);
  });
});

describe('Accessibility Audit: Bilingual Key & Label Completeness', () => {
  function verifyKeyParity(objA, objB, path = '') {
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    for (const key of keysA) {
      const currentPath = path ? `${path}.${key}` : key;
      assert.ok(key in objB, `Missing key in target bundle: ${currentPath}`);
      if (typeof objA[key] === 'object' && objA[key] !== null && !Array.isArray(objA[key])) {
        assert.equal(typeof objB[key], 'object', `Type mismatch at ${currentPath}`);
        verifyKeyParity(objA[key], objB[key], currentPath);
      } else {
        assert.equal(typeof objA[key], typeof objB[key], `Type mismatch at ${currentPath}`);
      }
    }
  }

  it('crisisText has 100% key and function parity between Indonesian and English', () => {
    verifyKeyParity(crisisText.id, crisisText.en);
    verifyKeyParity(crisisText.en, crisisText.id);

    // Test function outputs
    assert.equal(crisisText.id.callAria('Healing 119', '119 ext 8'), 'Telepon Healing 119: 119 ext 8');
    assert.equal(crisisText.en.callAria('Healing 119', '119 ext 8'), 'Call Healing 119: 119 ext 8');
  });

  it('carePassportText has 100% section parity between Indonesian and English', () => {
    verifyKeyParity(carePassportText.id, carePassportText.en);
    verifyKeyParity(carePassportText.en, carePassportText.id);
  });

  it('commonText (navigation, footer, quickExit, a11y) has 100% parity', () => {
    verifyKeyParity(commonText.id, commonText.en);
    verifyKeyParity(commonText.en, commonText.id);
  });
});

describe('Accessibility Audit: Emergency Numbers & Dialing Telephony Safety', () => {
  it('emergency telephone 119 ext 8 parses to valid comma-paused dialable href', () => {
    const primary = EMERGENCY_CONTACTS.find((c) => c.category === 'national_emergency');
    assert.ok(primary, 'National emergency contact must be present');
    assert.equal(primary.phone, '119 ext 8');
    const href = toTelHref(primary.phone);
    assert.equal(href, 'tel:119,8');
  });
});
