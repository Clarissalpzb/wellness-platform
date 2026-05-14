import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/api-helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 404 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      platformSubscriptionStatus: true,
      platformPaymentFailedAt: true,
      stripeCustomerId: true,
    },
  });

  return NextResponse.json({
    status: org?.platformSubscriptionStatus ?? null,
    paymentFailedAt: org?.platformPaymentFailedAt ?? null,
    hasCustomer: !!org?.stripeCustomerId,
  });
}
