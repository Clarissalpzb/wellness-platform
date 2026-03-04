import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { productSchema } from "@/lib/validations";
import { unauthorized, badRequest, success, requirePermission } from "@/lib/api-helpers";

// GET /api/products - List products for the organization
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const deny = requirePermission(session, "pos:manage");
    if (deny) return deny;
    const orgId = (session.user as any).organizationId;

    const products = await db.product.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    });

    return success(products);
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    const deny = requirePermission(session, "pos:manage");
    if (deny) return deny;
    const orgId = (session.user as any).organizationId;

    const body = await req.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const product = await db.product.create({
      data: {
        name: parsed.data.name,
        price: parsed.data.price,
        category: parsed.data.category,
        sku: parsed.data.sku,
        stockQuantity: parsed.data.stock,
        isActive: parsed.data.isActive,
        organizationId: orgId,
      },
    });

    return success(product, 201);
  } catch (error) {
    console.error("POST /api/products error:", error);
    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    );
  }
}
