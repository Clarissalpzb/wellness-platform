import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

function formatICalDate(date: Date, time?: string): string {
  if (time) {
    // Combine date + HH:mm time into a local datetime string
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcal(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const bookings = await db.booking.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
      date: { gte: new Date() },
    },
    include: {
      classSchedule: {
        include: {
          class: { select: { name: true, description: true, duration: true } },
          location: { select: { name: true, address: true } },
          space: { select: { name: true } },
          coachProfile: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wellness Platform//Classes//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Mis Clases",
    "X-WR-TIMEZONE:America/Mexico_City",
  ];

  for (const b of bookings) {
    const s = b.classSchedule;
    const dtStart = formatICalDate(b.date, s.startTime);
    const dtEnd = formatICalDate(b.date, s.endTime);
    const coachName = s.coachProfile
      ? `${s.coachProfile.user.firstName} ${s.coachProfile.user.lastName}`
      : "";
    const locationStr = [s.location?.name, s.location?.address, s.space?.name]
      .filter(Boolean)
      .join(", ");
    const summary = escapeIcal(s.class.name);
    const description = [
      s.class.description ? escapeIcal(s.class.description) : "",
      coachName ? `Coach: ${escapeIcal(coachName)}` : "",
    ]
      .filter(Boolean)
      .join("\\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:booking-${b.id}@wellness-platform`,
      `DTSTAMP:${formatICalDate(new Date())}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : "",
      locationStr ? `LOCATION:${escapeIcal(locationStr)}` : "",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  const ical = lines.filter(Boolean).join("\r\n");

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mis-clases.ics"',
      "Cache-Control": "no-cache",
    },
  });
}
