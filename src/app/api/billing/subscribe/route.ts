import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { unauthorized } from "@/lib/api-helpers";

const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
const priceId = process.env.STRIPE_PLATFORM_PRICE_ID!;

export async function POST() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 404 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { stripeCustomerId: true, platformSubscriptionStatus: true, name: true },
  });

  if (org?.platformSubscriptionStatus === "active" || org?.platformSubscriptionStatus === "trialing") {
    return NextResponse.json({ error: "Ya tienes una suscripción activa" }, { status: 400 });
  }

  let customerId = org?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org?.name,
      email: (session.user as any).email ?? undefined,
      metadata: { organizationId: orgId },
    });
    customerId = customer.id;
    await db.organization.update({
      where: { id: orgId },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { organizationId: orgId },
    },
    payment_method_collection: "always",
    success_url: `${appUrl}/api/billing/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing/setup?cancelled=1`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
