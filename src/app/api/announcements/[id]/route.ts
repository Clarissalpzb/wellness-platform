import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, notFound, success, requirePermission } from "@/lib/api-helpers";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "settings:manage");
  if (deny) return deny;
  const { id } = await params;

  const body = await req.json();
  const { title, content, type, isActive, endsAt } = body;

  const updated = await db.announcement.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(type !== undefined && { type }),
      ...(isActive !== undefined && { isActive }),
      ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
    },
  });

  return success(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "settings:manage");
  if (deny) return deny;
  const { id } = await params;

  await db.announcement.delete({ where: { id } });
  return success({ deleted: true });
}
