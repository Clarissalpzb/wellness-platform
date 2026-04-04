import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getResend } from "@/lib/resend";
import { success } from "@/lib/api-helpers";
import { nanoid } from "nanoid";
import { addDays } from "date-fns";

// POST — send 20% discount codes to users with carts abandoned 24h+ ago.
// Run this once daily via cron.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.NOTIFICATIONS_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const fromAddress = process.env.RESEND_FROM_EMAIL || "Wellness Platform <onboarding@resend.dev>";
  const resend = getResend();

  const cutoff = new Date(Date.now() - 24 * 3600 * 1000); // 24h ago

  // Find carts: abandoned 24h+ ago, discount not yet sent, not converted
  const carts = await db.abandonedCart.findMany({
    where: {
      convertedAt: null,
      discountSent: false,
      createdAt: { lte: cutoff },
    },
    include: {
      user: { select: { id: true, email: true, firstName: true } },
      organization: { select: { id: true, name: true } },
    },
  });

  let sent = 0;
  const errors: string[] = [];

  for (const cart of carts) {
    try {
      // Create a 20% coupon valid for 5 days, max 1 use
      const code = `VUELVE-${nanoid(6).toUpperCase()}`;
      await db.coupon.create({
        data: {
          organizationId: cart.organizationId,
          code,
          discountType: "PERCENTAGE",
          discountValue: 20,
          maxUses: 1,
          expiresAt: addDays(new Date(), 5),
          isActive: true,
          metadata: { abandonedCartId: cart.id, userId: cart.userId },
        },
      });

      await resend.emails.send({
        from: fromAddress,
        to: cart.user.email,
        subject: `Aquí está tu 20% de descuento — solo por 5 días ⏳`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #171717;">
            <div style="background: linear-gradient(135deg, #16a34a, #059669); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 22px;">¡Te dejamos un regalo! 🎁</h1>
            </div>
            <div style="background: white; padding: 28px 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #404040; line-height: 1.6;">
                Hola ${cart.user.firstName}, vimos que estuviste viendo nuestros paquetes. Queremos que empieces con el pie derecho, así que te damos un <strong>20% de descuento</strong> en tu primera compra.
              </p>

              <div style="background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
                <p style="margin: 0 0 6px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Tu código de descuento</p>
                <p style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.1em; color: #15803d;">${code}</p>
                <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">Válido por 5 días · Un solo uso</p>
              </div>

              <div style="text-align: center; margin-top: 20px;">
                <a href="${appUrl}/app/reservar"
                   style="background: #16a34a; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                  Usar descuento ahora
                </a>
              </div>
              <p style="font-size: 12px; color: #a3a3a3; text-align: center; margin-top: 20px;">
                Oferta válida hasta el ${addDays(new Date(), 5).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}.
              </p>
            </div>
          </div>
        `,
      });

      // Mark discount as sent
      await db.abandonedCart.update({
        where: { id: cart.id },
        data: { discountSent: true, discountSentAt: new Date() },
      });

      sent++;
    } catch (e: any) {
      errors.push(`${cart.user.email}: ${e.message}`);
    }
  }

  return success({ sent, total: carts.length, errors });
}
