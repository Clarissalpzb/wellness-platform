import { db } from "@/lib/db";
import { success } from "@/lib/api-helpers";

export async function GET() {
  const studios = await db.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      settings: true,
    },
    orderBy: { name: "asc" },
  });

  return success(studios);
}
