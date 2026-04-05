import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/api-helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const orgId = (session.user as any).organizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [transactions, bookings, clients] = await Promise.all([
    db.transaction.findMany({
      where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.booking.findMany({
      where: {
        classSchedule: { class: { organizationId: orgId } },
        date: { gte: thirtyDaysAgo },
        status: { not: "CANCELLED" },
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        classSchedule: { include: { class: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    }),
    db.user.findMany({
      where: { organizationId: orgId, role: "CLIENT", isActive: true },
      select: { firstName: true, lastName: true, email: true, createdAt: true, phone: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const lines: string[] = [];

  lines.push("=== TRANSACCIONES (últimos 30 días) ===");
  lines.push("Fecha,Cliente,Email,Monto,Método,Descripción");
  for (const t of transactions) {
    lines.push(
      [
        t.createdAt.toLocaleDateString("es-MX"),
        `${t.user.firstName} ${t.user.lastName}`,
        t.user.email,
        t.amount.toFixed(2),
        t.paymentMethod,
        t.description ?? "",
      ].map((v) => `"${v}"`).join(",")
    );
  }

  lines.push("");
  lines.push("=== RESERVAS (últimos 30 días) ===");
  lines.push("Fecha,Cliente,Email,Clase,Estado");
  for (const b of bookings) {
    lines.push(
      [
        b.date.toLocaleDateString("es-MX"),
        `${b.user.firstName} ${b.user.lastName}`,
        b.user.email,
        b.classSchedule.class.name,
        b.status,
      ].map((v) => `"${v}"`).join(",")
    );
  }

  lines.push("");
  lines.push("=== CLIENTES ACTIVOS ===");
  lines.push("Nombre,Email,Teléfono,Registro");
  for (const c of clients) {
    lines.push(
      [
        `${c.firstName} ${c.lastName}`,
        c.email,
        c.phone ?? "",
        c.createdAt.toLocaleDateString("es-MX"),
      ].map((v) => `"${v}"`).join(",")
    );
  }

  const csv = lines.join("\n");
  const filename = `reporte-${now.toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
