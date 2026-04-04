import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, notFound, success } from "@/lib/api-helpers";

// DELETE — cancel a recurring booking subscription
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { id } = await params;

  const recurring = await db.recurringBooking.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!recurring) return notFound("Reserva recurrente no encontrada");

  await db.recurringBooking.update({
    where: { id },
    data: { isActive: false },
  });

  return success({ cancelled: true });
}
