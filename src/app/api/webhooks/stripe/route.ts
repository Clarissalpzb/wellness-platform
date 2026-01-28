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

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const packageId = session.metadata?.packageId;

        if (userId && packageId) {
          const pkg = await db.package.findUnique({
            where: { id: packageId },
          });

          if (pkg) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);

            await db.userPackage.create({
              data: {
                userId,
                packageId,
                classesTotal: pkg.classLimit,
                expiresAt,
                stripeSubId: session.subscription as string | null,
              },
            });

            await db.transaction.create({
              data: {
                userId,
                organizationId: pkg.organizationId,
                type: "PACKAGE_PURCHASE",
                amount: pkg.price,
                currency: pkg.currency,
                paymentMethod: "STRIPE",
                stripePaymentId: session.payment_intent as string,
                description: `Compra: ${pkg.name}`,
              },
            });
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string | undefined;

        if (subscriptionId) {
          // Renew the user package
          const userPackage = await db.userPackage.findFirst({
            where: { stripeSubId: subscriptionId },
            include: { package: true },
          });

          if (userPackage) {
            const expiresAt = new Date();
            expiresAt.setDate(
              expiresAt.getDate() + userPackage.package.validityDays
            );

            await db.userPackage.update({
              where: { id: userPackage.id },
              data: {
                expiresAt,
                classesUsed: 0,
                isActive: true,
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await db.userPackage.updateMany({
          where: { stripeSubId: subscription.id },
          data: { isActive: false },
        });
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
