import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { badRequest, success } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return badRequest("Token y contraseña son requeridos");
  if (password.length < 6) return badRequest("La contraseña debe tener al menos 6 caracteres");

  const record = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!record) return badRequest("Token inválido o expirado");
  if (record.expires < new Date()) {
    await db.verificationToken.delete({ where: { token } });
    return badRequest("Token expirado. Solicita una nueva invitación.");
  }

  const user = await db.user.findFirst({
    where: { email: { equals: record.identifier, mode: "insensitive" } },
  });

  if (!user) return badRequest("Usuario no encontrado");

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await db.verificationToken.delete({ where: { token } });

  return success({ ok: true });
}
