import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const GRACE_PERIOD_DAYS = 3;

export type BillingState = "ok" | "warning" | "locked" | "needs_setup";
export type LockReason = "canceled" | "past_due" | "unpaid" | "needs_setup";

export interface BillingGateResult {
  state: BillingState;
  lockReason: LockReason;
  daysLeft: number;
  isOwner: boolean;
}

function computeState(
  status: string | null,
  failedAt: Date | null
): Exclude<BillingState, "needs_setup"> {
  if (status === "trialing" || status === "active") return "ok";
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

export async function checkBillingGate(): Promise<BillingGateResult> {
  const session = await auth();
  const orgId = (session?.user as any)?.organizationId;
  const role = (session?.user as any)?.role ?? "CLIENT";
  const isOwner = role === "OWNER";

  if (!orgId) {
    return { state: "locked", lockReason: "needs_setup", daysLeft: 0, isOwner };
  }

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      platformSubscriptionStatus: true,
      platformPaymentFailedAt: true,
    },
  });

  const status = org?.platformSubscriptionStatus ?? null;
  const failedAt = org?.platformPaymentFailedAt ?? null;

  // No billing set up at all
  if (!status) {
    return { state: "needs_setup", lockReason: "needs_setup", daysLeft: 0, isOwner };
  }

  const state = computeState(status, failedAt);
  const daysLeft = daysLeftInGrace(failedAt);

  let lockReason: LockReason = "past_due";
  if (status === "canceled") lockReason = "canceled";
  else if (status === "unpaid") lockReason = "unpaid";

  return { state, lockReason, daysLeft, isOwner };
}
