import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { runInsightRules } from "@/lib/ai/insights/rules";
import { unauthorized, requirePermission } from "@/lib/api-helpers";

// GET /api/insights - List insights for the organization
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "insights:view");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  if (!orgId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }

  const where: Record<string, unknown> = { organizationId: orgId };
  if (type) where.type = type;
  if (status) where.status = status;

  const insights = await db.insight.findMany({
    where,
    include: {
      actions: {
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: [
      { status: "asc" }, // NEW first
      { impactScore: "desc" },
      { createdAt: "desc" },
    ],
    take: 50,
  });

  return NextResponse.json(insights);
}

// POST /api/insights/generate - Trigger insight generation
export async function POST() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "insights:view");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  if (!orgId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }

  const newInsights = await runInsightRules(orgId);

  return NextResponse.json({
    generated: newInsights.length,
    insights: newInsights,
  });
}
