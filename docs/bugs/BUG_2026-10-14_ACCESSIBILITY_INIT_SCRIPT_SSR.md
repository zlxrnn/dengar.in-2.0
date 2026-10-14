# Laporan Bug: Kebocoran Pesan Error Client Component pada Inisialisasi SSR (ACCESSIBILITY_INIT_SCRIPT)

- **ID Bug**: `BUG-20261014-01`
- **Tanggal Ditemukan**: 14 Oktober 2026
- **Komponen Terdampak**: `apps/web/src/app/layout.tsx` & `apps/web/src/components/ui/AccessibilityMenu.tsx`
- **Tingkat Keparahan**: Sedang (Medium) — Fungsionalitas aksesibilitas awal terhambat dan mencemari HTML `<head>` dengan error runtime Next.js.
- **Status**: Teridentifikasi / Menunggu Penerapan Perbaikan

---

## 1. Ringkasan Masalah

Saat aplikasi web Next.js dijalankan di dalam container Docker dan diakses pada rute utama (`GET http://localhost:3000/`), tag `<head><script>` yang seharusnya mengeksekusi script inisialisasi preferensi aksesibilitas pengguna sebelum render justru memuat string fungsi pelempar error internal Next.js:

```javascript
(function(){try{var m=document.cookie.match(/(?:^|;\s*)dengarin-lang=(id|en)(?:;|$)/);if(m&&m[1]!=='id')document.documentElement.lang=m[1];}catch(e){}})();function(){throw Error("Attempted to call ACCESSIBILITY_INIT_SCRIPT() from the server but ACCESSIBILITY_INIT_SCRIPT is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")}
```

Script inisialisasi bahasa (`LANGUAGE_INIT_SCRIPT`) berhasil dieksekusi, namun segera setelahnya diikuti oleh kode throw error yang membatalkan inisialisasi gaya aksesibilitas di browser.

---

## 2. Analisis Akar Masalah (Root Cause)

1. **Arsitektur React Server Components (RSC) vs Client Component**:
   - `apps/web/src/app/layout.tsx` adalah **Server Component** (tanpa direktif `'use client'`).
   - `apps/web/src/components/ui/AccessibilityMenu.tsx` dideklarasikan sebagai **Client Component** dengan baris pertama: `'use client';`.
2. **Impor Nilai Non-Komponen Lintas Batas Server-Client**:
   - Di [layout.tsx:7](file:///Users/shine/Documents/Shine's%20Personal%20Folder/Code/Tel-U/Denger.in-Web-Project/apps/web/src/app/layout.tsx#L7), script mengimpor konstanta string `ACCESSIBILITY_INIT_SCRIPT`:
     ```typescript
     import { ACCESSIBILITY_INIT_SCRIPT } from '@/components/ui/AccessibilityMenu';
     ```
   - Di [layout.tsx:65](file:///Users/shine/Documents/Shine's%20Personal%20Folder/Code/Tel-U/Denger.in-Web-Project/apps/web/src/app/layout.tsx#L65), variabel ini digabungkan menggunakan operator konkatenasi string `+`:
     ```tsx
     <script dangerouslySetInnerHTML={{ __html: LANGUAGE_INIT_SCRIPT + ACCESSIBILITY_INIT_SCRIPT }} />
     ```
3. **Mekanisme Bundler Next.js**:
   - Pada Next.js App Router, setiap ekspor dari berkas bertanda `'use client'` yang diimpor oleh Server Component diubah oleh bundler menjadi fungsi proksi *Client Reference*.
   - Saat Server Component mencoba membaca nilai tersebut sebagai string biasa melalui `LANGUAGE_INIT_SCRIPT + ACCESSIBILITY_INIT_SCRIPT`, JavaScript melakukan pemanggilan implisit `.toString()` pada fungsi proksi tersebut, menghasilkan teks fungsi fallback bawaan Next.js: `function(){throw Error("Attempted to call ACCESSIBILITY_INIT_SCRIPT() from the server...")}`.

---

## 3. Dampak (Impact)

1. **Kegagalan Inisialisasi Aksesibilitas**: Preferensi pengguna yang tersimpan di `localStorage` (seperti skala ukuran teks `textScale`, kontras tinggi, animasi dikurangi, garis bawah tautan) tidak diterapkan ke elemen `document.documentElement` sebelum halaman dirender.
2. **Layout Shift / Flash of Unstyled Content (FOUC)**: Jika pengguna menyetel teks besar (misal 125% atau 140%), halaman akan berkedip dari ukuran normal ke ukuran besar setelah komponen klien di-mount.
3. **Pencemaran Log Konsol Browser**: Browser mengeksekusi script cacat pada header yang memicu peringatan/error parsing di konsol.

---

## 4. Rencana Solusi (Proposed Fix)

Pindahkan konstanta storage key, daftar toggle, dan script inisialisasi ke dalam berkas utilitas terpisah yang **bebas dari direktif `'use client'`**, mirip seperti implementasi `LANGUAGE_INIT_SCRIPT` pada [apps/web/src/i18n/language.ts](file:///Users/shine/Documents/Shine's%20Personal%20Folder/Code/Tel-U/Denger.in-Web-Project/apps/web/src/i18n/language.ts).

Contoh struktur berkas baru `apps/web/src/lib/accessibilityInit.ts`:

```typescript
export const ACCESSIBILITY_STORAGE_KEY = 'dengarin:aksesibilitas';

export const ACCESSIBILITY_TOGGLES = [
  { key: 'contrast', className: 'a11y-high-contrast' },
  { key: 'underline', className: 'a11y-underline-links' },
  { key: 'spacing', className: 'a11y-readable-spacing' },
  { key: 'reduceMotion', className: 'a11y-reduce-motion' },
] as const;

export const ACCESSIBILITY_INIT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('${ACCESSIBILITY_STORAGE_KEY}')||'null');if(!s)return;var r=document.documentElement;if(s.textScale&&s.textScale!==100){r.style.fontSize=s.textScale+'%';r.classList.add('a11y-scaled','a11y-scale-'+Math.floor(s.textScale));}${ACCESSIBILITY_TOGGLES.map(
  (t) => `if(s.${t.key})r.classList.add('${t.className}');`
).join('')}}catch(e){}})();`;
```

Kemudian `layout.tsx` dan `AccessibilityMenu.tsx` keduanya mengimpor konstanta tersebut dari `apps/web/src/lib/accessibilityInit.ts`.

