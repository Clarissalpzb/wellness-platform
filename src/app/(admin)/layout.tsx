import { Sidebar } from "@/components/layouts/sidebar";
import { Topbar } from "@/components/layouts/topbar";
import { MobileNav } from "@/components/layouts/mobile-nav";
import { BillingWall } from "@/components/billing/billing-wall";
import { BillingBanner } from "@/components/billing/billing-banner";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const GRACE_PERIOD_DAYS = 3;

function getBillingState(status: string | null, failedAt: Date | null): "ok" | "warning" | "locked" {
  if (!status || status === "trialing" || status === "active") return "ok";
  if (status === "canceled" || status === "unpaid") return "locked";
  if (status === "past_due" && failedAt) {
    const daysElapsed = (Date.now() - failedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysElapsed >= GRACE_PERIOD_DAYS ? "locked" : "warning";
  }
  return "ok";
}

function daysLeftInGrace(failedAt: Date | null): number {
  if (!failedAt) return GRACE_PERIOD_DAYS;
  const daysElapsed = (Date.now() - failedAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(GRACE_PERIOD_DAYS - daysElapsed));
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const orgId = (session?.user as any)?.organizationId;

  let billingState: "ok" | "warning" | "locked" = "ok";
  let daysLeft = GRACE_PERIOD_DAYS;
  let lockReason: "canceled" | "past_due" | "unpaid" = "past_due";

  if (orgId) {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { platformSubscriptionStatus: true, platformPaymentFailedAt: true },
    });

    const status = org?.platformSubscriptionStatus ?? null;
    const failedAt = org?.platformPaymentFailedAt ?? null;

    billingState = getBillingState(status, failedAt);
    daysLeft = daysLeftInGrace(failedAt);
    if (status === "canceled") lockReason = "canceled";
    else if (status === "unpaid") lockReason = "unpaid";
  }

  if (billingState === "locked") {
    return <BillingWall reason={lockReason} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        {billingState === "warning" && <BillingBanner daysLeft={daysLeft} />}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
