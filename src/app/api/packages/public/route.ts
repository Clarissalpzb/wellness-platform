import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, badRequest, success } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId");

  if (!organizationId) {
    return badRequest("organizationId es requerido");
  }

  const packages = await db.package.findMany({
    where: {
      organizationId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      price: true,
      currency: true,
      classLimit: true,
      validityDays: true,
    },
    orderBy: { price: "asc" },
  });

  return success(packages);
}
