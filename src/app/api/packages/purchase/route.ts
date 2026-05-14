import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
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

  const { packageId, couponCode } = body;
  if (!packageId) {
    return badRequest("packageId es requerido");
  }

  const pkg = await db.package.findUnique({
    where: { id: packageId },
    include: { organization: { select: { name: true, stripeAccountId: true, stripeOnboardingComplete: true } } },
  });

  if (!pkg || !pkg.isActive) {
    return notFound("Paquete no encontrado o no está activo");
  }

  if (!pkg.organization.stripeOnboardingComplete || !pkg.organization.stripeAccountId) {
    return badRequest("Este estudio aún no tiene pagos en línea configurados");
  }

  let finalPrice = pkg.price;
  let validatedCouponCode: string | null = null;

  // Validate coupon if provided
  if (couponCode) {
    const code = couponCode.toUpperCase().trim();
    const coupon = await db.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      return badRequest("Código de cupón no válido");
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

    if (coupon.discountType === "PERCENTAGE") {
      finalPrice = Math.max(0, pkg.price * (1 - coupon.discountValue / 100));
    } else {
      finalPrice = Math.max(0, pkg.price - coupon.discountValue);
    }

    finalPrice = Math.round(finalPrice * 100) / 100;
    validatedCouponCode = code;
  }

  // If price is 0 (100% discount), create directly without Stripe
  if (finalPrice === 0) {
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

    await db.transaction.create({
      data: {
        userId,
        organizationId: pkg.organizationId,
        type: "PACKAGE_PURCHASE",
        amount: 0,
        currency: pkg.currency,
        paymentMethod: "COMPLIMENTARY",
        description: `Compra: ${pkg.name} (cupón: ${validatedCouponCode})`,
      },
    });

    // Increment coupon usage
    if (validatedCouponCode) {
      await db.coupon.update({
        where: { code: validatedCouponCode },
        data: { usedCount: { increment: 1 } },
      });
    }

    return success({
      free: true,
      id: userPackage.id,
      packageName: pkg.name,
      studioName: pkg.organization.name,
    });
  }

  // Create Stripe Checkout Session
  const unitAmount = Math.round(finalPrice * 100); // Convert to centavos

  const checkoutSession = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: pkg.currency.toLowerCase(),
            product_data: {
              name: pkg.name,
              description: `${pkg.organization.name} — ${pkg.classLimit ? `${pkg.classLimit} clases` : "Clases ilimitadas"}, ${pkg.validityDays} días`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        packageId: pkg.id,
        ...(validatedCouponCode && { couponCode: validatedCouponCode }),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/paquetes?purchase=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/reservar?purchase=cancelled`,
    },
    { stripeAccount: pkg.organization.stripeAccountId! }
  );

  return success({ url: checkoutSession.url });
}
