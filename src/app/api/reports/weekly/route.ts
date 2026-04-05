import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/api-helpers";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const orgId = (session.user as any).organizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = startOfMonth;
  const orgClassFilter = { classSchedule: { class: { organizationId: orgId } } };

  const [
    org,
    totalClients,
    newClientsThisMonth,
    newClientsLastMonth,
    revenueThis,
    revenueLast,
    bookingsThis,
    bookingsLast,
    activeClients,
    atRiskClients,
    topSchedules,
    recentReviews,
    coachList,
  ] = await Promise.all([
    db.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
    db.user.count({ where: { organizationId: orgId, role: "CLIENT", isActive: true } }),
    db.user.count({ where: { organizationId: orgId, role: "CLIENT", isActive: true, createdAt: { gte: startOfMonth } } }),
    db.user.count({ where: { organizationId: orgId, role: "CLIENT", isActive: true, createdAt: { gte: startOfLastMonth, lt: endOfLastMonth } } }),
    db.transaction.aggregate({ where: { organizationId: orgId, createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    db.transaction.aggregate({ where: { organizationId: orgId, createdAt: { gte: startOfLastMonth, lt: endOfLastMonth } }, _sum: { amount: true } }),
    db.booking.count({ where: { date: { gte: startOfMonth }, status: { not: "CANCELLED" }, ...orgClassFilter } }),
    db.booking.count({ where: { date: { gte: startOfLastMonth, lt: endOfLastMonth }, status: { not: "CANCELLED" }, ...orgClassFilter } }),
    db.booking.groupBy({ by: ["userId"], where: { date: { gte: thirtyDaysAgo }, status: { not: "CANCELLED" }, ...orgClassFilter } }),
    db.booking.groupBy({
      by: ["userId"],
      where: { date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, status: { not: "CANCELLED" }, ...orgClassFilter },
    }),
    db.classSchedule.findMany({
      where: { class: { organizationId: orgId, isActive: true }, isCancelled: false },
      include: {
        class: { select: { name: true, maxCapacity: true } },
        bookings: { where: { date: { gte: thirtyDaysAgo }, status: { not: "CANCELLED" } }, select: { id: true } },
      },
      take: 20,
    }),
    db.classReview.findMany({
      where: { classSchedule: { class: { organizationId: orgId } }, createdAt: { gte: thirtyDaysAgo } },
      select: { rating: true },
    }),
    db.user.findMany({
      where: { organizationId: orgId, role: "COACH", isActive: true },
      select: { firstName: true, lastName: true, id: true },
      take: 10,
    }),
  ]);

  const revThis = revenueThis._sum.amount ?? 0;
  const revLast = revenueLast._sum.amount ?? 0;
  const revDelta = revLast > 0 ? Math.round(((revThis - revLast) / revLast) * 100) : 0;
  const bookingsDelta = bookingsLast > 0 ? Math.round(((bookingsThis - bookingsLast) / bookingsLast) * 100) : 0;

  // Compute class fill rates
  const byClass = new Map<string, { bookings: number; capacity: number }>();
  for (const s of topSchedules) {
    const existing = byClass.get(s.class.name) ?? { bookings: 0, capacity: 0 };
    byClass.set(s.class.name, {
      bookings: existing.bookings + s.bookings.length,
      capacity: existing.capacity + s.class.maxCapacity,
    });
  }
  const classFills = Array.from(byClass.entries())
    .map(([name, d]) => ({ name, fillRate: d.capacity > 0 ? Math.round((d.bookings / d.capacity) * 100) : 0 }))
    .sort((a, b) => b.fillRate - a.fillRate);

  const activeIds = new Set(activeClients.map((b) => b.userId));
  const atRiskCount = atRiskClients.filter((b) => !activeIds.has(b.userId)).length;

  const avgRating = recentReviews.length > 0
    ? (recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length).toFixed(1)
    : "N/A";

  const context = `
Estudio: ${org?.name}
Fecha del reporte: ${now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}

MÉTRICAS FINANCIERAS (mes actual vs mes anterior):
- Ingresos: $${revThis.toLocaleString()} MXN (${revDelta >= 0 ? "+" : ""}${revDelta}% vs mes anterior, anterior: $${revLast.toLocaleString()})
- Reservas: ${bookingsThis} (${bookingsDelta >= 0 ? "+" : ""}${bookingsDelta}% vs mes anterior)

CLIENTES:
- Total activos: ${totalClients}
- Nuevos este mes: ${newClientsThisMonth} (mes anterior: ${newClientsLastMonth})
- Con reserva en últimos 30 días: ${activeClients.length}
- En riesgo de churn (sin reserva 31-60 días): ${atRiskCount}

OCUPACIÓN DE CLASES (últimos 30 días):
${classFills.slice(0, 8).map((c) => `- ${c.name}: ${c.fillRate}% ocupación`).join("\n")}

SATISFACCIÓN:
- Rating promedio de reseñas recientes: ${avgRating}/5 (basado en ${recentReviews.length} reseñas)

EQUIPO:
- Coaches activos: ${coachList.map((c) => c.firstName).join(", ") || "Sin datos"}
  `.trim();

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `Eres el analista de negocio de un estudio de bienestar. Escribe un reporte ejecutivo semanal para la dueña del estudio, Clarissa, en español.

El reporte debe:
1. Empezar con un resumen de 2-3 oraciones del estado general del negocio (positivo pero honesto)
2. Identificar los 2-3 puntos más importantes que necesitan atención inmediata, con datos específicos
3. Destacar qué está funcionando bien
4. Dar 3 recomendaciones concretas y accionables ordenadas por prioridad
5. Cerrar con una proyección de la semana siguiente

Tono: profesional pero accesible, como un asesor de confianza. Usa números específicos. Sé directa. No uses frases genéricas.

Datos del negocio:
${context}`,
        },
      ],
    });

    const block = message.content[0];
    const narrative = block.type === "text" ? block.text : "";

    return NextResponse.json({
      narrative,
      generatedAt: now.toISOString(),
      metrics: { revThis, revLast, revDelta, bookingsThis, bookingsDelta, atRiskCount, activeClients: activeClients.length, totalClients },
    });
  } catch (err) {
    console.error("Weekly report generation error:", err);
    return NextResponse.json({ error: "Error generando reporte" }, { status: 500 });
  }
}
