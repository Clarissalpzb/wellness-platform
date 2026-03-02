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
        role: "CLIENT",
        ...(organizationId ? { organizationId } : {}),
      },
    });

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
