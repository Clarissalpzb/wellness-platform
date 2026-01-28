import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface InsightRule {
  id: string;
  type: string;
  category: string;
  check: (organizationId: string) => Promise<InsightResult | null>;
}

export interface InsightResult {
  title: string;
  description: string;
  impactScore: number;
  confidenceScore: number;
  actionabilityScore: number;
  suggestedActions: string[];
  metadata: Prisma.InputJsonValue;
}

export const insightRules: InsightRule[] = [
  {
    id: "low-occupancy",
    type: "schedule",
    category: "occupancy",
    async check(organizationId: string) {
      // Find classes with <40% occupancy for 4+ weeks
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const schedules = await db.classSchedule.findMany({
        where: {
          class: { organizationId },
          isCancelled: false,
        },
        include: {
          class: true,
          bookings: {
            where: {
              date: { gte: fourWeeksAgo },
              status: { not: "CANCELLED" },
            },
          },
        },
      });

      for (const schedule of schedules) {
        const avgAttendees = schedule.bookings.length / 4; // 4 weeks
        const occupancy = avgAttendees / schedule.class.maxCapacity;

        if (occupancy < 0.4) {
          return {
            title: `Baja ocupación: ${schedule.class.name}`,
            description: `${schedule.class.name} ha promediado ${Math.round(occupancy * 100)}% de ocupación (${Math.round(avgAttendees)}/${schedule.class.maxCapacity}) en las últimas 4 semanas.`,
            impactScore: 6,
            confidenceScore: 9,
            actionabilityScore: 8,
            suggestedActions: ["Cambiar horario", "Promocionar clase", "Cancelar temporalmente"],
            metadata: { scheduleId: schedule.id, occupancy } as Prisma.InputJsonValue,
          };
        }
      }
      return null;
    },
  },
  {
    id: "waitlist-opportunity",
    type: "schedule",
    category: "demand",
    async check(organizationId: string) {
      const recentWaitlist = await db.waitlistEntry.findMany({
        where: {
          classSchedule: { class: { organizationId } },
          createdAt: { gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
        },
        include: {
          classSchedule: { include: { class: true } },
        },
      });

      // Group by schedule
      const bySchedule = new Map<string, number>();
      for (const entry of recentWaitlist) {
        const key = entry.classScheduleId;
        bySchedule.set(key, (bySchedule.get(key) || 0) + 1);
      }

      for (const [scheduleId, count] of bySchedule) {
        if (count >= 12) { // 3+ per week for 4 weeks
          const schedule = recentWaitlist.find(w => w.classScheduleId === scheduleId)?.classSchedule;
          if (schedule) {
            return {
              title: `Demanda insatisfecha: ${schedule.class.name}`,
              description: `${schedule.class.name} ha tenido ${count} personas en lista de espera en las últimas 4 semanas. Considera agregar otra sesión.`,
              impactScore: 9,
              confidenceScore: 8,
              actionabilityScore: 9,
              suggestedActions: ["Agregar sesión adicional", "Aumentar capacidad", "Ajustar precio"],
              metadata: { scheduleId, waitlistCount: count } as Prisma.InputJsonValue,
            };
          }
        }
      }
      return null;
    },
  },
  {
    id: "churn-risk",
    type: "retention",
    category: "churn",
    async check(organizationId: string) {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const clients = await db.user.findMany({
        where: { organizationId, role: "CLIENT", isActive: true },
        include: {
          bookings: {
            where: { date: { gte: twoMonthsAgo } },
            orderBy: { date: "desc" },
          },
        },
      });

      const atRisk: string[] = [];
      for (const client of clients) {
        const recentBookings = client.bookings.filter(b => b.date >= oneMonthAgo).length;
        const previousBookings = client.bookings.filter(b => b.date < oneMonthAgo && b.date >= twoMonthsAgo).length;

        if (previousBookings > 0 && recentBookings / previousBookings < 0.5) {
          atRisk.push(`${client.firstName} ${client.lastName}`);
        }
      }

      if (atRisk.length > 0) {
        return {
          title: `${atRisk.length} clientes en riesgo de churn`,
          description: `${atRisk.slice(0, 3).join(", ")}${atRisk.length > 3 ? ` y ${atRisk.length - 3} más` : ""} han reducido su frecuencia de visitas >50%.`,
          impactScore: 8,
          confidenceScore: 7,
          actionabilityScore: 8,
          suggestedActions: ["Enviar mensaje personalizado", "Ofrecer clase cortesía", "Llamar"],
          metadata: { atRiskClients: atRisk } as Prisma.InputJsonValue,
        };
      }
      return null;
    },
  },
  {
    id: "revenue-leak",
    type: "revenue",
    category: "cost",
    async check(organizationId: string) {
      // Find classes with <3 average attendees (cost > revenue)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const schedules = await db.classSchedule.findMany({
        where: {
          class: { organizationId, isActive: true },
          isCancelled: false,
        },
        include: {
          class: true,
          bookings: {
            where: {
              date: { gte: fourWeeksAgo },
              status: { not: "CANCELLED" },
            },
          },
        },
      });

      const leaks = [];
      for (const schedule of schedules) {
        const avgPerSession = schedule.bookings.length / 4;
        if (avgPerSession < 3) {
          leaks.push({
            name: schedule.class.name,
            avg: Math.round(avgPerSession * 10) / 10,
          });
        }
      }

      if (leaks.length > 0) {
        return {
          title: `${leaks.length} clases con posible pérdida`,
          description: `Las siguientes clases promedian menos de 3 asistentes: ${leaks.map(l => `${l.name} (${l.avg})`).join(", ")}. El costo operativo probablemente supera los ingresos.`,
          impactScore: 7,
          confidenceScore: 8,
          actionabilityScore: 7,
          suggestedActions: ["Revisar horarios", "Consolidar clases", "Promover"],
          metadata: { leaks } as Prisma.InputJsonValue,
        };
      }
      return null;
    },
  },
];

export async function runInsightRules(organizationId: string) {
  const results = [];

  for (const rule of insightRules) {
    try {
      const result = await rule.check(organizationId);
      if (result) {
        // Check if similar insight already exists and is not expired
        const existing = await db.insight.findFirst({
          where: {
            organizationId,
            type: rule.type,
            category: rule.category,
            status: { in: ["NEW", "SEEN"] },
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        });

        if (!existing) {
          const insight = await db.insight.create({
            data: {
              organizationId,
              type: rule.type,
              category: rule.category,
              title: result.title,
              description: result.description,
              impactScore: result.impactScore,
              confidenceScore: result.confidenceScore,
              actionabilityScore: result.actionabilityScore,
              suggestedActions: result.suggestedActions,
              metadata: result.metadata,
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          });
          results.push(insight);
        }
      }
    } catch (error) {
      console.error(`Error running insight rule ${rule.id}:`, error);
    }
  }

  return results;
}
