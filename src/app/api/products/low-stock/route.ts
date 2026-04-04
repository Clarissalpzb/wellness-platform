import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { unauthorized, success, requirePermission } from "@/lib/api-helpers";

// GET — returns products that are at or below their low-stock threshold
export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const deny = requirePermission(session, "settings:manage");
  if (deny) return deny;
  const orgId = (session.user as any).organizationId;

  const products = await db.product.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      lowStockThreshold: { not: null },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      stockQuantity: true,
      lowStockThreshold: true,
      category: true,
    },
  });

  const lowStock = products.filter(
    (p) => p.stockQuantity !== null && p.lowStockThreshold !== null && p.stockQuantity <= p.lowStockThreshold!
  );

  return success({
    count: lowStock.length,
    products: lowStock.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stock: p.stockQuantity,
      threshold: p.lowStockThreshold,
      category: p.category,
      isCritical: (p.stockQuantity ?? 0) === 0,
    })),
  });
}
