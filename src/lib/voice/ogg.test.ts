import { describe, expect, it } from "vitest";
import { oggCrc, opusPacketSamples, parseWebmOpus, toWaveform, webmToOgg } from "./ogg";

// ---- Sinov uchun WebM yasash ----

function el(id: number[], body: Uint8Array | number[], unknownSize = false): number[] {
  const b = [...body];
  if (unknownSize) return [...id, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, ...b];
  // 2 baytli o'lcham (0x4000 | n)
  return [...id, 0x40 | (b.length >> 8), b.length & 0xff, ...b];
}

const head = (channels: number) => {
  const h = new Uint8Array(19);
  h.set(new TextEncoder().encode("OpusHead"));
  h[8] = 1;
  h[9] = channels;
  h[10] = 0x38; // pre-skip 312
  h[11] = 0x01;
  new DataView(h.buffer).setUint32(12, 48000, true);
  return [...h];
};

/** 20 ms, mono, bitta kadrli Opus paketi (TOC config=1 → SILK NB 20ms, code 0) */
const packet = (fill: number, len: number) => [0x08, ...new Array(len - 1).fill(fill)];

function sampleWebm(packets: number[][], laced = false): Uint8Array {
  const block = (p: number[]) => el([0xa3], [0x81, 0x00, 0x00, laced ? 0x82 : 0x80, ...p]);
  const bytes = [
    ...el([0x1a, 0x45, 0xdf, 0xa3], [0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d]),
    ...el(
      [0x18, 0x53, 0x80, 0x67],
      [
        ...el([0x16, 0x54, 0xae, 0x6b], el([0xae], [...el([0x86], [...new TextEncoder().encode("A_OPUS")]), ...el([0x63, 0xa2], head(1))])),
        ...el([0x1f, 0x43, 0xb6, 0x75], [...el([0xe7], [0x00]), ...packets.flatMap(block)], true),
      ],
      true,
    ),
  ];
  return new Uint8Array(bytes);
}

// ---- Ogg o'qish (tekshiruv uchun) ----

function readOgg(ogg: Uint8Array) {
  const pages: { flags: number; granule: number; seq: number; packets: Uint8Array[]; crcOk: boolean }[] = [];
  let pos = 0;
  let pending: number[] = [];
  const all: Uint8Array[] = [];
  while (pos < ogg.length) {
    expect(String.fromCharCode(...ogg.slice(pos, pos + 4))).toBe("OggS");
    const v = new DataView(ogg.buffer, ogg.byteOffset + pos);
    const nseg = ogg[pos + 26];
    const lacing = [...ogg.slice(pos + 27, pos + 27 + nseg)];
    const bodyLen = lacing.reduce((a, b) => a + b, 0);
    const page = ogg.slice(pos, pos + 27 + nseg + bodyLen);
    const crc = new DataView(page.buffer).getUint32(22, true);
    page.set([0, 0, 0, 0], 22);
    const packets: Uint8Array[] = [];
    let off = pos + 27 + nseg;
    for (const l of lacing) {
      pending.push(...ogg.slice(off, off + l));
      off += l;
      if (l < 255) {
        packets.push(new Uint8Array(pending));
        all.push(new Uint8Array(pending));
        pending = [];
      }
    }
    pages.push({ flags: ogg[pos + 5], granule: v.getUint32(6, true), seq: v.getUint32(18, true), packets, crcOk: oggCrc(page) === crc });
    pos += 27 + nseg + bodyLen;
  }
  return { pages, packets: all };
}

describe("opusPacketSamples", () => {
  it("TOC baytidan kadr uzunligi", () => {
    expect(opusPacketSamples(new Uint8Array([0x08]))).toBe(960); // 20 ms
    expect(opusPacketSamples(new Uint8Array([0xf8]))).toBe(960); // CELT 20 ms
    expect(opusPacketSamples(new Uint8Array([0xf9]))).toBe(1920); // 2 kadr
    expect(opusPacketSamples(new Uint8Array([0xfb, 0x03]))).toBe(2880); // code 3, 3 kadr
    expect(opusPacketSamples(new Uint8Array([]))).toBe(0);
  });
});

describe("WebM → Ogg", () => {
  it("paketlar va OpusHead o'qiladi", () => {
    const s = parseWebmOpus(sampleWebm([packet(1, 10), packet(2, 300)]));
    expect(s.channels).toBe(1);
    expect(s.head?.length).toBe(19);
    expect(s.packets.map((p) => p.length)).toEqual([10, 300]);
  });

  it("lacing ishlatilgan blok tashlanadi", () => {
    expect(parseWebmOpus(sampleWebm([packet(1, 10)], true)).packets).toEqual([]);
  });

  it("to'g'ri Ogg: BOS/EOS, CRC, granula, paketlar o'zgarmaydi", () => {
    const input = Array.from({ length: 120 }, (_, i) => packet(i, 20 + (i % 7) * 80));
    const { pages, packets } = readOgg(webmToOgg(sampleWebm(input)));
    expect(pages[0].flags).toBe(0x02);
    expect(pages.at(-1)!.flags).toBe(0x04);
    expect(pages.every((p) => p.crcOk)).toBe(true);
    expect(pages.map((p) => p.seq)).toEqual(pages.map((_, i) => i));
    expect(String.fromCharCode(...packets[0].slice(0, 8))).toBe("OpusHead");
    expect(String.fromCharCode(...packets[1].slice(0, 8))).toBe("OpusTags");
    expect(packets.slice(2).map((p) => [...p])).toEqual(input);
    expect(pages.at(-1)!.granule).toBe(120 * 960);
  });

  it("bo'sh yozuv ham yaroqli fayl beradi", () => {
    const { pages } = readOgg(webmToOgg(sampleWebm([])));
    expect(pages.length).toBe(3);
    expect(pages.at(-1)!.flags).toBe(0x04);
  });
});

describe("toWaveform", () => {
  it("100 ta nuqta, 0–31 oralig'ida, eng balandi 31", () => {
    const w = toWaveform(Array.from({ length: 250 }, (_, i) => Math.sin(i / 10) ** 2));
    expect(w).toHaveLength(100);
    expect(Math.max(...w)).toBe(31);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(0);
  });

  it("jimjitlik — nollar", () => {
    expect(toWaveform([0, 0, 0])).toEqual(new Array(100).fill(0));
    expect(toWaveform([])).toEqual(new Array(100).fill(0));
  });
});
