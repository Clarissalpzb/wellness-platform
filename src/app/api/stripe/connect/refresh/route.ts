import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

// GET /api/stripe/connect/refresh - called when the account link expires
// Stripe sends the account_id as a query param in the refresh_url
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("account_id");

  if (!accountId) {
    return NextResponse.redirect(`${appUrl}/settings?stripe=error`);
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/api/stripe/connect/refresh?account_id=${accountId}`,
      return_url: `${appUrl}/api/stripe/connect/return?account_id=${accountId}`,
      type: "account_onboarding",
    });

    return NextResponse.redirect(accountLink.url);
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?stripe=error`);
  }
}
