import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

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
    const slug = slugify(data.organizationName);

    const organization = await db.organization.create({
      data: {
        name: data.organizationName,
        slug: `${slug}-${Date.now().toString(36)}`,
        users: {
          create: {
            email: data.email,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone || null,
            role: "OWNER",
          },
        },
        locations: {
          create: {
            name: "Sucursal Principal",
          },
        },
      },
      include: {
        users: true,
      },
    });

    return NextResponse.json({
      success: true,
      userId: organization.users[0].id,
      organizationId: organization.id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error al crear la cuenta" },
      { status: 500 }
    );
  }
}
