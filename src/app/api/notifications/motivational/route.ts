import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getResend } from "@/lib/resend";
import { success } from "@/lib/api-helpers";

// ─── Strategy ────────────────────────────────────────────────────────────────
//
// All memberships are monthly auto-renewing. Revenue comes from subscribers
// who do not actively cancel — including those who are inactive.
//
// Sending "you haven't been in a while" messages to long-term inactive
// subscribers REMINDS them they are paying for something they don't use,
// which is the #1 trigger for cancellation. These users are profitable as-is.
//
// Target window: 7–21 days inactive only.
//   - Under 7 days: too soon, they're probably just busy this week.
//   - 7–21 days: aware they haven't gone, not yet habituated to absence.
//               FOMO content here can re-engage before they consciously decide to cancel.
//   - 22+ days: habituated to not going. Leave them alone — they're paying.
//
// Tone: NEVER guilt ("you haven't been in a while").
//       ALWAYS FOMO ("look what's happening this week, you don't want to miss it").
//
// Also handles pre-renewal FOMO (3–5 days before monthly renewal):
//   Show upcoming classes to create excitement right before the charge hits,
//   making them feel the subscription is worth keeping.
//
// UNLIMITED package holders are excluded — they dilute revenue per class
// and their attendance does not directly improve margins.
// ─────────────────────────────────────────────────────────────────────────────

const FOMO_MESSAGES = [
  {
    subject: "Esta semana en el estudio 🔥",
    headline: "Las clases de esta semana están increíbles",
    body: "Hay algunas clases que no te puedes perder esta semana. Mira los horarios y reserva antes de que se llenen — los lugares van rápido.",
    cta: "Ver horarios de esta semana",
  },
  {
    subject: "Tus compañeras ya reservaron 📅",
    headline: "Los mejores horarios se están llenando",
    body: "Las clases de esta semana se están reservando rápido. Si tienes un día favorito, este es el momento de asegurarlo.",
    cta: "Reservar mi lugar",
  },
  {
    subject: "El estudio tiene algo especial esta semana ✨",
    headline: "No te pierdas lo que viene",
    body: "Esta semana hay clases que valen la pena. Mira los horarios disponibles y elige el que mejor se ajuste a tu semana.",
    cta: "Ver clases disponibles",
  },
];

const RENEWAL_MESSAGES = [
  {
    subject: "Tu membresía se renueva pronto — mira lo que viene 🗓",
    headline: "Un nuevo mes, nuevas clases",
    body: "Tu membresía se renueva en unos días. Ya tenemos el calendario del próximo mes listo — hay clases increíbles que vale la pena reservar desde ya.",
    cta: "Ver el calendario",
  },
  {
    subject: "Nuevo mes, nuevos objetivos 💚",
    headline: "Tu membresía está lista para el siguiente mes",
    body: "Con tu membresía activa tienes acceso a todo lo que viene. Reserva tus clases favoritas antes de que se llenen.",
    cta: "Reservar clases",
  },
];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.NOTIFICATIONS_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const fromAddress = process.env.RESEND_FROM_EMAIL || "Wellness Platform <onboarding@resend.dev>";
  const resend = getResend();

  const now = new Date();

  // ── Window boundaries ──────────────────────────────────────────────────────
  const sevenDaysAgo  = new Date(now.getTime() - 7  * 86400000);
  const twentyOneDaysAgo = new Date(now.getTime() - 21 * 86400000);
  // Pre-renewal window: subscription expires in 3–5 days
  const renewalWindowStart = new Date(now.getTime() + 3 * 86400000);
  const renewalWindowEnd   = new Date(now.getTime() + 5 * 86400000);

  // ── Fetch all active MEMBERSHIP/CLASS_PACK subscribers (not UNLIMITED) ─────
  const subscribers = await db.user.findMany({
    where: {
      role: "CLIENT",
      isActive: true,
      userPackages: {
        some: {
          isActive: true,
          expiresAt: { gt: now },
          package: { type: { notIn: ["UNLIMITED"] } },
        },
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      userPackages: {
        where: {
          isActive: true,
          expiresAt: { gt: now },
          package: { type: { notIn: ["UNLIMITED"] } },
        },
        include: { package: { select: { name: true, type: true } } },
        orderBy: { expiresAt: "asc" },
      },
      bookings: {
        where: {
          date: { gte: twentyOneDaysAgo },
          status: { not: "CANCELLED" },
        },
        select: { id: true, date: true },
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });

  const fomoTargets: typeof subscribers = [];
  const renewalTargets: typeof subscribers = [];

  for (const user of subscribers) {
    const pkg = user.userPackages[0];
    if (!pkg) continue;

    const lastBookingDate = user.bookings[0]?.date ?? null;
    const daysSinceLastBooking = lastBookingDate
      ? Math.floor((now.getTime() - lastBookingDate.getTime()) / 86400000)
      : 999;

    const daysUntilRenewal = Math.floor(
      (pkg.expiresAt.getTime() - now.getTime()) / 86400000
    );

    // Pre-renewal FOMO: 3–5 days before renewal, regardless of activity
    if (daysUntilRenewal >= 3 && daysUntilRenewal <= 5) {
      renewalTargets.push(user);
      continue;
    }

    // FOMO window: 7–21 days inactive
    // Skip if they booked within 7 days (not yet at risk)
    // Skip if inactive 22+ days (habituated — profitable, leave alone)
    if (daysSinceLastBooking >= 7 && daysSinceLastBooking <= 21) {
      fomoTargets.push(user);
    }
  }

  let fomoSent = 0;
  let renewalSent = 0;
  const errors: string[] = [];

  // ── Send FOMO emails ───────────────────────────────────────────────────────
  for (const user of fomoTargets) {
    const msg = FOMO_MESSAGES[Math.floor(Math.random() * FOMO_MESSAGES.length)];
    try {
      await resend.emails.send({
        from: fromAddress,
        to: user.email,
        subject: msg.subject,
        html: buildEmail(user.firstName, msg.headline, msg.body, msg.cta, appUrl),
      });
      fomoSent++;
    } catch (e: any) {
      errors.push(`fomo:${user.email}: ${e.message}`);
    }
  }

  // ── Send pre-renewal emails ────────────────────────────────────────────────
  for (const user of renewalTargets) {
    const msg = RENEWAL_MESSAGES[Math.floor(Math.random() * RENEWAL_MESSAGES.length)];
    const pkg = user.userPackages[0];
    try {
      await resend.emails.send({
        from: fromAddress,
        to: user.email,
        subject: msg.subject,
        html: buildEmail(
          user.firstName,
          msg.headline,
          msg.body,
          msg.cta,
          appUrl,
          pkg ? `Tu membresía: ${pkg.package.name}` : undefined
        ),
      });
      renewalSent++;
    } catch (e: any) {
      errors.push(`renewal:${user.email}: ${e.message}`);
    }
  }

  return success({
    fomoSent,
    renewalSent,
    totalSent: fomoSent + renewalSent,
    fomoTargets: fomoTargets.length,
    renewalTargets: renewalTargets.length,
    skippedLongTermInactive: subscribers.length - fomoTargets.length - renewalTargets.length,
    errors,
  });
}

function buildEmail(
  firstName: string,
  headline: string,
  body: string,
  cta: string,
  appUrl: string,
  packageNote?: string
): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #171717;">
      <div style="background: linear-gradient(135deg, #16a34a, #059669); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">${headline}</h1>
      </div>
      <div style="background: white; padding: 28px 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; color: #404040; line-height: 1.6;">
          Hola ${firstName}, ${body}
        </p>
        ${packageNote ? `
          <div style="background: #f5f5f5; border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 14px; color: #525252;">
            ${packageNote}
          </div>
        ` : ""}
        <div style="text-align: center; margin-top: 24px;">
          <a href="${appUrl}/app/reservar"
             style="background: #16a34a; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
            ${cta}
          </a>
        </div>
        <p style="font-size: 12px; color: #a3a3a3; text-align: center; margin-top: 24px;">
          Eres miembro de nuestro estudio. <a href="${appUrl}/app/perfil" style="color: #a3a3a3;">Gestionar preferencias</a>
        </p>
      </div>
    </div>
  `;
}
