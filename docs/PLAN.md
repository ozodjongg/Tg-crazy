# Tg-crazy: kuchaytirilgan Telegram klienti — tahlil va reja

> Holat: 2026-yil noyabr. Hujjat ikki qismdan iborat: (1) Telegram API ustida qurilgan mashhur
> ilovalar tahlili — ular nima qilgan va nega aynan shunday qilgan; (2) shulardan olingan
> xulosalar asosidagi mahsulot va texnik reja (§5 — Next.js yo'nalishi).
>
> Ishonchlilik haqida: arxitektura va litsenziya ma'lumotlari loyihalarning ochiq kodiga
> asoslangan. Yopiq kodli ilovalar (iMe, Turrit, Nicegram'ning bir qismi) haqidagi funksiyalar
> ularning o'z do'kon sahifalaridan olingan — mustaqil tekshirilmagan. API shartlari bo'limini
> ish boshlashdan oldin [asl matn](https://core.telegram.org/api/terms) bilan solishtirish shart.

---

## 1. Telegram API qatlamlari — nima ustiga qurish mumkin

| Qatlam | Nima | Kim ishlatadi | Biz uchun |
|---|---|---|---|
| **MTProto API** | To'liq klient protokoli, `api_id`/`api_hash` bilan | Barcha klientlar | Asos |
| **TDLib** | Rasmiy C++ kutubxona: tarmoq, shifrlash, lokal baza, update tartibi tayyor. Boost litsenziyasi | Telegram X, Unigram, kichik klientlar | UI ni noldan yozmoqchi bo'lsak |
| **Rasmiy klient kodi** | Android (Java, GPLv2), iOS (Swift, GPLv2), Desktop (C++/Qt, GPLv3), Web A/K (TS, GPLv3) | Modlarning ~90% i fork | Eng tez yo'l |
| **Userbot kutubxonalari** | Telethon, Pyrogram forklari, GramJS, mtcute, gotd | Avtomatlashtirish, ko'priklar | Server tomonidagi yordamchi xizmatlar uchun |
| **Bot API / Mini Apps** | HTTP API, WebApp | Botlar | Klient ichidagi qo'shimcha xizmatlar (AI bot va h.k.) |

---

## 2. Mashhur ilovalar tahlili

### 2.1. Rasmiy va yarim-rasmiy klientlar

| Ilova | Asos | Kuchli tomoni | Nega shunday |
|---|---|---|---|
| **Telegram Android** | O'z MTProto (tgnet, C++) + Java UI | Barcha funksiyalar birinchi shu yerda | Monolit, 10+ yillik kod; forklash oson, o'zgartirish qiyin |
| **Telegram X** | TDLib | Silliq animatsiya, tezlik, imo-ishoralar | TDLib "klientni 1 yilda bir kishi yoza olishini" isbotlash uchun qilingan; narxi — yangi funksiyalar kech keladi |
| **Unigram** | TDLib + C#/WinUI | Windows'da native his | TDLib tufayli kichik jamoa to'liq klientni ushlab turadi |
| **Web A / Web K** | TypeScript, brauzerda MTProto | O'rnatishsiz ishlaydi | Tanlov orqali tug'ilgan ikki mustaqil kod bazasi |

**Xulosa:** TDLib = toza arxitektura, lekin butun UI ni o'zing yozasan va rasmiy klientdan ortda
qolasan. Fork = hamma funksiya darhol bor, lekin har bir upstream relizni merge qilish kerak.

### 2.2. Android forklari (eng katta ekotizim)

| Ilova | Nima bilan mashhur | Nega foydalanuvchi tanlaydi | Bizga saboq |
|---|---|---|---|
| **Plus Messenger** | Chat tablari (Telegram'da papkalar paydo bo'lishidan oldin), mavzular, ko'p akkaunt | Rasmiy klientda yo'q narsani birinchi bo'lib bergan | Rasmiy klient bo'shlig'ini birinchi to'ldirgan yutadi — lekin Telegram keyin o'zi qo'shadi, ustunlik vaqtinchalik |
| **Graph Messenger (Telegraph)** | Yuklab olish menejeri, yashirin chatlar, ovoz o'zgartirgich, chizish | "Hammasi bitta joyda" | Funksiya ko'pligi sotadi, lekin UI tartibsizlashadi |
| **Nekogram → NekoX → Nagram** | Mayda sozlamalar, o'rnatilgan tarjimon tanlovi, proksi boshqaruvi, OpenPGP | Nazoratni yaxshi ko'radigan power-user'lar | Har bir o'zgartirishni alohida "toggle" qilish — forklarning standart naqshi |
| **exteraGram** | Material You dizayni, toza UI, plaginlar tizimi | Chiroyli + yengil; plaginlar orqali kengayadi | **Plagin tizimi** — funksiyani o'zing yozmasdan hamjamiyatga yozdirish yo'li |
| **AyuGram** (exteraGram asosida; Desktop ham bor) | Ghost mode, o'chirilgan xabarlar va tahrir tarixi, lokal Premium ko'rinishi | Maxfiylik/"ko'rinmaslik" | Eng katta talab aynan shu yerda — va aynan shu API shartlarini buzadi (§3) |
| **Cherrygram, Octogram** | Kustomizatsiya, kamera (CameraX), maxfiylik sozlamalari, AI funksiyalar | Nagram'dan soddaroq, zamonaviyroq | O'rta yo'l: kam, lekin sayqallangan sozlamalar |
| **Forkgram** | Minimal o'zgartirishlar | Rasmiy klientga eng yaqin, tez yangilanadi | Kam patch = oson merge = tez reliz |
| **Mercurygram, Telegram-FOSS** | Google xizmatlarisiz, F-Droid | Ochiq kod tarafdorlari | Reproducible/de-googled build — ishonch manbai |
| **iMe** | AI yordamchi (bir nechta LLM), kripto hamyon, avto-saralash, ko'p akkaunt | "Super-app" | AI va hamyon — pul ishlash modeli; yopiq qismlari ishonchga putur yetkazadi |
| **Turrit** | Ko'p funksiyali, sodda | Qulay o'rnatish (do'konda bor) | Do'konda bo'lish = ommaviy auditoriya |

### 2.3. iOS

| Ilova | Nima bilan mashhur | Saboq |
|---|---|---|
| **Nicegram** | Ko'p akkaunt, AI yordamchi, Web3 hamyon, App Store'da | iOS'da sideload qiyin — App Store qoidalariga mos kelgan yutadi. Ma'lumot yig'ish bo'yicha tanqidlar bo'lgan → shaffoflik muhim |
| **Swiftgram** | Toza, ochiq kodli, ko'p mayda sozlama (hikoyalarni yashirish, tablar va h.k.) | "Bezovta qiluvchi narsalarni o'chirish" — eng arzon va eng qadrlanadigan funksiyalar toifasi |

### 2.4. Desktop

| Ilova | Nima bilan mashhur |
|---|---|
| **64Gram, Forkgram Desktop** | Kichik qulayliklar, cheklovlarni yumshatish |
| **AyuGram Desktop** | Android'dagi bilan bir xil to'plam |
| **Materialgram** | Material dizayn |
| **Kotatogram** | Eng birinchi kustom desktop; upstream'dan ortda qolib so'ngan — **merge yuki loyihani o'ldirishi mumkin** |

### 2.5. Klient bo'lmagan, lekin muhim ekotizim

- **Beeper / mautrix-telegram** — Telegram'ni boshqa messenjerlar bilan bitta oynaga yig'adi. Saboq: "yagona inbox" g'oyasiga talab bor.
- **Userbot'lar (Telethon va b.)** — avto-javob, rejalashtirish, eksport, filtrlash. Saboq: bu funksiyalarni klient ichiga UI bilan olib kirish mumkin.
- **AI botlar va Mini Apps** — xulosa qilish, transkripsiya, tarjima. Saboq: AI ni klientga chuqur integratsiya qilish botdan qulayroq.

### 2.6. Salbiy misol: Telega (2026)

2026-yil mart oyida texnik tahlil Telega klientida trafikni ushlab qolish (MITM) imkoniyatini
ko'rsatdi; shundan so'ng Telegram norasmiy klient foydalanuvchilarini suhbatdoshlarga belgilab
ko'rsatishni boshladi, Apple esa ilovani do'kondan olib tashladi. Belgining barcha norasmiy
klientlarga yoki faqat ishonchsizlariga qo'yilishi hali aniq emas.

**Saboq:** (a) norasmiy klientga ishonch endi asosiy raqobat maydoni; (b) trafikni o'z
serverimiz orqali o'tkazish, qo'shimcha kalitlar, yopiq kod — loyihani tugatadi; (c) foydalanuvchi
profilida "norasmiy klient" belgisi chiqishi ehtimolini mahsulot xavfi sifatida hisobga olish kerak.

---

## 3. Qizil chiziqlar: Telegram API shartlari

[API Terms of Service](https://core.telegram.org/api/terms) bo'yicha asosiy talablar
(xotiradan qisqartirilgan — asl matnni tekshiring):

1. **O'z `api_id`** — rasmiy klientnikini ishlatish mumkin emas.
2. **Brend** — nomda "Telegram" faqat "Unofficial" bilan; rasmiy logotip ishlatilmaydi.
3. **Asosiy funksiyalarga aralashmaslik** — taqiqlangan: foydalanuvchi bilmagan holda uning nomidan
   harakat qilish; o'z-o'zidan yo'qoladigan kontentni saqlab qolish; "last seen"/online holatini
   buzish; o'qilganlik belgisini soxtalashtirish (**"ghost mode" aynan misol qilib keltirilgan**);
   "yozmoqda" holatini yashirish.
4. **Reklama** — rasmiy sponsorlik xabarlarini ko'rsatish majburiy (2022-yildan).
5. **Premium** — pullik funksiyalarni bepul ochib berish mumkin emas.
6. **Monetizatsiya** — usullarni ochiq e'lon qilish kerak.
7. **Litsenziya** — rasmiy klient forki GPL: o'z kodimizni ham ochishimiz shart.
8. Norasmiy klient orqali kirgan akkauntlar avtomatik kuzatuvga olinadi; buzilish `api_id` ni
   o'chirishga olib keladi — bu butun ilovaning o'limi.

**Qaror (tavsiya):** ghost mode, self-destruct mediani saqlash, reklamani bloklash va lokal
"bepul Premium" **qilinmaydi**. Bular AyuGram'ning asosiy jozibasi, lekin ular `api_id` ni va
foydalanuvchilar akkauntini xavf ostiga qo'yadi hamda do'konlarga kirishni yopadi.
O'chirilgan xabarlar tarixi — kulrang zona; MVP'ga kirmaydi, keyin alohida ko'rib chiqiladi.

---

## 4. Yig'ilgan foyda: nima olamiz, kimdan

| # | Funksiya | Kimdan | ToS | Faza |
|---|---|---|---|---|
| 1 | Har bir o'zgartirish uchun toggle'li yagona sozlamalar markazi | Nagram, Swiftgram | ✅ | 1 |
| 2 | Bezovtalikni o'chirish: hikoyalar, Premium takliflari, animatsiyalar, tasdiqlash oynalari | Swiftgram, Cherrygram | ✅ | 1 |
| 3 | Zamonaviy dizayn (Material You, dinamik ranglar, ikonka to'plamlari) | exteraGram, Materialgram | ✅ | 1 |
| 4 | Xabar tafsilotlari (ID, DC, fayl ma'lumoti), muallifsiz forward, tez amallar | Nekogram oilasi, 64Gram | ✅ | 1 |
| 5 | Papka/tab kustomizatsiyasi, pastki navigatsiya | Plus, Octogram | ✅ | 1 |
| 6 | Tarjimon tanlovi (provayder tanlash, chat ichida avto-tarjima) | Nagram | ✅ | 1 |
| 7 | **O'zbekcha lotin↔kirill o'girish** (xabarni o'qishda va yozishda) | — (bizning farqimiz) | ✅ | 1 |
| 8 | Yuklab olish menejeri (navbat, pauza, tezlik) | Graph | ✅ | 2 |
| 9 | Chatlarni qulflash/yashirish (biometriya, ikkinchi parol) | Graph, Plus | ✅ | 2 |
| 10 | Ko'proq akkaunt | Nicegram, iMe | ⚠️ limitni tekshirish | 2 |
| 11 | AI: o'qilmaganlar xulosasi, ovozli xabar matni, javob qoralamasi, aqlli qidiruv | iMe, Nicegram, Octogram | ✅ (ma'lumot shaffofligi bilan) | 2 |
| 12 | Lokal filtrlar: kalit so'z/regex bo'yicha xabar va kanallarni yashirish | AyuGram, userbot'lar | ✅ (reklamaga tegmasa) | 2 |
| 13 | Proksi boshqaruvi (avto-tanlash, ping) | Nagram | ✅ | 2 |
| 14 | Sozlamalarni eksport/import, zaxira | Nagram, Cherrygram | ✅ | 2 |
| 15 | Plagin tizimi | exteraGram | ✅ (plaginlar ham ToS'ga bo'ysunadi) | 3 |
| 16 | Avtomatlashtirish UI: rejali xabarlar shablonlari, avto-javob qoidalari | userbot'lar | ⚠️ "foydalanuvchi roziligi bilan" | 3 |
| 17 | Google'siz build, reproducible build | Mercurygram, Telegram-FOSS | ✅ | 3 |
| ✗ | Ghost mode, self-destruct saqlash, reklama bloklash, lokal Premium | AyuGram va b. | ❌ | — |

Jadvaldagi "Faza" ustuni avvalgi (fork) rejaga tegishli; amaldagi taqsimot §5.4 da.

**Pozitsiya:** "AyuGram'dek kuchli, lekin akkauntingni xavfga qo'ymaydi va ochiq" —
toza dizayn (exteraGram) + nazorat (Nagram) + AI (iMe) + to'liq ochiq kod va shaffoflik
(Telega'ga qarshi javob) + o'zbek auditoriyasi uchun mahalliy funksiyalar.

---

## 5. Texnik reja

> 2026-11-11 da yangilandi. Egasining qarori: kod to'liq AI yordamida yoziladi, platforma —
> **Next.js**, auditoriya — **O'zbekiston**. Avvalgi "rasmiy Android klientini fork qilish"
> tavsiyasi bekor qilindi.

### 5.1. Asos

| Qaror | Tanlov | Sabab |
|---|---|---|
| MTProto kutubxonasi | `@mtcute/web` (MIT) | TypeScript, brauzer uchun tayyor: WebSocket transport, IndexedDB sessiya, WASM kripto |
| Next.js rejimi | App Router, `output: 'export'` (to'liq statik) | Sessiya va xabarlar bizning serverdan o'tmaydi (§2.6 sabog'i); `out/` ni istalgan qobiqqa o'rash mumkin |
| Boshqa OS'larga chiqish | PWA → Tauri (Windows/macOS/Linux) → Capacitor (Android/iOS) | Bitta kod bazasi |
| UI / holat | Tailwind CSS, Zustand | Yengil, AI bilan yozishga qulay |
| Til | o'zbek (lotin) asosiy; rus/ingliz keyin | Auditoriya |

Fork bo'lmagani uchun GPL majburiyati yo'q, lekin GPL forklardan **kod ko'chirib bo'lmaydi** —
§4 dagi funksiyalar g'oya sifatida olinadi va noldan yoziladi.

### 5.2. Bu tanlovning narxi

- Hamma funksiyani o'zimiz yozamiz: papkalar, media, stikerlar, reaksiyalar, qidiruv va h.k.
  rasmiy klientdagi kabi "tayyor" kelmaydi. §4 dagi funksiyalardan oldin asosiy messenjer
  imkoniyatlarini yetkazish kerak.
- Veb-qobiq cheklovlari: ovozli/video qo'ng'iroqlar va maxfiy (E2E) chatlar murakkab; fon
  bildirishnomalari uchun mobilda native plagin kerak bo'ladi.
- `api_id`/`api_hash` klient kodida ochiq turadi — bu barcha Telegram klientlarida shunday,
  lekin ularni o'g'irlab suiiste'mol qilishsa, javobgarlik bizning `api_id` ga tushadi.

### 5.3. Qoidalar

- Hech qanday o'z serverimiz orqali Telegram trafigi yo'q. Backend foydalanuvchini o'z botimiz
  orqali taniydi (sessiya uzatilmaydi); AI'ga nima yuborilishi foydalanuvchiga ko'rsatiladi va
  matn serverda saqlanmaydi.
- Har bir "kuchaytirish" sozlamalarda alohida o'chirib-yoqiladi.
- §3 qizil chiziqlari kod darajasida ham saqlanadi (masalan, chat ochilganda o'qilgan deb
  belgilash o'chirilmaydi).
- CI har push'da: lint, tiplar, testlar, build.

### 5.4. Yo'l xaritasi

**Faza 0 — poydevor** ✅
- [x] Next.js skeleti, statik eksport, CI
- [x] Telegram qatlami (`src/lib/telegram/`): kirish (telefon → kod → 2FA), chatlar, tarix, matn yuborish, yangi xabarlar
- [x] Asosiy interfeys: chatlar ro'yxati + xabarlar oynasi, mobil ko'rinish, och/to'q mavzu
- [x] Lotin↔kirill o'girish (xabarda, yozish maydonida, qidiruvda)
- [ ] **Egasi:** `my.telegram.org` da `api_id`/`api_hash` olish va haqiqiy akkaunt bilan sinash
- [ ] **Egasi:** API shartlarini to'liq o'qish; ilova nomi va ikonkasini tanlash

**Faza 1a — asosiy messenjer + backend** ✅ (kod yozilgan; Telegram bilan haqiqiy sinov kutilmoqda)
- [x] Javob berish, tahrirlash, o'chirish, uzatish, reaksiyalar; tarixni varaqlash
- [x] Rasmlarni ko'rish; fayl/video/ovozni yuklab olish; fayl yuborish
- [x] O'qilganlik, "yozmoqda", onlayn holati — jonli; Telegram papkalari
- [x] Go backend (`backend/`): bot orqali tasdiqlash, tariflar va obuna holati, sozlamalar sinxroni, AI (xulosa, tarjima, javob qoralamasi) kunlik limit bilan
- [ ] **Egasi:** `api_id`/`api_hash`; BotFather'da bot va tokeni; Gemini yoki Anthropic API kaliti; Pro tarifi narxi

**Faza 1b — messenjerni to'ldirish**
- Stikerlar/GIF/emoji paneli, ovozli xabar yozish, albomlar
- Global qidiruv, chat ichida qidiruv, profil va guruh ma'lumoti/boshqaruvi
- Bildirishnomalar, arxiv ko'rinishi, qoralamalar, ko'p akkaunt
- Rasmiy sponsorlik xabarlarini ko'rsatish (§3, 4-band)
- Sozlamalar ekrani; PWA (o'rnatish, oflayn qobiq)
- Keyinroq: hikoyalar, qo'ng'iroqlar, maxfiy chatlar

**Faza 2 — kuchaytirishlar** (§4 jadvalidan)
- Bezovtalikni o'chirish, xabar tafsilotlari, muallifsiz forward, tab/papka kustomizatsiyasi
- AI: ovozli xabar matni, aqlli qidiruv (xulosa, tarjima va qoralama Faza 1a da qilingan)
- Lokal filtrlar, chat qulfi, ko'p akkaunt

**Faza 3 — boshqa OS'lar**
- Tauri (desktop), Capacitor (Android/iOS), native bildirishnomalar
- Google Play / App Store talablari

**Faza 4 — o'sish va monetizatsiya**
- To'lov tizimlari (Click/Payme) ni `backend/internal/billing` interfeysiga ulash; hozircha obuna qo'lda beriladi
- Telegram Premium funksiyalarini sotish yoki ochish — yo'q (§3)

### 5.5. Xavflar

| Xavf | Ehtimol | Yumshatish |
|---|---|---|
| Hajm: to'liq klientni noldan yozish | Yuqori | Faza 1 ni qat'iy ustuvorlik bilan; har funksiya — alohida kichik PR |
| `api_id` bloklanishi | Past (ToS'ga rioya qilsak) | §3 qizil chiziqlari |
| "Norasmiy klient" belgisi foydalanuvchilarni cho'chitishi | O'rta | Ochiq kod, serversiz arxitektura |
| `@mtcute` ga bog'liqlik (0.x versiya, kichik jamoa) | O'rta | Kutubxona faqat `src/lib/telegram/` ichida ishlatiladi — almashtirish mumkin |
| AI yozgan kodning sifati | O'rta | Testlar, tiplar, CI; har o'zgarishni haqiqiy akkauntda sinash |

---

## 6. Ochiq qarorlar

1. **Monetizatsiya** — "loyihadan foydalanish" deganda pullik obuna nazarda tutilganmi, yoki
   boshqa narsa? Faza 4 gacha ta'sir qilmaydi, lekin Faza 2 da AI narxini kim to'lashini belgilaydi.
2. **Qizil chiziqlar** — ghost mode va shunga o'xshashlardan voz kechish tavsiya etilgan va
   kodda shunday qilingan. E'tiroz bo'lsa, hozir aytish kerak.
3. **Kod ochiqligi** — ochiq repozitoriy ishonchni oshiradi (§2.6); yopiq qoldirish ham mumkin.

---

## Manbalar

- [Telegram API Terms of Service](https://core.telegram.org/api/terms)
- [Creating your Telegram Application (api_id)](https://core.telegram.org/api/obtaining_api_id)
- [Telegram Applications — rasmiy va ochiq kodli klientlar ro'yxati](https://telegram.org/apps)
- [TDLib – Build Your Own Telegram](https://telegram.org/blog/tdlib)
- [Meduza: Telegram now flags accounts using unofficial versions of the app (2026-04-06)](https://meduza.io/en/news/2026/04/06/telegram-now-flags-accounts-using-unofficial-versions-of-the-app)
- [Meduza: Apple warns that Telega contains malicious code (2026-04-17)](https://meduza.io/en/news/2026/04/17/report-apple-warns-russian-iphone-users-that-unofficial-telegram-client-telega-contains-malicious-code)
- [SecurityLab: Сторонние клиенты Telegram в 2026 году](https://www.securitylab.ru/analytics/570086.php)
- [Sponsorlik xabarlari talabi (rozetked, 2021)](https://rozetked.me/news/20631-telegram-otklyuchit-storonnie-klienty-kotorye-ne-podderzhivayut-oficial-nye-reklamnye-soobscheniya)
- [iMe — Google Play sahifasi](https://play.google.com/store/apps/details?id=com.iMe.android)
- [Telegram API: Bot API vs MTProto vs TDLib](https://macmyths.com/telegram-api-libraries-bot-api-tdlib-and-mtproto-compared/)
- [mtcute — TypeScript MTProto kutubxonasi](https://github.com/mtcute/mtcute)
