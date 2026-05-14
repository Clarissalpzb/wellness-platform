import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/api-helpers";

export async function POST() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 404 });

  await db.organization.update({
    where: { id: orgId },
    data: { onboardingCompleted: true },
  });

  return NextResponse.json({ ok: true });
}
