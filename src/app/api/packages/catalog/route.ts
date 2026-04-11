// Public package catalog — returns active packages grouped for client display
// Accessible to authenticated clients (no manage permission needed)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/api-helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const orgId = (session.user as any).organizationId as string;

  // Fetch active groups with their active packages
  const groups = await db.packageGroup.findMany({
    where: { organizationId: orgId, isActive: true },
    include: {
      packages: {
        where: { isActive: true },
        orderBy: [{ isFeatured: "desc" }, { price: "asc" }],
        select: {
          id: true, name: true, description: true, type: true,
          price: true, currency: true, classLimit: true,
          validityDays: true, isFeatured: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  // Also get ungrouped active packages
  const ungrouped = await db.package.findMany({
    where: { organizationId: orgId, isActive: true, groupId: null },
    orderBy: [{ isFeatured: "desc" }, { price: "asc" }],
    select: {
      id: true, name: true, description: true, type: true,
      price: true, currency: true, classLimit: true,
      validityDays: true, isFeatured: true,
    },
  });

  return NextResponse.json({ groups, ungrouped });
}
