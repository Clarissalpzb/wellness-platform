import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getResend } from "@/lib/resend";
import crypto from "crypto";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return NextResponse.json({ error: "El servicio de email no está configurado. Contacta al administrador." }, { status: 503 });
  }

  const user = await db.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  // Invalidate existing tokens for this user
  await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const fromAddress = process.env.RESEND_FROM_EMAIL || "Athletica <onboarding@resend.dev>";
  const resetUrl = `${appUrl}/recuperar/${token}`;

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: fromAddress,
      to: user.email,
      subject: "Restablecer contraseña — Athletica",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;background:#fff;padding:32px;border-radius:12px;">
          <div style="margin-bottom:24px;">
            <h1 style="font-size:24px;font-weight:700;color:#1a1a1a;margin:0 0 4px;">Athletica</h1>
          </div>
          <h2 style="font-size:18px;font-weight:600;color:#1a1a1a;margin:0 0 12px;">Hola, ${user.firstName} 👋</h2>
          <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta.
            El enlace expira en <strong>1 hora</strong>.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:14px 28px;background:#4ade80;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:24px;">
            Restablecer contraseña
          </a>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#999;font-size:12px;line-height:1.6;margin:0;">
            Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.<br/>
            O copia este enlace: <span style="color:#555;">${resetUrl}</span>
          </p>
        </div>
      `,
    });
    console.log("Password reset email sent:", result);
  } catch (err) {
    console.error("Error sending password reset email:", err);
    return NextResponse.json({ error: "No se pudo enviar el correo. Intenta de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
