import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, notFound, success } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Cuerpo de solicitud inválido");
  }

  const { code, packageId } = body;
  if (!code || !packageId) {
    return badRequest("code y packageId son requeridos");
  }

  const pkg = await db.package.findUnique({
    where: { id: packageId },
  });

  if (!pkg || !pkg.isActive) {
    return notFound("Paquete no encontrado");
  }

  const coupon = await db.coupon.findUnique({
    where: { code: code.toUpperCase().trim() },
  });

  if (!coupon) {
    return badRequest("Código de cupón no válido");
  }

  if (!coupon.isActive) {
    return badRequest("Este cupón ya no está activo");
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return badRequest("Este cupón ha expirado");
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return badRequest("Este cupón ha alcanzado su límite de usos");
  }

  if (coupon.organizationId !== pkg.organizationId) {
    return badRequest("Este cupón no es válido para este paquete");
  }

  let finalPrice: number;
  if (coupon.discountType === "PERCENTAGE") {
    finalPrice = Math.max(0, pkg.price * (1 - coupon.discountValue / 100));
  } else {
    finalPrice = Math.max(0, pkg.price - coupon.discountValue);
  }

  finalPrice = Math.round(finalPrice * 100) / 100;

  return success({
    valid: true,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    originalPrice: pkg.price,
    finalPrice,
  });
}
