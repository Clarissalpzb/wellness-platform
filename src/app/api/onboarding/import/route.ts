import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DAY_OF_WEEK: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  "miércoles": 3,
  jueves: 4,
  viernes: 5,
  "sábado": 6,
};

const CLASS_COLORS = [
  "#22c55e", "#3b82f6", "#a855f7", "#f97316",
  "#ec4899", "#14b8a6", "#f59e0b", "#6366f1",
];

interface ExtractedClass {
  name: string;
  description?: string | null;
  duration?: number | null;
  capacity?: number | null;
  category?: string | null;
  level?: string | null;
}

interface ExtractedPackage {
  name: string;
  price?: number | null;
  sessions?: number | null;
  validityDays?: number | null;
  description?: string | null;
}

interface ExtractedSchedule {
  className: string;
  instructorName?: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime?: string | null;
  room?: string | null;
}

interface ExtractedStudio {
  name?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
}

interface ExtractedData {
  studio?: ExtractedStudio;
  classes?: ExtractedClass[];
  packages?: ExtractedPackage[];
  schedule?: ExtractedSchedule[];
}

function inferPackageType(sessions: number | null | undefined) {
  if (!sessions) return "UNLIMITED" as const;
  if (sessions === 1) return "DROP_IN" as const;
  return "CLASS_PACK" as const;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  const body: { data: ExtractedData } = await request.json();
  const { data } = body;

  if (!data) {
    return NextResponse.json({ error: "No data provided" }, { status: 400 });
  }

  const summary = { classes: 0, packages: 0, schedules: 0 };

  try {
    await db.$transaction(async (tx) => {
      // 1. Ensure there is at least one location to attach schedules to
      let location = await tx.location.findFirst({
        where: { organizationId: orgId, isActive: true },
      });

      if (!location) {
        const studioName = data.studio?.name ?? "Estudio Principal";
        location = await tx.location.create({
          data: {
            organizationId: orgId,
            name: studioName,
            address: data.studio?.address ?? null,
            phone: data.studio?.phone ?? null,
            isActive: true,
          },
        });
      }

      // 2. Create classes
      const classMap: Record<string, string> = {}; // name → id

      for (let i = 0; i < (data.classes ?? []).length; i++) {
        const c = data.classes![i];
        if (!c.name?.trim()) continue;

        // Skip if a class with the same name already exists
        const existing = await tx.class.findFirst({
          where: { organizationId: orgId, name: c.name.trim() },
        });
        if (existing) {
          classMap[c.name.toLowerCase()] = existing.id;
          continue;
        }

        const created = await tx.class.create({
          data: {
            organizationId: orgId,
            name: c.name.trim(),
            description: c.description ?? null,
            duration: c.duration ?? 60,
            maxCapacity: c.capacity ?? 15,
            category: c.category ?? null,
            level: c.level ?? "Todos",
            color: CLASS_COLORS[i % CLASS_COLORS.length],
            isActive: true,
          },
        });
        classMap[c.name.toLowerCase()] = created.id;
        summary.classes++;
      }

      // 3. Create packages
      for (const p of data.packages ?? []) {
        if (!p.name?.trim()) continue;

        const existing = await tx.package.findFirst({
          where: { organizationId: orgId, name: p.name.trim() },
        });
        if (existing) continue;

        await tx.package.create({
          data: {
            organizationId: orgId,
            name: p.name.trim(),
            description: p.description ?? null,
            type: inferPackageType(p.sessions),
            price: p.price ?? 0,
            currency: "MXN",
            classLimit: p.sessions ?? null,
            validityDays: p.validityDays ?? 30,
            isActive: true,
          },
        });
        summary.packages++;
      }

      // 4. Create class schedules
      for (const s of data.schedule ?? []) {
        if (!s.className?.trim() || !s.dayOfWeek || !s.startTime) continue;

        const dayNum = DAY_OF_WEEK[s.dayOfWeek?.toLowerCase()];
        if (dayNum === undefined) continue;

        // Find the class id — try exact then fuzzy match
        const classId =
          classMap[s.className.toLowerCase()] ??
          Object.entries(classMap).find(([k]) =>
            k.includes(s.className.toLowerCase()) ||
            s.className.toLowerCase().includes(k)
          )?.[1];

        if (!classId) continue;

        // Derive end time if missing
        const classData = data.classes?.find(
          (c) => classMap[c.name?.toLowerCase()] === classId
        );
        const duration = classData?.duration ?? 60;
        const endTime = s.endTime?.trim() || addMinutes(s.startTime, duration);

        // Skip duplicate schedules for same class/day/time
        const dupCheck = await tx.classSchedule.findFirst({
          where: { classId, dayOfWeek: dayNum, startTime: s.startTime },
        });
        if (dupCheck) continue;

        await tx.classSchedule.create({
          data: {
            classId,
            locationId: location.id,
            dayOfWeek: dayNum,
            startTime: s.startTime,
            endTime,
            isRecurring: true,
          },
        });
        summary.schedules++;
      }
    });

    // Mark onboarding as complete in org settings
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    const currentSettings =
      typeof org?.settings === "object" && org.settings !== null
        ? (org.settings as Record<string, unknown>)
        : {};
    await db.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...currentSettings,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
          onboardingSource: "document_import",
        },
      },
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import data. Please try again." },
      { status: 500 }
    );
  }
}
