import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, success, badRequest } from "@/lib/api-helpers";

// POST — record an abandoned cart (user viewed packages but didn't buy)
// Called client-side when a non-buyer leaves the packages/booking page
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  if (!user?.organizationId) return badRequest("Sin organización");

  // Only track first-time buyers — skip if user already has a previous package
  const existingPackages = await db.userPackage.count({
    where: {
      userId,
      package: { organizationId: user.organizationId },
    },
  });
  if (existingPackages > 0) return success({ tracked: false, reason: "returning_buyer" });

  // Check if there's already an active (unconverted) cart
  const existing = await db.abandonedCart.findFirst({
    where: { userId, organizationId: user.organizationId, convertedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (existing) return success({ tracked: true, cartId: existing.id });

  const body = await req.json().catch(() => ({}));
  const cart = await db.abandonedCart.create({
    data: {
      userId,
      organizationId: user.organizationId,
      packageId: body.packageId || null,
    },
  });

  return success({ tracked: true, cartId: cart.id }, 201);
}

// PUT — mark cart as converted (user bought a package)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  if (!user?.organizationId) return badRequest("Sin organización");

  await db.abandonedCart.updateMany({
    where: { userId, organizationId: user.organizationId, convertedAt: null },
    data: { convertedAt: new Date() },
  });

  return success({ converted: true });
}
