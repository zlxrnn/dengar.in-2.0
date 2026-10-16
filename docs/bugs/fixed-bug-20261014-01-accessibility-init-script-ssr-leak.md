# BUG-20261014-01: Kebocoran Error Client Component pada Inisialisasi SSR (`ACCESSIBILITY_INIT_SCRIPT`)

- **ID Tiket**: `BUG-20261014-01`
- **Tanggal Ditemukan**: 14 Oktober 2026
- **Status**: **TELAH DIPERBAIKI (RESOLVED)**
- **Tingkat Keparahan**: Sedang (Medium - SSR Hydration / HTML Corruption)
- **Komponen Terdampak**: `apps/web/src/app/layout.tsx`, `apps/web/src/components/ui/AccessibilityMenu.tsx`
- **Solusi Diterapkan**: Pemisahan modul inisialisasi ke `accessibilityInitScript.ts` tanpa direktif `'use client'`.

---

## 1. Gejala & Ringkasan Masalah

Saat aplikasi Next.js dirender di server (SSR), tag `<head><script>` yang ditujukan untuk menjalankan script inisialisasi preferensi aksesibilitas sebelum hidrasi DOM memuat string fungsi pelempar error internal Next.js:

```javascript
(function(){...})();function(){throw Error("Attempted to call ACCESSIBILITY_INIT_SCRIPT() from the server but ACCESSIBILITY_INIT_SCRIPT is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")}
```

Hal ini menggagalkan eksekusi inisialisasi aksesibilitas pada peramban klien, menyebabkan *layout shift* (FOUC) saat ukuran font besar diterapkan, serta mencemari log konsol browser.

---

## 2. Analisis Akar Masalah (Root Cause)

1. `apps/web/src/app/layout.tsx` adalah Server Component (tanpa direktif `'use client'`).
2. `apps/web/src/components/ui/AccessibilityMenu.tsx` adalah Client Component (`'use client'`).
3. Server Component mengimpor konstanta string `ACCESSIBILITY_INIT_SCRIPT` dari berkas bertanda `'use client'`. Bundler Next.js mengubah setiap ekspor dari Client Component menjadi fungsi proksi Client Reference.
4. Ketika Server Component menggabungkan konstanta string melalui `+`, pemanggilan implisit `.toString()` menghasilkan fungsi throwing fallback internal Next.js.

---

## 3. Solusi & Remediasi yang Diterapkan

1. Memindahkan `ACCESSIBILITY_STORAGE_KEY`, `ACCESSIBILITY_TOGGLES`, dan `ACCESSIBILITY_INIT_SCRIPT` ke berkas utilitas murni: `apps/web/src/components/ui/accessibilityInitScript.ts` (tanpa `'use client'`).
2. Mengalihkan impor pada `apps/web/src/app/layout.tsx` ke modul baru tersebut.
3. Menambahkan uji regresi statis pada `tests/infra/serverClientImports.test.mjs` yang memastikan Server Component di `app/` tidak pernah mengimpor nilai non-komponen dari modul bertanda `'use client'`.

