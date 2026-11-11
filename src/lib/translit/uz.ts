// O'zbek tili uchun lotin <-> kirill o'girish.
// Sof funksiyalar: tarmoqqa hech narsa yuborilmaydi.

const OKINA = "ʻ"; // oʻ, gʻ
const TUTUQ = "ʼ"; // aʼlo
const APOSTROPHES = "'`‘’ʻʼ";

const CYR_VOWELS = "аеёиоуэюяўыАЕЁИОУЭЮЯЎЫ";
const LAT_VOWELS = "aeiouAEIOU";

const isUpper = (ch: string | undefined) =>
  !!ch && ch !== ch.toLowerCase() && ch === ch.toUpperCase();
const isLetter = (ch: string | undefined) =>
  !!ch && ch.toLowerCase() !== ch.toUpperCase();

/** Ko'p harfli natijaning registrini manba harfi va qo'shnilariga moslaydi. */
function matchCase(out: string, src: string, prev: string | undefined, next: string | undefined) {
  if (!isUpper(src[0])) return out;
  const allCaps =
    (src.length > 1 && isUpper(src[1])) ||
    isUpper(next) ||
    (!isLetter(next) && isUpper(prev));
  return allCaps ? out.toUpperCase() : out[0].toUpperCase() + out.slice(1);
}

const CYR_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ж: "j", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "x", ч: "ch", ш: "sh", щ: "sh", ъ: TUTUQ, ы: "i", ь: "",
  э: "e", ю: "yu", я: "ya", ё: "yo", ў: "o" + OKINA, қ: "q", ғ: "g" + OKINA, ҳ: "h",
};

export function cyrillicToLatin(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const lower = ch.toLowerCase();
    const prev = text[i - 1];
    const next = text[i + 1];
    let lat: string | undefined;

    if (lower === "е") {
      // So'z boshida va unlidan (yoki ъ/ь dan) keyin "ye", aks holda "e"
      const afterVowel = !!prev && (CYR_VOWELS.includes(prev) || "ъьЪЬ".includes(prev));
      lat = !isLetter(prev) || afterVowel ? "ye" : "e";
    } else if (lower === "ц") {
      // Unlidan keyin "ts", boshqa hollarda "s"
      lat = !!prev && CYR_VOWELS.includes(prev) ? "ts" : "s";
    } else {
      lat = CYR_TO_LAT[lower];
    }

    if (lat === undefined) {
      out += ch;
    } else if (lat === TUTUQ || lat === "") {
      out += lat;
    } else {
      out += matchCase(lat, ch, prev, next);
    }
  }
  return out;
}

const LAT_DIGRAPHS: Record<string, string> = {
  sh: "ш", ch: "ч", yo: "ё", yu: "ю", ya: "я",
};

const LAT_TO_CYR: Record<string, string> = {
  a: "а", b: "б", d: "д", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж", k: "к",
  l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с", t: "т",
  u: "у", v: "в", x: "х", y: "й", z: "з", c: "с", w: "в",
};

export function latinToCyrillic(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const lower = ch.toLowerCase();
    const prev = text[i - 1];
    const next = text[i + 1];
    const up = (cyr: string) => (isUpper(ch) ? cyr.toUpperCase() : cyr);

    // oʻ -> ў, gʻ -> ғ
    if ((lower === "o" || lower === "g") && next && APOSTROPHES.includes(next)) {
      out += up(lower === "o" ? "ў" : "ғ");
      i += 2;
      continue;
    }
    // Tutuq belgisi -> ъ (faqat harflar orasida)
    if (APOSTROPHES.includes(ch)) {
      out += isLetter(prev) && isLetter(next) ? "ъ" : ch;
      i += 1;
      continue;
    }
    if (next) {
      const pair = lower + next.toLowerCase();
      // "ye" so'z boshida yoki unlidan keyin -> е
      if (pair === "ye" && (!isLetter(prev) || LAT_VOWELS.includes(prev!))) {
        out += up("е");
        i += 2;
        continue;
      }
      if (LAT_DIGRAPHS[pair]) {
        out += up(LAT_DIGRAPHS[pair]);
        i += 2;
        continue;
      }
    }
    if (lower === "e") {
      // So'z boshida va unlidan keyin "э", undoshdan keyin "е"
      const hard = !isLetter(prev) || LAT_VOWELS.includes(prev!);
      out += up(hard ? "э" : "е");
      i += 1;
      continue;
    }
    const cyr = LAT_TO_CYR[lower];
    out += cyr ? up(cyr) : ch;
    i += 1;
  }
  return out;
}

export function hasCyrillic(text: string): boolean {
  return /[Ѐ-ӿ]/.test(text);
}

/** Matn yozuvini aniqlab, ikkinchisiga o'giradi. */
export function toggleScript(text: string): string {
  return hasCyrillic(text) ? cyrillicToLatin(text) : latinToCyrillic(text);
}
