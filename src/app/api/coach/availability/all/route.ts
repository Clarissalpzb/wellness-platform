import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, success, requirePermission } from "@/lib/api-helpers";

const COACH_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
  "#e11d48", "#84cc16", "#0ea5e9", "#a855f7", "#d946ef",
];

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "classes:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId as string | null;
  if (!orgId) return success([]);

  const coachProfiles = await db.coachProfile.findMany({
    where: {
      user: { organizationId: orgId },
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      availability: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        select: { dayOfWeek: true, startTime: true, endTime: true },
      },
    },
  });

  const result = coachProfiles.map((cp, index) => ({
    coachProfileId: cp.id,
    coachName: `${cp.user.firstName} ${cp.user.lastName}`,
    color: COACH_COLORS[index % COACH_COLORS.length],
    availability: cp.availability,
  }));

  return success(result);
}
