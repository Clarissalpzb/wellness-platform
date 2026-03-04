import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

function generateReferralCode(firstName: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 4; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  const name = firstName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8) || "COACH";
  return `${name}${random}`;
}

// POST /api/coach/referral-code - Generate a unique referral code for the coach
export async function POST() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "referrals:view_own");
  if (deny) return deny;

  const coachProfile = await db.coachProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!coachProfile) {
    return badRequest("No se encontró perfil de coach");
  }

  if (coachProfile.referralCode) {
    return success({ referralCode: coachProfile.referralCode });
  }

  // Get user's first name for the code
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { firstName: true },
  });

  // Try generating a unique code (up to 5 attempts)
  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateReferralCode(user?.firstName || "COACH");
    const existing = await db.coachProfile.findUnique({
      where: { referralCode: code },
    });
    if (!existing) break;
    if (attempt === 4) {
      return badRequest("No se pudo generar un código único. Intenta de nuevo.");
    }
  }

  const updated = await db.coachProfile.update({
    where: { id: coachProfile.id },
    data: { referralCode: code },
  });

  return success({ referralCode: updated.referralCode });
}
