import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resend } from "@/lib/resend";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "staff:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const { userId } = await req.json();
  if (!userId) return badRequest("userId es requerido");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.organizationId !== orgId) {
    return badRequest("Usuario no encontrado");
  }

  if (user.email.endsWith("@placeholder.local")) {
    return badRequest("Este usuario no tiene un email real. Edita su perfil primero.");
  }

  // Delete any existing tokens for this email (allows re-send)
  await db.verificationToken.deleteMany({
    where: { identifier: user.email },
  });

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await db.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      expires,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invitacion?token=${token}`;

  const fromAddress = process.env.RESEND_FROM_EMAIL || "Athletica <onboarding@resend.dev>";

  try {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: user.email,
      subject: "Estás invitado a unirte al equipo",
      html: `
        <h2>Hola, ${user.firstName}</h2>
        <p>Has sido invitado a unirte al equipo. Haz clic en el siguiente enlace para crear tu contraseña y activar tu cuenta:</p>
        <p>
          <a href="${inviteUrl}" style="background: #22c55e; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
            Crear mi contraseña
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">Este enlace expira en 48 horas.</p>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return badRequest(error.message || "Error al enviar el email");
    }
  } catch (err: any) {
    console.error("Resend exception:", err);
    return badRequest(err.message || "Error al enviar el email. Verifica la configuración de RESEND_API_KEY.");
  }

  return success({ sent: true });
}
