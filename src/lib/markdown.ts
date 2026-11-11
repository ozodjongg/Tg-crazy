// Yozish maydonidagi oddiy belgilashni Telegram formatiga o'giradi:
//   **qalin**  __kursiv__  ~~o'chirilgan~~  ||spoiler||  `kod`  ```til\nkod bloki```
// Juftsiz belgi matnda o'zgarishsiz qoladi. Ofsetlar UTF-16 da (JS satri bilan bir xil).

export type MdEntityType = "bold" | "italic" | "strike" | "spoiler" | "code" | "pre";

export interface MdEntity {
  type: MdEntityType;
  offset: number;
  length: number;
  language?: string;
}

const PAIRS: [string, MdEntityType][] = [
  ["**", "bold"],
  ["__", "italic"],
  ["~~", "strike"],
  ["||", "spoiler"],
];

export function parseMarkdown(input: string): { text: string; entities: MdEntity[] } {
  let out = "";
  const entities: MdEntity[] = [];
  const open = new Map<string, number>(); // belgi -> natijadagi boshlanish joyi
  let i = 0;

  while (i < input.length) {
    // Kod bloki: ichidagi hech narsa o'girilmaydi
    if (input.startsWith("```", i)) {
      const end = input.indexOf("```", i + 3);
      if (end !== -1) {
        let body = input.slice(i + 3, end);
        let language: string | undefined;
        const nl = body.indexOf("\n");
        if (nl !== -1 && /^[\w+#.-]{1,20}$/.test(body.slice(0, nl))) {
          language = body.slice(0, nl);
          body = body.slice(nl + 1);
        }
        body = body.replace(/^\n|\n$/g, "");
        if (body) {
          entities.push({ type: "pre", offset: out.length, length: body.length, ...(language ? { language } : {}) });
          out += body;
        }
        i = end + 3;
        continue;
      }
    }
    // Qator ichidagi kod
    if (input[i] === "`") {
      const end = input.indexOf("`", i + 1);
      if (end > i + 1 && !input.slice(i + 1, end).includes("\n")) {
        const body = input.slice(i + 1, end);
        entities.push({ type: "code", offset: out.length, length: body.length });
        out += body;
        i = end + 1;
        continue;
      }
    }
    const pair = PAIRS.find(([m]) => input.startsWith(m, i));
    if (pair) {
      const [marker, type] = pair;
      const start = open.get(marker);
      if (start !== undefined) {
        open.delete(marker);
        if (out.length > start) entities.push({ type, offset: start, length: out.length - start });
        i += marker.length;
        continue;
      }
      // Faqat yopuvchi juftlik bor bo'lsa ochamiz
      if (input.indexOf(marker, i + marker.length) > i + marker.length) {
        open.set(marker, out.length);
        i += marker.length;
        continue;
      }
    }
    out += input[i];
    i++;
  }

  // Yopilmay qolgan belgi (masalan "**a `b** c`") — natija belgilarsiz bo'ladi; bunday holat kam
  return { text: out, entities: entities.sort((a, b) => a.offset - b.offset || b.length - a.length) };
}

/** Telegram TL formatidagi entity'lar (sendText / editMessage uchun). */
export function toTlEntities(entities: MdEntity[]) {
  return entities.map((e) => {
    switch (e.type) {
      case "bold":
        return { _: "messageEntityBold" as const, offset: e.offset, length: e.length };
      case "italic":
        return { _: "messageEntityItalic" as const, offset: e.offset, length: e.length };
      case "strike":
        return { _: "messageEntityStrike" as const, offset: e.offset, length: e.length };
      case "spoiler":
        return { _: "messageEntitySpoiler" as const, offset: e.offset, length: e.length };
      case "code":
        return { _: "messageEntityCode" as const, offset: e.offset, length: e.length };
      case "pre":
        return { _: "messageEntityPre" as const, offset: e.offset, length: e.length, language: e.language ?? "" };
    }
  });
}

/** Tanlangan matnni belgi bilan o'raydi (Ctrl+B / Ctrl+I). Yangi matn va kursor joyini qaytaradi. */
export function wrapSelection(text: string, start: number, end: number, marker: string) {
  const selected = text.slice(start, end);
  const next = text.slice(0, start) + marker + selected + marker + text.slice(end);
  return { text: next, start: start + marker.length, end: end + marker.length };
}

const MARKERS: Partial<Record<string, [string, string]>> = {
  bold: ["**", "**"],
  italic: ["__", "__"],
  strike: ["~~", "~~"],
  spoiler: ["||", "||"],
  code: ["`", "`"],
};

/** Teskari amal: formatlangan xabarni tahrirlash uchun belgilangan matnga aylantiradi. */
export function toMarkdown(text: string, entities: { kind: string; offset: number; length: number; language?: string }[]): string {
  const inserts: { at: number; s: string; order: number }[] = [];
  entities.forEach((e, idx) => {
    const m = e.kind === "pre" ? ["```" + (e.language ?? "") + "\n", "\n```"] : MARKERS[e.kind];
    if (!m) return;
    // Yopuvchilar ochuvchilardan oldin, ichkilari tashqilaridan oldin yopiladi
    inserts.push({ at: e.offset, s: m[0], order: idx });
    inserts.push({ at: e.offset + e.length, s: m[1], order: -idx - 1 });
  });
  inserts.sort((a, b) => b.at - a.at || a.order - b.order);
  let out = text;
  for (const ins of inserts) out = out.slice(0, ins.at) + ins.s + out.slice(ins.at);
  return out;
}
