// Ko'p ishlatiladigan emojilar toifalar bo'yicha (to'liq Unicode ro'yxati emas).

import { normalizeQuery } from "./chats";
import { EMOJI_KEYWORDS } from "./emoji-keywords";

export const EMOJI_GROUPS: { id: string; label: string; icon: string; emojis: string }[] = [
  { id: "smileys", label: "Yuzlar", icon: "😀", emojis: "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 💩 🤡 👻 👽 🤖" },
  { id: "gestures", label: "Imo-ishoralar", icon: "👍", emojis: "👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 💪 🦾 👀 👁 👅 👄 🫶 🧠 👶 🧒 👦 👧 🧑 👨 👩 🧔 👴 👵 🙋 🙇 🤦 🤷 💁 🙅 🙆 🧕 👳 👮 👷 💂 👨‍⚕️ 👩‍🎓 👨‍🍳 👩‍💻 👨‍🌾 🤰 👪" },
  { id: "hearts", label: "Yuraklar", icon: "❤️", emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉 ☯️ 💯 ✅ ❌ ⭕ ❗ ❓ ‼️ ⁉️ 💤 💢 💥 💫 💦 💨 🔥 ✨ ⭐ 🌟 ⚡ 🎉 🎊" },
  { id: "nature", label: "Tabiat", icon: "🌿", emojis: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🐺 🐴 🦄 🐝 🦋 🐌 🐞 🐢 🐍 🦎 🐙 🐬 🐳 🐟 🐪 🐫 🐘 🐑 🐐 🌵 🌲 🌳 🌴 🌱 🌿 🍀 🍁 🍂 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌚 🌙 ⭐ ☀️ ⛅ ☁️ 🌧 ⛈ ❄️ ☃️ 🌈 🌊" },
  { id: "food", label: "Taomlar", icon: "🍉", emojis: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥒 🌶 🌽 🥕 🧄 🧅 🥔 🍞 🥐 🥖 🫓 🧀 🥚 🍳 🥞 🥓 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🌮 🌯 🥗 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍚 🍙 🍰 🎂 🧁 🍩 🍪 🍫 🍬 🍭 🍯 🥛 ☕ 🍵 🧃 🥤 🧋 🍷 🍺 🧊" },
  { id: "activity", label: "Faoliyat", icon: "⚽", emojis: "⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🥋 ⛳ 🎣 🎽 🎿 🛹 🏆 🥇 🥈 🥉 🏅 🎖 🎗 🎫 🎟 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🎲 ♟ 🎯 🎳 🎮 🎰 🧩 🚗 🚕 🚌 🚎 🏎 🚓 🚑 🚒 🚲 🛵 🏍 ✈️ 🚀 🚁 ⛵ 🚢 🚂 🚇 🏠 🏡 🏢 🏫 🏥 🕌 🕋 🗼 🗽 🏔 🏕 🏖" },
  { id: "objects", label: "Buyumlar", icon: "💡", emojis: "⌚ 📱 💻 ⌨️ 🖥 🖨 🖱 💽 💾 💿 📷 📸 📹 🎥 📞 ☎️ 📺 📻 ⏰ ⏳ 💡 🔦 🕯 💸 💵 💰 💳 💎 ⚖️ 🔧 🔨 🛠 ⚙️ 🔫 💣 🔪 🛡 💊 💉 🩺 🧬 🔬 🔭 🧹 🧺 🧻 🚿 🛁 🔑 🗝 🚪 🛋 🛏 🎁 🎈 🎀 ✉️ 📩 📦 📫 📝 ✏️ 🖊 📚 📖 🔖 📎 📌 📍 ✂️ 🗂 📅 📈 📉 📊 🔒 🔓" },
  { id: "flags", label: "Bayroqlar", icon: "🇺🇿", emojis: "🇺🇿 🇰🇿 🇰🇬 🇹🇯 🇹🇲 🇦🇫 🇷🇺 🇹🇷 🇦🇿 🇺🇦 🇧🇾 🇬🇪 🇦🇲 🇮🇷 🇸🇦 🇦🇪 🇶🇦 🇪🇬 🇨🇳 🇯🇵 🇰🇷 🇮🇳 🇵🇰 🇮🇩 🇲🇾 🇺🇸 🇨🇦 🇬🇧 🇩🇪 🇫🇷 🇮🇹 🇪🇸 🇵🇱 🇳🇱 🇧🇷 🇦🇷 🇦🇺 🏳️ 🏴 🏁 🚩 🏳️‍🌈" },
];

const RECENT_KEY = "tg-crazy:recent-emoji";

export function recentEmoji(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, 32) : [];
  } catch {
    return [];
  }
}

export function rememberEmoji(emoji: string): void {
  try {
    const next = [emoji, ...recentEmoji().filter((e) => e !== emoji)].slice(0, 32);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Saqlab bo'lmasa — so'nggilar ro'yxati shu seans bilan cheklanadi
  }
}

/** Matnga kursor joyida qo'shadi; yangi matn va kursor joyini qaytaradi. */
export function insertAt(text: string, start: number, end: number, insert: string) {
  return { text: text.slice(0, start) + insert + text.slice(end), cursor: start + insert.length };
}

const INDEX = Object.entries(EMOJI_KEYWORDS).map(([emoji, words]) => ({
  emoji,
  words: normalizeQuery(words).split(/\s+/),
  label: words.split(" ").slice(0, 2).join(" "),
}));

/**
 * Emoji'ni nomi bo'yicha qidiradi (o'zbekcha yoki inglizcha, lotin yoki kirill).
 * So'z boshi bilan mos kelganlar, ichida uchraganlardan oldin keladi.
 */
export function searchEmoji(query: string, limit = 40): { emoji: string; label: string }[] {
  const q = normalizeQuery(query.trim());
  if (!q) return [];
  const scored: { emoji: string; label: string; score: number }[] = [];
  for (const e of INDEX) {
    let score = 0;
    e.words.forEach((w, i) => {
      // Birinchi so'z — asosiy nom: teng holatda u oldinda
      const bonus = i === 0 ? 0.5 : 0;
      if (w === q) score = Math.max(score, 3 + bonus);
      else if (w.startsWith(q)) score = Math.max(score, 2 + bonus);
      else if (q.length >= 3 && w.includes(q)) score = Math.max(score, 1);
    });
    if (score) scored.push({ emoji: e.emoji, label: e.label, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(({ emoji, label }) => ({ emoji, label }));
}
