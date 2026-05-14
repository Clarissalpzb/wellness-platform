import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_PLATFORM_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Platform webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organizationId;
        if (!orgId) break;

        await db.organization.updateMany({
          where: { id: orgId },
          data: {
            platformSubscriptionId: sub.id,
            platformSubscriptionStatus: sub.status,
            platformPaymentFailedAt: sub.status === "active" || sub.status === "trialing"
              ? null
              : undefined,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organizationId;
        if (!orgId) break;

        await db.organization.updateMany({
          where: { id: orgId },
          data: {
            platformSubscriptionStatus: "canceled",
            platformPaymentFailedAt: new Date(),
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await db.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: { platformPaymentFailedAt: new Date() },
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await db.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            platformPaymentFailedAt: null,
            platformSubscriptionStatus: "active",
          },
        });
        break;
      }

      default:
        console.log(`Unhandled platform event: ${event.type}`);
    }
  } catch (error) {
    console.error("Platform webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
