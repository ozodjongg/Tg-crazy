# Tg-crazy

O'zbekiston uchun kuchaytirilgan norasmiy Telegram klienti. Next.js'da yozilgan, to'liq
brauzerda ishlaydi: sessiya faqat qurilmada saqlanadi va to'g'ridan-to'g'ri Telegram
serverlariga ulanadi.

- [Tahlil va reja](docs/PLAN.md) — mashhur Telegram klientlari tahlili, API shartlari, yo'l xaritasi.

![Ko'rinish](docs/img/preview.png)

## Hozir nima bor

Telegram bilan haqiqiy almashinuv hali sinalmagan — buning uchun `api_id` kerak (pastga qarang).
Interfeys namunaviy ma'lumot bilan, backend esa testlar va lokal server bilan tekshirilgan.

**Messenjer**
- Kirish: telefon → kod → ikki bosqichli parol
- Chatlar: Telegram'dagi papkalaringiz (bo'lmasa — Shaxsiy / Guruhlar / Kanallar), qidiruv lotin/kirillga bog'liq emas
- Xabarlar: yuborish, javob berish, tahrirlash, o'chirish, uzatish, reaksiyalar; tarixni yuqoriga varaqlash
- Media: rasmlarni ko'rish, fayl/video/ovozli xabarni yuklab olish va ijro etish; fayl yuborish (📎 yoki sudrab tashlash)
- Jonli: yangi xabarlar, tahrir va o'chirishlar, o'qilganlik (✓✓), "yozmoqda…", onlayn holati

**O'zimizniki**
- Lotin ↔ kirill o'girish: butun chat, alohida xabar yoki yozish maydoni uchun
- AI (backend ulangan bo'lsa): suhbat xulosasi, xabar tarjimasi, javob qoralamasi — har safar nima yuborilishi ko'rsatiladi
- Sozlamalar sinxroni (mavzu, AI tili) qurilmalar orasida
- Mavzu: tizim / och / to'q; mobil ko'rinish

## Ishga tushirish

1. <https://my.telegram.org> → *API development tools* da ilova yarating, `api_id` va `api_hash` oling.
2. Sozlang va ishga tushiring:

   ```bash
   cp .env.example .env.local   # api_id va api_hash ni to'ldiring
   npm install
   npm run dev                  # http://localhost:3000
   ```

Backend ixtiyoriy (AI, obuna, sozlamalar sinxroni) — [backend/README.md](backend/README.md).
Ishga tushirgach, `.env.local` ga `NEXT_PUBLIC_API_URL=http://localhost:8080` qo'shing.

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Ishlab chiqish serveri |
| `npm run build` | Statik build → `out/` |
| `npm run lint` / `npm run typecheck` / `npm test` | Tekshiruvlar |

## Tuzilma

- `src/lib/telegram/` — Telegram bilan ishlash (`@mtcute/web`); kutubxona faqat shu yerda ishlatiladi
- `src/lib/translit/` — lotin ↔ kirill
- `src/lib/backend/` — Tg-crazy backend klienti
- `src/store/` — ilova holati (Zustand): `app.ts` — messenjer, `services.ts` — backend xizmatlari
- `src/components/` — interfeys
- `backend/` — Go xizmati (akkaunt/obuna, AI, sozlamalar)
