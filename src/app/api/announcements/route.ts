import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

// GET — public-ish: returns active announcements for current user's org
export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const orgId = (session.user as any).organizationId;
  if (!orgId) return success([]);

  const now = new Date();
  const announcements = await db.announcement.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });

  return success(announcements);
}

// POST — admin only: create announcement
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "settings:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const body = await req.json();
  const { title, content, type = "info", endsAt } = body;
  if (!title || !content) return badRequest("title y content son requeridos");

  const announcement = await db.announcement.create({
    data: {
      organizationId: orgId,
      title,
      content,
      type,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });

  return success(announcement, 201);
}
