import { NextResponse } from "next/server";
import { generateInsightSummary } from "@/lib/anthropic";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const session = await auth();
    const orgId = (session?.user as any)?.organizationId as string | undefined;

    let context = "";

    if (orgId) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const orgClassFilter = { classSchedule: { class: { organizationId: orgId } } };

      const [
        org,
        totalClients,
        newClientsThisMonth,
        revenueThis,
        bookingsThis,
        activeBookers,
        topSchedules,
        recentReviews,
        atRiskRaw,
        packages,
        coaches,
      ] = await Promise.all([
        db.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
        db.user.count({ where: { organizationId: orgId, role: "CLIENT", isActive: true } }),
        db.user.count({ where: { organizationId: orgId, role: "CLIENT", isActive: true, createdAt: { gte: startOfMonth } } }),
        db.transaction.aggregate({ where: { organizationId: orgId, createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
        db.booking.count({ where: { date: { gte: startOfMonth }, status: { not: "CANCELLED" }, ...orgClassFilter } }),
        db.booking.groupBy({ by: ["userId"], where: { date: { gte: thirtyDaysAgo }, status: { not: "CANCELLED" }, ...orgClassFilter } }),
        db.classSchedule.findMany({
          where: { class: { organizationId: orgId, isActive: true }, isCancelled: false },
          include: {
            class: { select: { name: true, maxCapacity: true } },
            bookings: { where: { date: { gte: thirtyDaysAgo }, status: { not: "CANCELLED" } }, select: { id: true } },
          },
          take: 15,
        }),
        db.classReview.findMany({
          where: { classSchedule: { class: { organizationId: orgId } }, createdAt: { gte: thirtyDaysAgo } },
          select: { rating: true },
        }),
        db.booking.groupBy({
          by: ["userId"],
          where: {
            date: { gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), lt: thirtyDaysAgo },
            status: { not: "CANCELLED" },
            ...orgClassFilter,
          },
        }),
        db.package.findMany({ where: { organizationId: orgId, isActive: true }, select: { name: true, price: true, type: true } }),
        db.user.findMany({ where: { organizationId: orgId, role: "COACH", isActive: true }, select: { firstName: true, lastName: true } }),
      ]);

      const activeIds = new Set(activeBookers.map((b) => b.userId));
      const atRiskCount = atRiskRaw.filter((b) => !activeIds.has(b.userId)).length;

      const byClass = new Map<string, { bookings: number; capacity: number }>();
      for (const s of topSchedules) {
        const ex = byClass.get(s.class.name) ?? { bookings: 0, capacity: 0 };
        byClass.set(s.class.name, { bookings: ex.bookings + s.bookings.length, capacity: ex.capacity + s.class.maxCapacity });
      }
      const classFills = Array.from(byClass.entries())
        .map(([name, d]) => ({ name, fill: d.capacity > 0 ? Math.round((d.bookings / d.capacity) * 100) : 0 }))
        .sort((a, b) => b.fill - a.fill);

      const avgRating = recentReviews.length > 0
        ? (recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length).toFixed(1)
        : "sin datos";

      context = `
Estudio: ${org?.name}
Fecha: ${now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}

CLIENTES:
- Total activos: ${totalClients}
- Nuevos este mes: ${newClientsThisMonth}
- Con reservas en últimos 30 días: ${activeBookers.length}
- En riesgo de churn (31-60 días sin reserva): ${atRiskCount}

FINANZAS (mes actual):
- Ingresos: $${(revenueThis._sum.amount ?? 0).toLocaleString()} MXN
- Reservas: ${bookingsThis}

OCUPACIÓN DE CLASES (últimos 30 días):
${classFills.slice(0, 8).map((c) => `- ${c.name}: ${c.fill}% ocupación`).join("\n")}

PAQUETES DISPONIBLES:
${packages.map((p) => `- ${p.name}: $${p.price} MXN (${p.type})`).join("\n")}

COACHES:
${coaches.map((c) => `- ${c.firstName} ${c.lastName}`).join("\n")}

SATISFACCIÓN:
- Rating promedio (últimas reseñas): ${avgRating}/5 (${recentReviews.length} reseñas)
      `.trim();
    } else {
      context = "No hay datos disponibles para este estudio.";
    }

    const response = await generateInsightSummary(context, query);
    return NextResponse.json({ response });
  } catch (error) {
    console.error("AI query error:", error);
    return NextResponse.json({ error: "Error processing query" }, { status: 500 });
  }
}
