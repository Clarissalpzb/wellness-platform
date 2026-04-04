import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, requirePermission } from "@/lib/api-helpers";

// GET — export payroll CSV for a given month
// Query params: month=YYYY-MM (defaults to current month)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "staff:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // e.g. "2026-03"

  let monthStart: Date;
  let monthEnd: Date;
  if (monthParam) {
    const [year, month] = monthParam.split("-").map(Number);
    monthStart = new Date(year, month - 1, 1);
    monthEnd = new Date(year, month, 1);
  } else {
    const now = new Date();
    monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const coaches = await db.coachProfile.findMany({
    where: { user: { organizationId: orgId, isActive: true } },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      compensationRules: {
        where: {
          effectiveFrom: { lte: monthEnd },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: monthStart } }],
        },
        orderBy: { effectiveFrom: "desc" },
      },
    },
  });

  const rows: string[][] = [];
  rows.push([
    "Coach",
    "Email",
    "Clases impartidas",
    "Total asistentes",
    "Tipo de compensación",
    "Monto base",
    "Total estimado (MXN)",
  ]);

  for (const coach of coaches) {
    // Count classes taught in the period
    const schedules = await db.classSchedule.findMany({
      where: { coachProfileId: coach.id, isCancelled: false },
      include: {
        bookings: {
          where: {
            date: { gte: monthStart, lt: monthEnd },
            status: { in: ["CHECKED_IN", "COMPLETED", "CONFIRMED"] },
          },
          select: { id: true },
        },
      },
    });

    const classesWithAttendees = schedules.filter((s) => s.bookings.length > 0);
    const classesTaught = classesWithAttendees.length;
    const totalAttendees = classesWithAttendees.reduce((sum, s) => sum + s.bookings.length, 0);

    // Apply compensation rule (take first matching rule)
    const rule = coach.compensationRules[0];
    let totalComp = 0;
    let compType = "Sin regla";
    let baseAmount = 0;

    if (rule) {
      compType = rule.type;
      baseAmount = rule.amount;
      switch (rule.type) {
        case "FIXED_PER_CLASS":
          totalComp = classesTaught * rule.amount;
          break;
        case "PER_ATTENDEE":
          totalComp = totalAttendees * rule.amount;
          break;
        case "HOURLY":
          // Assume 1h per class slot for simplicity
          totalComp = classesTaught * rule.amount;
          break;
        case "PERCENTAGE_REVENUE":
          // Would need transaction data — approximate with 0 here
          totalComp = 0;
          break;
      }
    }

    rows.push([
      `${coach.user.firstName} ${coach.user.lastName}`,
      coach.user.email,
      String(classesTaught),
      String(totalAttendees),
      compType,
      String(baseAmount),
      totalComp.toFixed(2),
    ]);
  }

  // Build CSV
  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const monthLabel = monthStart.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nomina-${monthParam ?? "actual"}.csv"`,
    },
  });
}
