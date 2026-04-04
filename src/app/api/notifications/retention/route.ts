import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getResend } from "@/lib/resend";
import { success } from "@/lib/api-helpers";

// Retention workflow:
// - AT-RISK: has past bookings, no active package → re-engagement email
// - CHURNED: no bookings in 30+ days, no active package → win-back email

const AT_RISK_EMAIL = {
  subject: "Tu paquete venció — ¡no pares ahora! 🌱",
  headline: "Sigues siendo parte de nuestra comunidad",
  body: "Notamos que tu paquete ya no está activo. No dejes que el momentum que construiste se pierda — un nuevo paquete te espera y puedes retomarlo hoy mismo.",
  cta: "Ver paquetes disponibles",
  ctaPath: "/app/reservar",
};

const CHURNED_EMAIL = {
  subject: "Te extrañamos de verdad 💚",
  headline: "Hace tiempo que no te vemos",
  body: "Ha pasado más de un mes y nos preguntamos cómo estás. Si algo te detuvo, nos encantaría saberlo. Si estás listo para volver, aquí te esperamos con los brazos abiertos — y con clases increíbles.",
  cta: "Volver al estudio",
  ctaPath: "/app/reservar",
};

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
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  // At-risk: has bookings but no active package
  const atRiskUsers = await db.user.findMany({
    where: {
      role: "CLIENT",
      isActive: true,
      bookings: { some: {} },
      userPackages: {
        none: {
          isActive: true,
          expiresAt: { gt: now },
        },
      },
    },
    select: { id: true, email: true, firstName: true },
  });

  // Churned: last booking was 30+ days ago, no active package
  const churnedUsers = await db.user.findMany({
    where: {
      role: "CLIENT",
      isActive: true,
      bookings: {
        none: { date: { gte: thirtyDaysAgo } },
        some: {},
      },
      userPackages: {
        none: {
          isActive: true,
          expiresAt: { gt: now },
        },
      },
    },
    select: { id: true, email: true, firstName: true },
  });

  // Avoid double-emailing (churned is a subset of at-risk, remove duplicates)
  const churnedIds = new Set(churnedUsers.map((u) => u.id));
  const trueAtRisk = atRiskUsers.filter((u) => !churnedIds.has(u.id));

  async function sendEmail(
    user: { email: string; firstName: string },
    template: typeof AT_RISK_EMAIL
  ) {
    await resend.emails.send({
      from: fromAddress,
      to: user.email,
      subject: template.subject,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #171717;">
          <div style="background: linear-gradient(135deg, #16a34a, #059669); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">${template.headline}</h1>
          </div>
          <div style="background: white; padding: 28px 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #404040; line-height: 1.6;">
              Hola ${user.firstName}, ${template.body}
            </p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${appUrl}${template.ctaPath}"
                 style="background: #16a34a; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                ${template.cta}
              </a>
            </div>
            <p style="font-size: 12px; color: #a3a3a3; text-align: center; margin-top: 24px;">
              Recibes este mensaje porque tienes una cuenta en nuestro estudio.
            </p>
          </div>
        </div>
      `,
    });
  }

  let atRiskSent = 0;
  let churnedSent = 0;
  const errors: string[] = [];

  for (const user of trueAtRisk) {
    try {
      await sendEmail(user, AT_RISK_EMAIL);
      atRiskSent++;
    } catch (e: any) {
      errors.push(`at-risk ${user.email}: ${e.message}`);
    }
  }

  for (const user of churnedUsers) {
    try {
      await sendEmail(user, CHURNED_EMAIL);
      churnedSent++;
    } catch (e: any) {
      errors.push(`churned ${user.email}: ${e.message}`);
    }
  }

  return success({ atRiskSent, churnedSent, errors });
}
