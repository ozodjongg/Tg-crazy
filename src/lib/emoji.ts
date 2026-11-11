// Ko'p ishlatiladigan emojilar toifalar bo'yicha (to'liq Unicode ro'yxati emas).

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
