# Tg-crazy

O'zbekiston uchun kuchaytirilgan norasmiy Telegram klienti. Next.js'da yozilgan, to'liq
brauzerda ishlaydi: sessiya faqat qurilmada saqlanadi va to'g'ridan-to'g'ri Telegram
serverlariga ulanadi.

- [Tahlil va reja](docs/PLAN.md) — mashhur Telegram klientlari tahlili, API shartlari, yo'l xaritasi.

![Ko'rinish](docs/img/preview.png)

## Hozir nima bor

Kirish va xabar almashish hali haqiqiy akkauntda sinalmagan — buning uchun `api_id` kerak
(pastga qarang). Interfeys va lotin↔kirill o'girish tekshirilgan.

- Kirish: telefon → kod → ikki bosqichli parol
- Chatlar ro'yxati (qidiruv lotin/kirillga bog'liq emas), xabarlar tarixi, matn yuborish, yangi xabarlar
- Lotin ↔ kirill o'girish: butun chat, alohida xabar yoki yozish maydoni uchun (`Aa↔Аа` tugmasi)
- Lokal papkalar: Hammasi / Shaxsiy / Guruhlar / Kanallar
- Mobil ko'rinish; mavzu: tizim / och / to'q (menyudan)
- Dizayn: Telegram Web tuzilmasi, iliq krem va "clay" ranglar palitrasi

## Ishga tushirish

1. <https://my.telegram.org> → *API development tools* da ilova yarating, `api_id` va `api_hash` oling.
2. Sozlang va ishga tushiring:

   ```bash
   cp .env.example .env.local   # ikkala qiymatni to'ldiring
   npm install
   npm run dev                  # http://localhost:3000
   ```

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Ishlab chiqish serveri |
| `npm run build` | Statik build → `out/` |
| `npm run lint` / `npm run typecheck` / `npm test` | Tekshiruvlar |

## Tuzilma

- `src/lib/telegram/` — Telegram bilan ishlash (`@mtcute/web`); kutubxona faqat shu yerda ishlatiladi
- `src/lib/translit/` — lotin ↔ kirill
- `src/store/` — ilova holati (Zustand)
- `src/components/` — interfeys
