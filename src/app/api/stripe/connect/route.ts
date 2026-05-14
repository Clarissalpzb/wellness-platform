import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { unauthorized, requirePermission } from "@/lib/api-helpers";

const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

// GET /api/stripe/connect - connection status
export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 404 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { stripeAccountId: true, stripeOnboardingComplete: true },
  });

  return NextResponse.json({
    connected: org?.stripeOnboardingComplete ?? false,
    accountId: org?.stripeAccountId ?? null,
  });
}

// POST /api/stripe/connect - start or resume onboarding
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "settings:manage");
  if (deny) return deny;

  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 404 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { stripeAccountId: true, stripeOnboardingComplete: true },
  });

  if (org?.stripeOnboardingComplete) {
    return NextResponse.json({ error: "Stripe ya está conectado" }, { status: 400 });
  }

  let accountId = org?.stripeAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({ type: "express" });
    accountId = account.id;
    await db.organization.update({
      where: { id: orgId },
      data: { stripeAccountId: accountId },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/api/stripe/connect/refresh`,
    return_url: `${appUrl}/api/stripe/connect/return`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}

// DELETE /api/stripe/connect - disconnect Stripe
export async function DELETE() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "settings:manage");
  if (deny) return deny;

  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 404 });

  await db.organization.update({
    where: { id: orgId },
    data: { stripeAccountId: null, stripeOnboardingComplete: false },
  });

  return NextResponse.json({ ok: true });
}
