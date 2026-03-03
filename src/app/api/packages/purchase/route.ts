import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, notFound, success } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Cuerpo de solicitud inválido");
  }

  const { packageId } = body;
  if (!packageId) {
    return badRequest("packageId es requerido");
  }

  const pkg = await db.package.findUnique({
    where: { id: packageId },
    include: { organization: { select: { name: true } } },
  });

  if (!pkg || !pkg.isActive) {
    return notFound("Paquete no encontrado o no está activo");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);

  const userPackage = await db.userPackage.create({
    data: {
      userId,
      packageId: pkg.id,
      classesTotal: pkg.classLimit,
      expiresAt,
    },
  });

  return success(
    {
      id: userPackage.id,
      packageName: pkg.name,
      studioName: pkg.organization.name,
      classesTotal: userPackage.classesTotal,
      expiresAt: userPackage.expiresAt,
    },
    201
  );
}
