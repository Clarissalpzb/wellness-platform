import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { clientRegisterSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = clientRegisterSchema.parse(body);

    let organizationId: string | null = null;

    if (data.slug) {
      const organization = await db.organization.findUnique({
        where: { slug: data.slug },
      });

      if (!organization) {
        return NextResponse.json(
          { error: "Centro no encontrado" },
          { status: 404 }
        );
      }

      organizationId = organization.id;
    }

    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await db.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        role: "CLIENT",
        ...(organizationId ? { organizationId } : {}),
      },
    });

    if (data.referralCode) {
      const upperCode = data.referralCode.toUpperCase();

      // Coach referral (existing logic)
      const coachProfile = await db.coachProfile.findUnique({
        where: { referralCode: upperCode },
      });
      if (coachProfile) {
        await db.referral.create({
          data: { coachProfileId: coachProfile.id, referredUserId: user.id },
        });
      }

      // Client referral — check if the code belongs to an existing client
      const referrer = await db.user.findUnique({
        where: { referralCode: upperCode },
        select: { id: true, organizationId: true },
      });
      if (referrer && referrer.id !== user.id) {
        // Track the referral
        await db.clientReferral.create({
          data: { referrerId: referrer.id, referredUserId: user.id },
        });

        // Grant referred user 1 free class (15 days) immediately
        const refOrgId = organizationId || referrer.organizationId;
        if (refOrgId) {
          let introPkg = await db.package.findFirst({
            where: {
              organizationId: refOrgId,
              metadata: { path: ["isReferralOffer"], equals: true },
            },
          });
          if (!introPkg) {
            introPkg = await db.package.create({
              data: {
                organizationId: refOrgId,
                name: "Clase de Bienvenida (Referido)",
                description: "1 clase gratis por referido. Válida por 15 días.",
                type: "DROP_IN",
                price: 0,
                classLimit: 1,
                validityDays: 15,
                isActive: true,
                metadata: { isReferralOffer: true },
              },
            });
          }
          const { addDays } = await import("date-fns");
          await db.userPackage.create({
            data: {
              userId: user.id,
              packageId: introPkg.id,
              classesTotal: 1,
              classesUsed: 0,
              expiresAt: addDays(new Date(), 15),
              isActive: true,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      organizationId,
    });
  } catch (error) {
    console.error("Client registration error:", error);
    return NextResponse.json(
      { error: "Error al crear la cuenta" },
      { status: 500 }
    );
  }
}
