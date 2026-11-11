# Tg-crazy backend

Go xizmati: akkaunt va obuna, sozlamalar sinxroni, AI funksiyalar.

**Telegram sessiyasi va yozishmalar bu yerga kelmaydi.** Backend faqat quyidagilarni ko'radi:
foydalanuvchining Telegram ID si va ismi, Tg-crazy sozlamalari, hamda foydalanuvchi AI uchun
o'zi yuborgan matn (u saqlanmaydi va logga yozilmaydi — faqat hisoblagich yuritiladi).

## Ishga tushirish

```bash
docker compose up -d          # Postgres
cp .env.example .env          # JWT_SECRET ni to'ldiring; BOT_TOKEN va AI kalitlari ixtiyoriy
make run                      # migratsiyalar avtomatik bajariladi
```

Testlar haqiqiy Postgres bilan ishlaydi (`tgcrazy_test` bazasi kerak): `make test`.

## Foydalanuvchini tasdiqlash

1. Klient `POST /v1/auth/start` → `nonce`, `secret`, `bot_username`.
2. Foydalanuvchi roziligi bilan klient uning akkauntidan botga `/start <nonce>` yuboradi.
3. Bot xabardan Telegram ID ni oladi va nonce'ni tasdiqlaydi (faqat shaxsiy chatda).
4. Klient `POST /v1/auth/complete` (`nonce` + `secret`) → `202` (kutilmoqda) yoki tokenlar.

`secret` faqat klientda qoladi, shuning uchun nonce'ni ko'rib qolgan begona kira olmaydi.

## API

| Yo'l | Vazifa |
|---|---|
| `GET /healthz` | Holat; `auth`/`ai` yoqilganmi |
| `POST /v1/auth/start`, `/complete`, `/refresh`, `/logout` | Kirish (refresh token bir martalik, aylanadi) |
| `GET /v1/me` | Foydalanuvchi, tarif, bugungi AI limiti |
| `GET/PUT /v1/settings` | JSON sozlamalar; `version` mos kelmasa `409` + amaldagi holat |
| `POST /v1/ai/summarize`, `/translate`, `/reply-draft` | AI; limit tugasa `429`, xato so'rov limitdan yechilmaydi |
| `GET /v1/billing/plans`, `/subscription` | Tariflar va amaldagi obuna |

## Obuna

To'lov tizimi (Click/Payme) hali ulanmagan — `internal/billing` da interfeys tayyor.
Hozircha obuna qo'lda beriladi:

```bash
go run ./cmd/api grant -tg 123456789 -plan pro -days 30
```

Tariflar `plans` jadvalida: bepul — kuniga 10 ta AI so'rov, Pro — 200 ta. Pro narxi belgilanmagan.

## AI

AI ikki provayderda ishlaydi — **Anthropic (Claude)** va **Google Gemini**. Qaysi biri
ishlatilishi `.env` dan sozlanadi:

| O'zgaruvchi | Vazifasi | Standart |
|---|---|---|
| `AI_PROVIDER` | `auto`, `anthropic` yoki `gemini` | `auto` |
| `AI_FALLBACK` | Asosiy provayder ishlamasa ikkinchisiga o'tish (ikkala kalit bo'lsa) | `true` |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Anthropic kaliti va modeli | — / `claude-opus-5-5` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini kaliti va modeli | — / `gemini-3.6-flash` |

Misollar:

```env
# Faqat Gemini
GEMINI_API_KEY=...

# Faqat Anthropic
ANTHROPIC_API_KEY=...

# Ikkalasi: Gemini asosiy, Anthropic zaxira
AI_PROVIDER=gemini
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
```

- `AI_PROVIDER=gemini` (yoki `anthropic`) tanlansa-yu, uning kaliti bo'lmasa, server ishga
  tushmaydi va aniq xato chiqaradi. Noma'lum qiymat ham xato.
- Zaxiraga o'tish: tarmoq xatosi, limit (429), server xatosi (5xx) va noto'g'ri kalit/model
  (401/403/404) holatlarida. Model so'rovni xavfsizlik sababli rad etsa yoki so'rovning o'zi
  noto'g'ri bo'lsa (400) — o'tilmaydi.
- Qaysi provayder asosiy va qaysi zaxira ekanligi ishga tushishda logga yoziladi va
  `GET /healthz` ning `ai_provider` maydonida ko'rinadi (masalan `"gemini+anthropic"`).
- Anthropic'da model so'rovni xavfsizlik sababli rad etsa, API uni avtomatik o'z zaxira
  modelida qayta bajaradi (server-side fallback).
- Eski `AI_MODEL` o'zgaruvchisi hamon `ANTHROPIC_MODEL` o'rnida ishlaydi.

## Tuzilma

`cmd/api` — kirish nuqtasi · `internal/httpapi` — router va handlerlar · `internal/store` —
Postgres va migratsiyalar · `internal/auth` — JWT · `internal/tgbot` — bot · `internal/ai` —
promptlar va provayderlar (Claude, Gemini, zaxira zanjiri) · `internal/billing` — to'lov interfeysi.
