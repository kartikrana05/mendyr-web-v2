// Visits happen in India, so every time is shown — and picked — in India time, even if the
// person booking is abroad (e.g. booking care for a parent).
export const MARKET_TZ = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

function fmt(iso: string | Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: MARKET_TZ, ...options }).format(
    typeof iso === "string" ? new Date(iso) : iso,
  );
}

/** "Today" / "Tomorrow" / "Yesterday" when the India-time date matches, else null. */
function relativeDay(iso: string | Date): string | null {
  const key = istDateKey(typeof iso === "string" ? new Date(iso) : iso);
  const now = Date.now();
  if (key === istDateKey(new Date(now))) return "Today";
  if (key === istDateKey(new Date(now + 86_400_000))) return "Tomorrow";
  if (key === istDateKey(new Date(now - 86_400_000))) return "Yesterday";
  return null;
}

/** "Tue, 4 Nov · 10:30 AM", or "Today · 10:30 AM" where it applies. */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/** "Tue, 4 Nov" — or "Today" / "Tomorrow". */
export function formatDate(iso: string | Date, { relative = true }: { relative?: boolean } = {}): string {
  return (relative && relativeDay(iso)) || fmt(iso, { weekday: "short", day: "numeric", month: "short" });
}

/** "10:30 AM" (India time). */
export function formatTime(iso: string | Date): string {
  return fmt(iso, { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
}

/** "5 min ago", "3 h ago", "2 days ago", else the date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return formatDate(iso, { relative: false });
}

/** "YYYY-MM-DD" for a moment, in India time. */
export function istDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MARKET_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts; // en-CA formats as YYYY-MM-DD
}

/** An India-time date ("YYYY-MM-DD") + time ("HH:MM") as an offset-carrying ISO string. */
export function istIso(dateKey: string, time: string): string {
  return `${dateKey}T${time}:00${IST_OFFSET}`;
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
}

/** "09:30" -> "9:30 AM"; "23:59" -> "midnight". */
export function clockLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (h === 23 && m === 59) return "midnight";
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** 10-digit Indian mobile -> "+91XXXXXXXXXX"; anything with a + is kept as typed. */
export function toE164India(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+91${digits.slice(-10)}`;
}

export function isValidIndianMobile(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return /^[6-9]\d{9}$/.test(digits.length === 12 ? digits.slice(2) : digits);
}

export function displayPhone(e164: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return match ? `+91 ${match[1]} ${match[2]}` : e164;
}

/** A WhatsApp chat link for a support number ("+91 98xxx…" → https://wa.me/9198…). */
export function whatsappLink(number: string, text?: string): string {
  const digits = number.replace(/\D/g, "");
  const full = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telLink(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, "")}`;
}
