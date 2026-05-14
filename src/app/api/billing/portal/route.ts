import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { unauthorized } from "@/lib/api-helpers";

const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

export async function POST() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 404 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { stripeCustomerId: true },
  });

  if (!org?.stripeCustomerId) {
    return NextResponse.json({ error: "Sin cuenta de facturación" }, { status: 400 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
