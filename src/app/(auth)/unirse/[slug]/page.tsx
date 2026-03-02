import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { JoinForm } from "./join-form";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const organization = await db.organization.findUnique({
    where: { slug },
    select: { name: true, slug: true },
  });

  if (!organization) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900">
          Centro no encontrado
        </h1>
        <p className="text-neutral-500">
          El enlace de invitación no es válido o el centro ya no existe.
        </p>
      </div>
    );
  }

  return <JoinForm orgName={organization.name} slug={organization.slug} />;
}
