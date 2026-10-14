/**
 * Kunci penyimpanan dan skrip inisialisasi Akses cepat. Berkas ini SENGAJA
 * tanpa 'use client': layout.tsx (Server Component) menyisipkannya sebagai
 * string ke <head>. Bila konstanta ini diekspor dari berkas 'use client',
 * bundler Next.js menggantinya dengan proksi Client Reference sehingga <head>
 * berisi `function(){throw Error("Attempted to call ...")}` (BUG-20261014-01).
 * AccessibilityMenu.tsx memakai konstanta yang sama agar tetap satu sumber.
 */

export const ACCESSIBILITY_STORAGE_KEY = 'dengarin:aksesibilitas';

/** Toggle boolean yang dipetakan ke kelas pada <html>; urutan sama dengan menu. */
export const ACCESSIBILITY_TOGGLES = [
  { key: 'contrast', className: 'a11y-contrast' },
  { key: 'underline', className: 'a11y-underline' },
  { key: 'spacing', className: 'a11y-spacing' },
  { key: 'reduceMotion', className: 'a11y-reduce-motion' },
] as const;

// Dijalankan di <head> sebelum render agar tidak ada kedipan ukuran/warna.
export const ACCESSIBILITY_INIT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('${ACCESSIBILITY_STORAGE_KEY}')||'null');if(!s)return;var r=document.documentElement;if(s.textScale&&s.textScale!==100){r.style.fontSize=s.textScale+'%';r.classList.add('a11y-scaled','a11y-scale-'+Math.floor(s.textScale));}${ACCESSIBILITY_TOGGLES.map(
  (t) => `if(s.${t.key})r.classList.add('${t.className}');`
).join('')}}catch(e){}})();`;
