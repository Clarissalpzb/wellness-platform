import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) return NextResponse.redirect(`${appUrl}/billing/setup?error=1`);

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const orgId = (checkoutSession.subscription as any)?.metadata?.organizationId
      ?? checkoutSession.metadata?.organizationId;

    if (!orgId) return NextResponse.redirect(`${appUrl}/billing/setup?error=1`);

    const sub = checkoutSession.subscription as any;
    await db.organization.update({
      where: { id: orgId },
      data: {
        stripeCustomerId: checkoutSession.customer as string,
        platformSubscriptionId: sub?.id ?? null,
        platformSubscriptionStatus: sub?.status ?? "trialing",
      },
    });

    return NextResponse.redirect(`${appUrl}/onboarding`);
  } catch {
    return NextResponse.redirect(`${appUrl}/billing/setup?error=1`);
  }
}
