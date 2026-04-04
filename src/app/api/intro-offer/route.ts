import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success } from "@/lib/api-helpers";
import { addDays } from "date-fns";

// GET — check if the current user is eligible for the intro offer
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { hasClaimedIntroOffer: true },
  });

  return success({ eligible: !user?.hasClaimedIntroOffer });
}

// POST — claim the intro offer (1 free class, 15 days)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const userId = session.user.id;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { hasClaimedIntroOffer: true, organizationId: true },
  });

  if (!user) return unauthorized();
  if (user.hasClaimedIntroOffer) {
    return badRequest("Ya reclamaste tu clase de bienvenida");
  }
  if (!user.organizationId) {
    return badRequest("No estás asociado a ningún estudio");
  }

  // Find or create a system-level "Intro Offer" package for this org
  let introPkg = await db.package.findFirst({
    where: {
      organizationId: user.organizationId,
      metadata: { path: ["isIntroOffer"], equals: true },
    },
  });

  if (!introPkg) {
    introPkg = await db.package.create({
      data: {
        organizationId: user.organizationId,
        name: "Clase de Bienvenida",
        description: "1 clase gratis para nuevos miembros. Válida por 15 días.",
        type: "DROP_IN",
        price: 0,
        classLimit: 1,
        validityDays: 15,
        isActive: true,
        metadata: { isIntroOffer: true },
      },
    });
  }

  const expiresAt = addDays(new Date(), 15);

  const userPackage = await db.userPackage.create({
    data: {
      userId,
      packageId: introPkg.id,
      classesTotal: 1,
      classesUsed: 0,
      expiresAt,
      isActive: true,
    },
  });

  await db.user.update({
    where: { id: userId },
    data: { hasClaimedIntroOffer: true },
  });

  return success({
    claimed: true,
    expiresAt,
    packageName: introPkg.name,
    userPackageId: userPackage.id,
  }, 201);
}
