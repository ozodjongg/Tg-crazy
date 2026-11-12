// Ovozli xabar uchun WebM/Opus → Ogg/Opus qayta o'rash (remux).
// Chrome va Safari'dagi MediaRecorder faqat WebM yozadi, Telegram esa ovozli xabarni
// Ogg/Opus ko'rinishida kutadi. Opus paketlari o'zgarmaydi — faqat konteyner almashadi.

// ---- WebM (EBML) o'qish ----

const ID = {
  Segment: 0x18538067,
  Tracks: 0x1654ae6b,
  TrackEntry: 0xae,
  CodecPrivate: 0x63a2,
  Audio: 0xe1,
  Channels: 0x9f,
  Cluster: 0x1f43b675,
  BlockGroup: 0xa0,
  Block: 0xa1,
  SimpleBlock: 0xa3,
} as const;

/** Ichiga kiriladigan (konteyner) elementlar — qolganlari o'tkazib yuboriladi */
const MASTERS = new Set<number>([ID.Segment, ID.Tracks, ID.TrackEntry, ID.Audio, ID.Cluster, ID.BlockGroup]);

/** EBML o'zgaruvchan uzunlikdagi butun son. keepMarker=true — element ID uchun. */
function readVint(b: Uint8Array, pos: number, keepMarker: boolean): { value: number; length: number; unknown: boolean } | null {
  const first = b[pos];
  if (first === undefined || first === 0) return null;
  let length = 1;
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length++;
  if (length > 8 || pos + length > b.length) return null;
  let value = keepMarker ? first : first & (0xff >> length);
  let allOnes = value === (0xff >> length);
  for (let i = 1; i < length; i++) {
    value = value * 256 + b[pos + i];
    if (b[pos + i] !== 0xff) allOnes = false;
  }
  return { value, length, unknown: !keepMarker && allOnes };
}

export interface OpusStream {
  /** WebM'dagi OpusHead (CodecPrivate), bo'lmasa null */
  head: Uint8Array | null;
  channels: number;
  packets: Uint8Array[];
}

export function parseWebmOpus(bytes: Uint8Array): OpusStream {
  let head: Uint8Array | null = null;
  let channels = 1;
  const packets: Uint8Array[] = [];
  let pos = 0;
  while (pos < bytes.length) {
    const id = readVint(bytes, pos, true);
    if (!id) break;
    const size = readVint(bytes, pos + id.length, false);
    if (!size) break;
    const bodyStart = pos + id.length + size.length;
    // Noma'lum o'lcham (MediaRecorder Segment/Cluster uchun yozadi) — fayl oxirigacha
    const bodyEnd = size.unknown ? bytes.length : Math.min(bytes.length, bodyStart + size.value);

    if (MASTERS.has(id.value)) {
      pos = bodyStart; // ichiga kiramiz
      continue;
    }
    if (id.value === ID.CodecPrivate) head = bytes.slice(bodyStart, bodyEnd);
    else if (id.value === ID.Channels) channels = bytes[bodyStart] || 1;
    else if (id.value === ID.SimpleBlock || id.value === ID.Block) {
      const track = readVint(bytes, bodyStart, false);
      if (track) {
        const flags = bytes[bodyStart + track.length + 2];
        const lacing = (flags >> 1) & 0x03;
        // MediaRecorder lacing ishlatmaydi; ishlatilgan blokni xato o'qimaslik uchun tashlaymiz
        if (lacing === 0) packets.push(bytes.slice(bodyStart + track.length + 3, bodyEnd));
      }
    }
    pos = bodyEnd;
  }
  if (head && head.length >= 10) channels = head[9];
  return { head, channels, packets };
}

// ---- Opus ----

/** Opus paketidagi namunalar soni (48 kHz da), TOC baytidan (RFC 6716 §3.1). */
export function opusPacketSamples(packet: Uint8Array): number {
  if (packet.length === 0) return 0;
  const toc = packet[0];
  const config = toc >> 3;
  let frameMs: number;
  if (config < 12) frameMs = [10, 20, 40, 60][config & 3];
  else if (config < 16) frameMs = [10, 20][config & 1];
  else frameMs = [2.5, 5, 10, 20][config & 3];
  const code = toc & 3;
  const frames = code === 0 ? 1 : code === 3 ? (packet[1] ?? 0) & 0x3f : 2;
  return Math.round(frameMs * 48) * frames;
}

const PRE_SKIP = 312;

function opusHead(channels: number): Uint8Array {
  const h = new Uint8Array(19);
  h.set(new TextEncoder().encode("OpusHead"));
  const v = new DataView(h.buffer);
  h[8] = 1; // versiya
  h[9] = channels;
  v.setUint16(10, PRE_SKIP, true);
  v.setUint32(12, 48000, true);
  v.setUint16(16, 0, true); // kuchaytirish
  h[18] = 0; // kanal xaritasi
  return h;
}

function opusTags(): Uint8Array {
  const vendor = new TextEncoder().encode("tg-crazy");
  const t = new Uint8Array(8 + 4 + vendor.length + 4);
  const v = new DataView(t.buffer);
  t.set(new TextEncoder().encode("OpusTags"));
  v.setUint32(8, vendor.length, true);
  t.set(vendor, 12);
  v.setUint32(12 + vendor.length, 0, true); // izohlar soni
  return t;
}

// ---- Ogg yozish ----

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
    table[i] = r >>> 0;
  }
  return table;
})();

export function oggCrc(data: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ data[i]) & 0xff]) >>> 0;
  return crc >>> 0;
}

function oggPage(packets: Uint8Array[], granule: number, serial: number, seq: number, flags: number): Uint8Array {
  const lacing: number[] = [];
  for (const p of packets) {
    let n = p.length;
    while (n >= 255) {
      lacing.push(255);
      n -= 255;
    }
    lacing.push(n);
  }
  const bodyLen = packets.reduce((s, p) => s + p.length, 0);
  const page = new Uint8Array(27 + lacing.length + bodyLen);
  const v = new DataView(page.buffer);
  page.set([0x4f, 0x67, 0x67, 0x53]); // "OggS"
  page[4] = 0;
  page[5] = flags;
  // 64-bit granula (JS'da 2^53 gacha yetarli)
  v.setUint32(6, granule % 0x100000000, true);
  v.setUint32(10, Math.floor(granule / 0x100000000), true);
  v.setUint32(14, serial, true);
  v.setUint32(18, seq, true);
  page[26] = lacing.length;
  page.set(lacing, 27);
  let off = 27 + lacing.length;
  for (const p of packets) {
    page.set(p, off);
    off += p.length;
  }
  v.setUint32(22, oggCrc(page), true);
  return page;
}

/** Opus paketlarini Ogg faylga o'raydi. */
export function opusToOgg(stream: OpusStream, serial = 0x7463_7a79): Uint8Array {
  const pages: Uint8Array[] = [];
  let seq = 0;
  const head = stream.head && stream.head.length >= 19 ? stream.head : opusHead(stream.channels);
  pages.push(oggPage([head], 0, serial, seq++, 0x02)); // BOS
  pages.push(oggPage([opusTags()], 0, serial, seq++, 0));

  let granule = 0;
  let batch: Uint8Array[] = [];
  let segments = 0;
  const flush = (last: boolean) => {
    pages.push(oggPage(batch, granule, serial, seq++, last ? 0x04 : 0));
    batch = [];
    segments = 0;
  };
  stream.packets.forEach((p, i) => {
    const need = Math.floor(p.length / 255) + 1;
    if (segments + need > 255 || batch.length >= 50) flush(false);
    batch.push(p);
    segments += need;
    granule += opusPacketSamples(p);
    if (i === stream.packets.length - 1) flush(true);
  });
  if (stream.packets.length === 0) pages.push(oggPage([], 0, serial, seq++, 0x04));

  const total = pages.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of pages) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export function webmToOgg(bytes: Uint8Array): Uint8Array {
  return opusToOgg(parseWebmOpus(bytes));
}

// ---- To'lqin ----

/** Ovoz balandligi namunalarini Telegram to'lqiniga (100 ta, 0–31) aylantiradi. */
export function toWaveform(levels: number[], points = 100): number[] {
  if (levels.length === 0) return new Array(points).fill(0);
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const from = Math.floor((i * levels.length) / points);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / points));
    let peak = 0;
    for (let j = from; j < to && j < levels.length; j++) peak = Math.max(peak, levels[j]);
    out.push(peak);
  }
  const max = Math.max(...out);
  return max > 0 ? out.map((v) => Math.round((v / max) * 31)) : out.map(() => 0);
}
