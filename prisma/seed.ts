import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: "Wellness Studio CDMX",
      slug: "wellness-studio-cdmx",
      settings: {
        currency: "MXN",
        timezone: "America/Mexico_City",
        cancellationHours: 4,
      },
    },
  });

  // Create locations
  const location1 = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: "Sucursal Polanco",
      address: "Av. Presidente Masaryk 123, Polanco, CDMX",
      phone: "+52 55 1234 5678",
      timezone: "America/Mexico_City",
      businessHours: {
        mon: { open: "06:00", close: "21:00" },
        tue: { open: "06:00", close: "21:00" },
        wed: { open: "06:00", close: "21:00" },
        thu: { open: "06:00", close: "21:00" },
        fri: { open: "06:00", close: "21:00" },
        sat: { open: "07:00", close: "14:00" },
        sun: { open: "08:00", close: "13:00" },
      },
    },
  });

  // Create spaces
  const salaPrincipal = await prisma.space.create({
    data: { locationId: location1.id, name: "Sala Principal", capacity: 25 },
  });

  const salaYoga = await prisma.space.create({
    data: { locationId: location1.id, name: "Sala Yoga", capacity: 15 },
  });

  await prisma.space.create({
    data: { locationId: location1.id, name: "Terraza", capacity: 10 },
  });

  // Create users
  const passwordHash = await bcrypt.hash("password123", 12);

  const owner = await prisma.user.create({
    data: {
      email: "clarissa@wellness.com",
      passwordHash,
      role: "OWNER",
      organizationId: org.id,
      firstName: "Clarissa",
      lastName: "López",
      phone: "+52 55 9999 0000",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "ana@wellness.com",
      passwordHash,
      role: "ADMIN",
      organizationId: org.id,
      firstName: "Ana",
      lastName: "Martínez",
    },
  });

  const coach1 = await prisma.user.create({
    data: {
      email: "maria@wellness.com",
      passwordHash,
      role: "COACH",
      organizationId: org.id,
      firstName: "María",
      lastName: "García",
    },
  });

  const coach2 = await prisma.user.create({
    data: {
      email: "carlos@wellness.com",
      passwordHash,
      role: "COACH",
      organizationId: org.id,
      firstName: "Carlos",
      lastName: "López",
    },
  });

  await prisma.user.create({
    data: {
      email: "pedro@wellness.com",
      passwordHash,
      role: "FRONT_DESK",
      organizationId: org.id,
      firstName: "Pedro",
      lastName: "Sánchez",
    },
  });

  // Create coach profiles
  const coachProfile1 = await prisma.coachProfile.create({
    data: {
      userId: coach1.id,
      bio: "Instructora certificada de yoga con 8 años de experiencia.",
      specialties: ["Yoga", "Pilates", "Meditación"],
      certifications: ["RYT-500", "Pilates Mat Certified"],
    },
  });

  const coachProfile2 = await prisma.coachProfile.create({
    data: {
      userId: coach2.id,
      bio: "Coach de fitness funcional y entrenamiento de alta intensidad.",
      specialties: ["HIIT", "CrossFit", "Fuerza"],
      certifications: ["NASM CPT", "CrossFit L2"],
    },
  });

  // Create clients
  const clientNames = [
    { first: "Sofía", last: "Hernández", email: "sofia@email.com" },
    { first: "Diego", last: "Torres", email: "diego@email.com" },
    { first: "Valentina", last: "Ruiz", email: "vale@email.com" },
    { first: "Mateo", last: "Flores", email: "mateo@email.com" },
    { first: "Isabella", last: "Morales", email: "isa@email.com" },
    { first: "Sebastián", last: "Ramírez", email: "seba@email.com" },
    { first: "Camila", last: "Vargas", email: "camila@email.com" },
    { first: "Daniel", last: "Castro", email: "daniel@email.com" },
  ];

  const clients = await Promise.all(
    clientNames.map((c) =>
      prisma.user.create({
        data: {
          email: c.email,
          passwordHash,
          role: "CLIENT",
          organizationId: org.id,
          firstName: c.first,
          lastName: c.last,
          healthFlags: c.first === "Sofía" ? ["Lesión de espalda"] : [],
        },
      })
    )
  );

  // Create classes
  const yogaFlow = await prisma.class.create({
    data: {
      organizationId: org.id,
      name: "Yoga Flow",
      description: "Clase de yoga dinámica que combina respiración y movimiento fluido.",
      color: "#22c55e",
      duration: 60,
      maxCapacity: 20,
      waitlistMax: 5,
      category: "Yoga",
      level: "Todos",
    },
  });

  const hiit = await prisma.class.create({
    data: {
      organizationId: org.id,
      name: "HIIT Cardio",
      description: "Entrenamiento de intervalos de alta intensidad.",
      color: "#3b82f6",
      duration: 45,
      maxCapacity: 15,
      waitlistMax: 3,
      category: "Cardio",
      level: "Intermedio",
    },
  });

  const pilates = await prisma.class.create({
    data: {
      organizationId: org.id,
      name: "Pilates Mat",
      description: "Pilates en colchoneta enfocado en core y flexibilidad.",
      color: "#f59e0b",
      duration: 50,
      maxCapacity: 12,
      waitlistMax: 3,
      category: "Pilates",
      level: "Principiante",
    },
  });

  const meditation = await prisma.class.create({
    data: {
      organizationId: org.id,
      name: "Meditación",
      description: "Sesión guiada de meditación y mindfulness.",
      color: "#8b5cf6",
      duration: 30,
      maxCapacity: 25,
      waitlistMax: 0,
      category: "Mindfulness",
      level: "Todos",
    },
  });

  const crossfit = await prisma.class.create({
    data: {
      organizationId: org.id,
      name: "CrossFit",
      description: "Entrenamiento funcional de alta intensidad.",
      color: "#f43f5e",
      duration: 60,
      maxCapacity: 10,
      waitlistMax: 5,
      category: "Fuerza",
      level: "Avanzado",
    },
  });

  // Create schedules (recurring weekly)
  const schedules = await Promise.all([
    // Yoga Flow - Mon/Wed/Fri 7:00 & 17:00
    ...[1, 3, 5].flatMap((day) => [
      prisma.classSchedule.create({
        data: { classId: yogaFlow.id, locationId: location1.id, spaceId: salaYoga.id, coachProfileId: coachProfile1.id, dayOfWeek: day, startTime: "07:00", endTime: "08:00" },
      }),
      prisma.classSchedule.create({
        data: { classId: yogaFlow.id, locationId: location1.id, spaceId: salaYoga.id, coachProfileId: coachProfile1.id, dayOfWeek: day, startTime: "17:00", endTime: "18:00" },
      }),
    ]),
    // HIIT - Tue/Thu 8:00 & 18:00
    ...[2, 4].flatMap((day) => [
      prisma.classSchedule.create({
        data: { classId: hiit.id, locationId: location1.id, spaceId: salaPrincipal.id, coachProfileId: coachProfile2.id, dayOfWeek: day, startTime: "08:00", endTime: "08:45" },
      }),
      prisma.classSchedule.create({
        data: { classId: hiit.id, locationId: location1.id, spaceId: salaPrincipal.id, coachProfileId: coachProfile2.id, dayOfWeek: day, startTime: "18:00", endTime: "18:45" },
      }),
    ]),
    // Pilates - Mon/Wed 9:00
    ...[1, 3].map((day) =>
      prisma.classSchedule.create({
        data: { classId: pilates.id, locationId: location1.id, spaceId: salaYoga.id, coachProfileId: coachProfile1.id, dayOfWeek: day, startTime: "09:00", endTime: "09:50" },
      })
    ),
    // Meditation - Tue/Thu 10:00
    ...[2, 4].map((day) =>
      prisma.classSchedule.create({
        data: { classId: meditation.id, locationId: location1.id, spaceId: salaYoga.id, coachProfileId: coachProfile1.id, dayOfWeek: day, startTime: "10:00", endTime: "10:30" },
      })
    ),
    // CrossFit - Mon/Wed/Fri 19:00
    ...[1, 3, 5].map((day) =>
      prisma.classSchedule.create({
        data: { classId: crossfit.id, locationId: location1.id, spaceId: salaPrincipal.id, coachProfileId: coachProfile2.id, dayOfWeek: day, startTime: "19:00", endTime: "20:00" },
      })
    ),
  ]);

  // Create packages
  const dropIn = await prisma.package.create({
    data: { organizationId: org.id, name: "Pase Individual", type: "DROP_IN", price: 250, classLimit: 1, validityDays: 1 },
  });

  const pack10 = await prisma.package.create({
    data: { organizationId: org.id, name: "Paquete 10 Clases", type: "CLASS_PACK", price: 2000, classLimit: 10, validityDays: 30 },
  });

  const pack20 = await prisma.package.create({
    data: { organizationId: org.id, name: "Paquete 20 Clases", type: "CLASS_PACK", price: 3500, classLimit: 20, validityDays: 45 },
  });

  const monthly = await prisma.package.create({
    data: { organizationId: org.id, name: "Membresía Mensual", type: "UNLIMITED", price: 1500, validityDays: 30 },
  });

  const quarterly = await prisma.package.create({
    data: { organizationId: org.id, name: "Membresía Trimestral", type: "MEMBERSHIP", price: 3800, validityDays: 90 },
  });

  // Assign packages to clients
  const now = new Date();
  await Promise.all(
    clients.slice(0, 5).map((client, i) => {
      const pkg = [monthly, pack10, pack20, quarterly, monthly][i];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);
      return prisma.userPackage.create({
        data: {
          userId: client.id,
          packageId: pkg.id,
          classesTotal: pkg.classLimit,
          classesUsed: Math.floor(Math.random() * (pkg.classLimit || 10)),
          expiresAt,
        },
      });
    })
  );

  // Create some bookings
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const schedule of schedules.slice(0, 5)) {
    for (const client of clients.slice(0, 4)) {
      await prisma.booking.create({
        data: {
          userId: client.id,
          classScheduleId: schedule.id,
          date: today,
          status: Math.random() > 0.8 ? "CANCELLED" : "CONFIRMED",
          source: Math.random() > 0.7 ? "admin" : "app",
        },
      });
    }
  }

  // Create products
  const products = [
    { name: "Agua Mineral", price: 25, category: "Bebidas", stockQuantity: 50 },
    { name: "Smoothie Verde", price: 65, category: "Bebidas", stockQuantity: 20 },
    { name: "Barra Proteína", price: 45, category: "Snacks", stockQuantity: 30 },
    { name: "Toalla Yoga", price: 350, category: "Accesorios", stockQuantity: 15 },
    { name: "Mat Yoga", price: 800, category: "Accesorios", stockQuantity: 8 },
    { name: "Proteína Whey", price: 120, category: "Suplementos", stockQuantity: 25 },
  ];

  await Promise.all(
    products.map((p) =>
      prisma.product.create({
        data: { organizationId: org.id, ...p },
      })
    )
  );

  // Create sample insights
  await prisma.insight.createMany({
    data: [
      {
        organizationId: org.id,
        type: "revenue",
        category: "pricing",
        title: "Oportunidad de precio en Yoga Flow 18:00",
        description: "Yoga Flow de las 18:00 tiene 95%+ ocupación y lista de espera frecuente.",
        impactScore: 9,
        confidenceScore: 8,
        actionabilityScore: 9,
        suggestedActions: ["Agregar clase adicional", "Ajustar precio"],
      },
      {
        organizationId: org.id,
        type: "retention",
        category: "churn",
        title: "3 clientes en riesgo de churn",
        description: "Sofía H., Diego T. y Valentina R. han reducido su frecuencia >50%.",
        impactScore: 8,
        confidenceScore: 7,
        actionabilityScore: 8,
        suggestedActions: ["Enviar mensaje personalizado", "Ofrecer clase cortesía"],
      },
      {
        organizationId: org.id,
        type: "schedule",
        category: "occupancy",
        title: "Baja ocupación martes 10:00",
        description: "Meditación de martes 10:00 promedia 32% de ocupación por 4 semanas.",
        impactScore: 6,
        confidenceScore: 9,
        actionabilityScore: 8,
        suggestedActions: ["Cambiar horario", "Promocionar clase"],
      },
    ],
  });

  console.log("Seed completed successfully!");
  console.log(`Organization: ${org.name} (${org.slug})`);
  console.log(`Owner: ${owner.email} / password123`);
  console.log(`Coaches: ${coach1.email}, ${coach2.email}`);
  console.log(`Clients: ${clients.length} created`);
  console.log(`Classes: 5, Schedules: ${schedules.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
