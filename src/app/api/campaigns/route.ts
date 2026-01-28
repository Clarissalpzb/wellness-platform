import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaignSchema } from "@/lib/validations";
import { unauthorized, badRequest, success } from "@/lib/api-helpers";

// GET /api/campaigns - List campaigns for the organization
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const orgId = (session.user as any).organizationId;

    const campaigns = await db.campaign.findMany({
      where: { organizationId: orgId },
      include: { analytics: true },
      orderBy: { createdAt: "desc" },
    });

    return success(campaigns);
  } catch (error) {
    console.error("GET /api/campaigns error:", error);
    return NextResponse.json(
      { error: "Error al obtener campañas" },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Create a new campaign with empty analytics
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const orgId = (session.user as any).organizationId;

    const body = await req.json();
    const parsed = campaignSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const campaign = await db.campaign.create({
      data: {
        ...parsed.data,
        scheduledAt: parsed.data.scheduledAt
          ? new Date(parsed.data.scheduledAt)
          : null,
        organizationId: orgId,
        analytics: {
          create: {},
        },
      },
      include: { analytics: true },
    });

    return success(campaign, 201);
  } catch (error) {
    console.error("POST /api/campaigns error:", error);
    return NextResponse.json(
      { error: "Error al crear campaña" },
      { status: 500 }
    );
  }
}
