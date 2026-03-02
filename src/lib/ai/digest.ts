import { db } from "@/lib/db";
import { resend } from "@/lib/resend";
import { rankInsights } from "./insights/scoring";

export async function generateDailyDigest(organizationId: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) return;

  // Get recent insights
  const insights = await db.insight.findMany({
    where: {
      organizationId,
      status: { in: ["NEW", "SEEN"] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (insights.length === 0) return;

  // Rank and take top 3
  const ranked = rankInsights(insights);
  const topInsights = ranked.slice(0, 3);
  const topDetails = insights.filter((i) =>
    topInsights.some((t) => t.id === i.id)
  );

  // Get key metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const bookingsToday = await db.booking.count({
    where: {
      classSchedule: { class: { organizationId } },
      date: { gte: today },
      status: { not: "CANCELLED" },
    },
  });

  // Get owners to send digest to
  const owners = await db.user.findMany({
    where: { organizationId, role: { in: ["OWNER", "ADMIN"] } },
  });

  for (const owner of owners) {
    await resend.emails.send({
      from: "Athletica <insights@athletica.app>",
      to: owner.email,
      subject: `[${org.name}] Resumen diario - ${topInsights.length} insights nuevos`,
      html: `
        <h2>Buenos días, ${owner.firstName}</h2>
        <p>Aquí está tu resumen diario de ${org.name}:</p>

        <h3>Métricas Clave</h3>
        <ul>
          <li>Reservas hoy: ${bookingsToday}</li>
        </ul>

        <h3>Top Insights</h3>
        ${topDetails
          .map(
            (i) => `
          <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px;">
            <strong>${i.title}</strong>
            <p style="color: #6b7280; font-size: 14px;">${i.description}</p>
          </div>
        `
          )
          .join("")}

        <p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard/insights" style="background: #22c55e; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none;">
            Ver todos los insights
          </a>
        </p>
      `,
    });
  }
}
