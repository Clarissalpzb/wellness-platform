import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getResend } from "@/lib/resend";
import crypto from "crypto";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
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

  const resetUrl = `${process.env.NEXTAUTH_URL}/recuperar/${token}`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Athletica <noreply@athletica.app>",
      to: user.email,
      subject: "Restablecer contraseña",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Hola, ${user.firstName}</h2>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>Haz clic en el siguiente botón para crear una nueva contraseña. El enlace expira en <strong>1 hora</strong>.</p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 24px;background:#4CAF50;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
            Restablecer contraseña
          </a>
          <p style="font-size:12px;color:#888;">Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.</p>
          <p style="font-size:12px;color:#888;">O copia este enlace en tu navegador:<br/>${resetUrl}</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Error sending password reset email:", err);
    // Don't expose email errors to client
  }

  return NextResponse.json({ ok: true });
}
