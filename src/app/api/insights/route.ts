import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runInsightRules } from "@/lib/ai/insights/rules";

// GET /api/insights - List insights for an organization
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId");
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }

  const where: Record<string, unknown> = { organizationId };
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
export async function POST(req: Request) {
  const { organizationId } = await req.json();

  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }

  const newInsights = await runInsightRules(organizationId);

  return NextResponse.json({
    generated: newInsights.length,
    insights: newInsights,
  });
}
