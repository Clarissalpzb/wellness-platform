import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/api-helpers";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const { id } = await params;
  const { status } = await req.json();

  const valid = ["NEW", "SEEN", "ACTIONED", "DISMISSED"];
  if (!valid.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const insight = await db.insight.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(insight);
}
