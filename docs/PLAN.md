# Tg-crazy: kuchaytirilgan Telegram klienti — tahlil va reja

> Holat: 2026-yil noyabr. Hujjat ikki qismdan iborat: (1) Telegram API ustida qurilgan mashhur
> ilovalar tahlili — ular nima qilgan va nega aynan shunday qilgan; (2) shulardan olingan
> xulosalar asosidagi mahsulot va texnik reja.
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

**Pozitsiya:** "AyuGram'dek kuchli, lekin akkauntingni xavfga qo'ymaydi va ochiq" —
toza dizayn (exteraGram) + nazorat (Nagram) + AI (iMe) + to'liq ochiq kod va shaffoflik
(Telega'ga qarshi javob) + o'zbek auditoriyasi uchun mahalliy funksiyalar.

---

## 5. Texnik reja

### 5.1. Asos tanlovi

| Variant | + | − |
|---|---|---|
| **A. Rasmiy Telegram Android forki** | Barcha funksiyalar darhol; boshqa GPL forklardan kod olish mumkin | Java monolit; har relizda merge; GPL — kod ochiq bo'ladi |
| B. TDLib + yangi UI (Compose/KMP) | Toza arxitektura, ko'p platforma | UI ni noldan — Telegram X misolida ~1 yil; funksiyalar ortda qoladi |
| C. Web A forki | Eng tez prototip, desktop+web | Mobil auditoriya yo'q; web'da imkoniyat cheklangan |

**Tavsiya: A (Android), keyin desktop.** Maqsad — mavjud modlarning foydasini yig'ish; ular
deyarli hammasi shu kod bazasi ustida, demak ko'chirish eng arzon. B faqat katta jamoa va uzoq
muddat bo'lsa o'zini oqlaydi.

### 5.2. Fork gigiyenasi (Kotatogram taqdiridan qochish)

- Barcha o'z kodimiz alohida paketda (`uz.tgcrazy.*`); upstream fayllarga faqat bir qatorlik "hook" qo'yiladi.
- Har bir funksiya `CrazyConfig` dagi toggle ortida; o'chirilganda rasmiy xatti-harakat.
- `upstream` remote + har relizda rebase/merge; konfliktlar soni — asosiy sog'liq ko'rsatkichi.
- CI: har push'da debug build, tag'da imzolangan reliz APK.
- Hech qanday o'z serverimiz orqali trafik yo'q; tarmoq qatlami o'zgartirilmaydi.

### 5.3. Yo'l xaritasi

**Faza 0 — poydevor (1–2 hafta)**
- [ ] `my.telegram.org` da o'z `api_id`/`api_hash` olish; API shartlarini to'liq o'qish
- [ ] Rasmiy Android repozitoriyasini fork qilish, yig'ish, o'z paket nomi/nomi/ikonkasi (nomda "Telegram" yo'q)
- [ ] CI (GitHub Actions), imzolash kaliti, `upstream` sinxronlash tartibi
- [ ] `CrazyConfig` + bo'sh "Crazy sozlamalari" ekrani
- [ ] Maxfiylik siyosati va monetizatsiya bayonoti qoralamasi

**Faza 1 — MVP: qulaylik (4–6 hafta)** — jadvaldagi 1–7
- Chiqish mezoni: kundalik foydalanishga yaroqli, rasmiy klientdan ko'rinarli farq, 0 ta ToS buzilishi
- Tarqatish: GitHub Releases + o'z Telegram kanali, ilova ichida yangilanish tekshiruvi

**Faza 2 — kuch (6–10 hafta)** — jadvaldagi 8–14
- AI: foydalanuvchi o'z API kalitini kiritadi yoki bizning pullik proksi; nima qayerga
  yuborilishi har safar aniq ko'rsatiladi; maxfiy chatlar AI'ga hech qachon yuborilmaydi

**Faza 3 — platforma (3+ oy)** — jadvaldagi 15–17
- Plagin API, plaginlar katalogi; desktop (tdesktop forki) yoki iOS bo'yicha qaror

**Faza 4 — o'sish**
- Google Play (ToS'ga mos bo'lgani uchun ochiq yo'l), F-Droid
- Monetizatsiya: AI obunasi / xayriya. Premium funksiyalarni sotish yoki ochish — yo'q

### 5.4. Xavflar

| Xavf | Ehtimol | Yumshatish |
|---|---|---|
| `api_id` bloklanishi | Past (ToS'ga rioya qilsak) | §3 qizil chiziqlari; shikoyatga 10 kun ichida javob |
| "Norasmiy klient" belgisi foydalanuvchilarni cho'chitishi | O'rta | To'liq ochiq kod, reproducible build, tarmoq qatlamiga tegmaslik |
| Upstream merge yuki | Yuqori | §5.2; patch hajmini kichik tutish |
| Ghost mode'siz AyuGram bilan raqobat | Yuqori | Boshqa o'q: dizayn + AI + mahalliy funksiyalar + xavfsizlik |
| Telegram funksiyani o'zi qo'shib qo'yishi | O'rta | Tez yetkazish; plaginlar orqali uzun dum |

---

## 6. Ochiq qarorlar (egasidan javob kerak)

1. **Platforma** — Android'dan boshlash tavsiya etiladi. Rozimisiz, yoki iOS/desktop birinchi?
2. **Auditoriya** — o'zbek bozori (mahalliy funksiyalar birinchi) yoki global?
3. **Qizil chiziqlar** — ghost mode va shunga o'xshashlardan voz kechish tavsiya etiladi. Bu qaror mahsulot pozitsiyasini belgilaydi.
4. **Monetizatsiya** — AI obunasi, xayriya, yoki hozircha yo'q?
5. **Jamoa** — bir kishi bo'lsa Faza 1 hajmini yarmiga qisqartirish kerak.

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
