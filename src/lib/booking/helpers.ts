import { PALETTE, GRADIENT_PALETTE, dayNames, monthNames, fullDayNames, fullMonthNames } from "./constants";

export function getStudioColor(index: number) {
  return PALETTE[index % PALETTE.length];
}

export function getStudioGradient(index: number) {
  return GRADIENT_PALETTE[index % GRADIENT_PALETTE.length];
}

export function buildDates(): { day: string; date: number; month: string; monthIdx: number; iso: string }[] {
  const today = new Date();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? -6 : -(currentDay - 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    return {
      day: dayNames[d.getDay()],
      date: d.getDate(),
      month: monthNames[d.getMonth()],
      monthIdx: d.getMonth(),
      iso: d.toISOString().slice(0, 10),
    };
  });
}

export function durationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : 60;
}

export function formatFullDate(isoStr: string): string {
  const d = new Date(isoStr + "T12:00:00");
  return `${fullDayNames[d.getDay()]} ${d.getDate()} de ${fullMonthNames[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function generateTakenSpots(classId: string, enrolled: number, capacity: number): Set<number> {
  const taken = new Set<number>();
  if (enrolled <= 0) return taken;
  let hash = 0;
  for (let i = 0; i < classId.length; i++) {
    hash = ((hash << 5) - hash) + classId.charCodeAt(i);
    hash |= 0;
  }
  const spots = Array.from({ length: capacity }, (_, i) => i + 1);
  for (let i = spots.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i;
    hash |= 0;
    const j = Math.abs(hash) % (i + 1);
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  for (let i = 0; i < Math.min(enrolled, capacity); i++) {
    taken.add(spots[i]);
  }
  return taken;
}

export function getCoachInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function formatPrice(price: number) {
  const formatted = price.toLocaleString("es-MX");
  return { whole: formatted, cents: "00" };
}

export function sessionLabel(sessions: number | "unlimited") {
  if (sessions === "unlimited") return "Ilimitadas";
  return `${sessions} sesión${sessions > 1 ? "es" : ""}`;
}
