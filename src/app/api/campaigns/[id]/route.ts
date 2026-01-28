import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaignSchema } from "@/lib/validations";
import { unauthorized, badRequest, notFound, success } from "@/lib/api-helpers";

// GET /api/campaigns/[id] - Get a single campaign with analytics
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const orgId = (session.user as any).organizationId;

    const { id } = await params;

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: { analytics: true },
    });

    if (!campaign || campaign.organizationId !== orgId) {
      return notFound("Campaña no encontrada");
    }

    return success(campaign);
  } catch (error) {
    console.error("GET /api/campaigns/[id] error:", error);
    return NextResponse.json(
      { error: "Error al obtener campaña" },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/[id] - Update a campaign
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const orgId = (session.user as any).organizationId;

    const { id } = await params;

    const existing = await db.campaign.findUnique({ where: { id } });

    if (!existing || existing.organizationId !== orgId) {
      return notFound("Campaña no encontrada");
    }

    const body = await req.json();
    const parsed = campaignSchema.partial().safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const updateData: Record<string, unknown> = { ...parsed.data };

    // Convert scheduledAt string to Date if provided
    if (parsed.data.scheduledAt !== undefined) {
      updateData.scheduledAt = parsed.data.scheduledAt
        ? new Date(parsed.data.scheduledAt)
        : null;
    }

    const campaign = await db.campaign.update({
      where: { id },
      data: updateData,
      include: { analytics: true },
    });

    return success(campaign);
  } catch (error) {
    console.error("PUT /api/campaigns/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar campaña" },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id] - Delete a campaign
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const orgId = (session.user as any).organizationId;

    const { id } = await params;

    const existing = await db.campaign.findUnique({ where: { id } });

    if (!existing || existing.organizationId !== orgId) {
      return notFound("Campaña no encontrada");
    }

    await db.campaign.delete({ where: { id } });

    return success({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/campaigns/[id] error:", error);
    return NextResponse.json(
      { error: "Error al eliminar campaña" },
      { status: 500 }
    );
  }
}
