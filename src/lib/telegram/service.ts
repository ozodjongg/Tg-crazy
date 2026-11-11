import type { Message } from "@mtcute/web";

// Xizmat xabarlari (qo'shildi, chiqdi, nom o'zgardi…) uchun o'zbekcha matn.

function duration(sec: number): string {
  if (sec < 60) return `${sec} soniya`;
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m} daqiqa` : `${Math.floor(m / 60)} soat ${m % 60} daqiqa`;
}

export function serviceText(m: Message): string {
  const a = m.action;
  const who = m.sender.displayName || "Kimdir";
  if (!a) return "Xizmat xabari";
  switch (a.type) {
    case "chat_created":
      return `${who} «${a.title}» guruhini yaratdi`;
    case "channel_created":
      return `«${a.title}» kanali yaratildi`;
    case "chat_migrate_to":
    case "channel_migrate_from":
      return "Guruh superguruhga aylantirildi";
    case "message_pinned":
      return `${who} xabarni qadadi`;
    case "history_cleared":
      return "Tarix tozalandi";
    case "contact_joined":
      return `${who} Telegram'ga qo'shildi`;
    case "title_changed":
      return `${who} nomni «${a.title}» ga o'zgartirdi`;
    case "photo_changed":
      return `${who} guruh rasmini yangiladi`;
    case "photo_deleted":
      return `${who} guruh rasmini o'chirdi`;
    case "users_added":
      return a.users.length === 1 && a.users[0] === m.sender.id
        ? `${who} guruhga qo'shildi`
        : `${who} ${a.users.length} kishini qo'shdi`;
    case "user_left":
      return `${who} guruhni tark etdi`;
    case "user_removed":
      return `${who} a'zoni guruhdan chiqardi`;
    case "user_joined_link":
    case "user_joined_approved":
      return `${who} havola orqali qo'shildi`;
    case "call":
      return a.duration > 0
        ? `${a.isVideo ? "Video qo'ng'iroq" : "Qo'ng'iroq"} (${duration(a.duration)})`
        : `${a.isVideo ? "Video qo'ng'iroq" : "Qo'ng'iroq"} — javobsiz`;
    case "screenshot_taken":
      return `${who} skrinshot oldi`;
    case "group_call_started":
      return `${who} ovozli chatni boshladi`;
    case "group_call_ended":
      return `Ovozli chat tugadi (${duration(a.duration)})`;
    case "ttl_changed":
      return a.period > 0 ? `Xabarlar avtomatik o'chishi yoqildi` : "Xabarlarning avtomatik o'chishi o'chirildi";
    case "topic_created":
      return `«${a.title}» mavzusi yaratildi`;
    case "custom":
      return a.action;
    default:
      return "Xizmat xabari";
  }
}
