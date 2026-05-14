import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

// GET /api/stripe/connect/return - Stripe redirects here after onboarding
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("account_id");

  // Stripe doesn't always pass account_id in the return URL, so we look it up
  // by finding the org that has this accountId in progress
  const where = accountId
    ? { stripeAccountId: accountId }
    : undefined;

  if (!where) {
    return NextResponse.redirect(`${appUrl}/settings?stripe=incomplete`);
  }

  try {
    const account = await stripe.accounts.retrieve(accountId!);
    const isComplete = account.details_submitted && account.charges_enabled;

    await db.organization.updateMany({
      where: { stripeAccountId: accountId! },
      data: { stripeOnboardingComplete: isComplete },
    });

    const destination = isComplete
      ? `${appUrl}/settings?stripe=connected`
      : `${appUrl}/settings?stripe=incomplete`;

    return NextResponse.redirect(destination);
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?stripe=error`);
  }
}
