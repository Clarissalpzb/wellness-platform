import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { productSchema } from "@/lib/validations";
import { unauthorized, badRequest, notFound, success, requirePermission } from "@/lib/api-helpers";

// GET /api/products/[id] - Get a single product
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const deny = requirePermission(session, "pos:manage");
    if (deny) return deny;
    const orgId = (session.user as any).organizationId;

    const { id } = await params;

    const product = await db.product.findUnique({
      where: { id },
    });

    if (!product || product.organizationId !== orgId) {
      return notFound("Producto no encontrado");
    }

    return success(product);
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Error al obtener producto" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update a product
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const deny = requirePermission(session, "pos:manage");
    if (deny) return deny;
    const orgId = (session.user as any).organizationId;

    const { id } = await params;

    const existing = await db.product.findUnique({ where: { id } });

    if (!existing || existing.organizationId !== orgId) {
      return notFound("Producto no encontrado");
    }

    const body = await req.json();
    const parsed = productSchema.partial().safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    // Map the validation schema field "stock" to the Prisma field "stockQuantity"
    const { stock, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (stock !== undefined) {
      updateData.stockQuantity = stock;
    }

    const product = await db.product.update({
      where: { id },
      data: updateData,
    });

    return success(product);
  } catch (error) {
    console.error("PUT /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete a product
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const deny = requirePermission(session, "pos:manage");
    if (deny) return deny;
    const orgId = (session.user as any).organizationId;

    const { id } = await params;

    const existing = await db.product.findUnique({ where: { id } });

    if (!existing || existing.organizationId !== orgId) {
      return notFound("Producto no encontrado");
    }

    await db.product.delete({ where: { id } });

    return success({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}
