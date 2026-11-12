# Telegram vizual funksiyalari — to'liq reja

Bu hujjat rasmiy Telegram ilovalaridagi (Web A/K, Desktop, mobil) foydalanuvchi ko'radigan
funksiyalarning ro'yxati va ularni Tg-crazy'da qurish tartibi. Holat belgilari:
✅ qilingan · 🟡 qisman · ⬜ hali yo'q · ⛔ qilinmaydi (Telegram API shartlari, `docs/PLAN.md` §3).

Har bosqich alohida commit; har biri lint, tiplar, testlar va brauzerda namunaviy ma'lumot bilan
tekshiriladi. Haqiqiy Telegram bilan sinov egasining `api_id` siga bog'liq.

## V1 — Xabarlarni to'liq ko'rsatish

| Funksiya | Holat |
|---|---|
| Matn formatlash: qalin, kursiv, tagiga chizilgan, o'chirilgan, `kod`, kod bloki (til bilan), iqtibos, spoiler (bosib ochiladi) | ✅ |
| Havolalar, @mention, #heshteg, e-pochta, telefon — bosiladigan | ✅ |
| Xizmat xabarlari o'zbekcha matn bilan (qo'shildi, chiqdi, nom o'zgardi, qadaldi, qo'ng'iroq…) | ✅ |
| "Uzatilgan: …" sarlavhasi, "bot orqali", kanal imzosi, ko'rishlar soni | ✅ |
| Havola prevyusi (sayt nomi, sarlavha, tavsif, rasm) | ✅ |
| Albomlar (bir nechta rasm/video panjarada) | ✅ |
| GIF va dumaloq video (avtomatik, ovozsiz takrorlanadi) | ✅ |
| Ovozli xabar to'lqin shakli bilan | ✅ |
| Stikerlar: oddiy (webp), video (webm), animatsiyali (tgs/Lottie) | ✅ |
| Stikerlar iPhone uslubida: oq kesma chegara, soya, "puffy" yaltirash, kursor bo'yicha egilish, bosilganda ko'tarilish, yangi stiker "yopishib" tushadi (chatda va tanlash panelida) | ✅ |
| So'rovnoma va viktorina: variantlar, natijalar, ovoz berish | ✅ |
| Joylashuv, manzil, kontakt kartochkalari | ✅ |
| Bot tugmalari (inline): bosish, havola ochish, javobni ko'rsatish | ✅ |
| Faqat emoji'dan iborat xabar — katta | ✅ |
| Haqiqiy avatarlar (profil rasmlari) | ✅ |

## V2 — Chatlar ro'yxati

| Funksiya | Holat |
|---|---|
| Haqiqiy avatarlar, onlayn nuqtasi, tasdiqlangan belgisi | ✅ |
| Qoralama ko'rinishi ("Qoralama: …"), "yozmoqda…" ro'yxatda | ✅ |
| @ — eslatilganlar nishoni, qo'lda "o'qilmagan" belgisi | ✅ |
| "Saqlangan xabarlar" (o'z chatingiz) | ✅ |
| Kontekst menyu: qadash, ovozsiz qilish, o'qilgan/o'qilmagan, arxivlash, o'chirish | ✅ |
| Arxiv qatori va arxiv ko'rinishi | ✅ |
| Bir nechta chatni tanlash | ⬜ |
| Sudrab tartiblash (qadalganlar) | ⬜ |

## V3 — Suhbat oynasi

| Funksiya | Holat |
|---|---|
| Qadalgan xabar paneli (bosilsa o'sha xabarga o'tadi) | ✅ |
| "O'qilmagan xabarlar" ajratgichi, birinchi o'qilmaganga ochilish | ✅ |
| Chat ichida qidiruv | ✅ |
| Profil paneli: rasm, bio/tavsif, username, telefon, a'zolar soni | ✅ |
| Profil panelida umumiy media: rasmlar, fayllar, havolalar, ovozlar | ✅ |
| Guruh a'zolari ro'yxati | ✅ |
| Xabarlarni ko'p tanlash: uzatish, o'chirish, nusxa (Esc — bekor) | ✅ |
| Forum mavzulari (topics) | ⬜ |
| Kanal izohlari (comments) | ⬜ |

## V4 — Yozish maydoni

| Funksiya | Holat |
|---|---|
| Emoji paneli (toifalar, so'nggilar) | ✅ |
| Emoji qidiruvi: panelda va yozishda `:yurak` (o'zbekcha/inglizcha, lotin/kirill) | ✅ |
| Formatlash: **qalin**, __kursiv__, `kod`, ~~o'chirilgan~~, \|\|spoiler\|\| va Ctrl+B / Ctrl+I | ✅ |
| Rasmni joylashtirish (Ctrl+V) | ✅ |
| Qoralamalarni saqlash (chat almashtirganda yo'qolmaydi, Telegram bilan sinxron) | ✅ |
| Stiker paneli (o'rnatilgan to'plamlar) | ✅ |
| Ovozsiz yuborish | ✅ |
| Vaqtga rejalashtirish va rejalashtirilgan xabarlar ro'yxati | ⬜ |
| Ovozli xabar yozish: jonli to'lqin, taymer, bekor qilish; Chrome WebM → Ogg/Opus qayta o'rash | ✅ |
| @mention (username yoki ism bilan) va bot buyruqlari avtoto'ldirish: ↑/↓, Enter/Tab, Esc | ✅ |
| GIF: saqlangan GIF'lar va qidiruv (@gif orqali), cheksiz aylantirish | ✅ |

## V5 — Ilova darajasi

| Funksiya | Holat |
|---|---|
| Global qidiruv: chatlar va xabarlar | ✅ |
| Ommaviy kanal/foydalanuvchilarni qidirish (@username) | ⬜ |
| Bildirishnomalar (brauzer), sarlavhada o'qilmaganlar soni | ✅ |
| Sozlamalar: matn o'lchami, chat foni, bildirishnomalar | ✅ |
| Rasm ko'rgichda galereya (oldingi/keyingi), saqlash | ✅ |
| Kontaktlar, yangi shaxsiy chat / guruh / kanal yaratish | ⬜ |
| Profilni tahrirlash, maxfiylik sozlamalari, faol seanslar | ⬜ |
| Ko'p akkaunt | ⬜ |

## V6 — Murakkab va keyingi

| Funksiya | Holat |
|---|---|
| Hikoyalar (stories) | ⬜ |
| Ovozli/video qo'ng'iroqlar, guruh efirlari | ⬜ (veb'da murakkab) |
| Maxfiy chatlar | ⬜ (alohida protokol) |
| Premium emoji (custom emoji) ko'rsatish | ⬜ |
| Mini Apps (bot veb-ilovalari) | ⬜ |
| Rasmiy sponsorlik xabarlari | ⬜ (majburiy, §3) |
| Ghost mode, o'qilganlikni yashirish, bepul Premium | ⛔ |
