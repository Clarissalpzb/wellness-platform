// AI-powered schedule suggestion endpoint
// Supports three modes:
//   historical  — reads real booking data, scores slots, asks Claude to reason
//   new_studio  — no historical data; Claude uses industry best practices
//   upload      — user pastes/uploads CSV from old platform; Claude extracts patterns

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/api-helpers";
import Anthropic from "@anthropic-ai/sdk";
import {
  computeDemand,
  getNewStudioPeakSlots,
  type NewStudioInput,
} from "@/lib/schedule/demand-engine";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export interface AISuggestion {
  classId: string;
  className: string;
  classColor: string;
  coachProfileId: string | null;
  coachName: string;
  spaceId: string | null;
  spaceName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string;
  score: number;
  reasoning: string;
  isAnchor: boolean;
  isNew: boolean;        // doesn't exist in current schedule
  dataSource: "historical" | "best_practice" | "upload";
}

export interface AIScheduleResult {
  mode: "historical" | "new_studio" | "upload";
  suggestions: AISuggestion[];
  anchors: string[];            // classIds that are locked
  aiSummary: string;
  opportunities: {
    classId: string;
    className: string;
    message: string;
  }[];
  unschedulable: { classId: string; className: string; reason: string }[];
  dataQuality: "high" | "medium" | "low" | "none";
  weeksAnalyzed: number;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(aS: number, aE: number, bS: number, bE: number): boolean {
  return aS < bE && bS < aE;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const orgId = (session.user as any).organizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const {
    locationId,
    mode = "historical",
    newStudioConfig,
    csvData,
  }: {
    locationId: string;
    mode: "historical" | "new_studio" | "upload";
    newStudioConfig?: NewStudioInput;
    csvData?: string;
  } = body;

  if (!locationId) return NextResponse.json({ error: "locationId requerido" }, { status: 400 });

  // ── Fetch org + location + classes + coaches + spaces ──────────────────────
  const [location, activeClasses, coachProfiles, spaces, existingSchedules] = await Promise.all([
    db.location.findFirst({ where: { id: locationId, organizationId: orgId } }),
    db.class.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, duration: true, maxCapacity: true, color: true, category: true },
    }),
    db.coachProfile.findMany({
      where: { user: { organizationId: orgId, isActive: true } },
      include: {
        user: { select: { firstName: true, lastName: true } },
        availability: { where: { isActive: true } },
        compensationRules: { where: { effectiveTo: null }, select: { classId: true } },
      },
    }),
    db.space.findMany({
      where: { locationId },
      select: { id: true, name: true, capacity: true },
    }),
    db.classSchedule.findMany({
      where: { class: { organizationId: orgId }, isRecurring: true, isCancelled: false },
      select: {
        id: true, classId: true, dayOfWeek: true, startTime: true, endTime: true,
        coachProfileId: true, spaceId: true,
      },
    }),
  ]);

  if (!location) return NextResponse.json({ error: "Ubicación no encontrada" }, { status: 404 });
  if (activeClasses.length === 0) return NextResponse.json({ error: "No hay clases activas" }, { status: 400 });

  // Build coach-class eligibility map
  const eligibleClassIds = (cp: typeof coachProfiles[0]) => {
    const specific = cp.compensationRules.filter((c) => c.classId !== null).map((c) => c.classId!);
    const hasGlobal = cp.compensationRules.some((c) => c.classId === null);
    return hasGlobal ? activeClasses.map((c) => c.id) : specific;
  };

  // ── Mode: historical ────────────────────────────────────────────────────────
  let demandContext = "";
  let anchorIds: string[] = [];
  let weeksAnalyzed = 0;
  let dataQuality: AIScheduleResult["dataQuality"] = "none";
  let opportunitiesContext = "";

  if (mode === "historical" || mode === "upload") {
    if (mode === "historical") {
      const demand = await computeDemand(orgId);
      weeksAnalyzed = demand.weeksOfData;
      anchorIds = demand.anchors.map((a) => a.classId);

      if (demand.hasData) {
        dataQuality = weeksAnalyzed >= 8 ? "high" : weeksAnalyzed >= 4 ? "medium" : "low";

        const slotLines = demand.slots
          .slice(0, 40) // top 40 to keep prompt manageable
          .map((s) =>
            `  - ${s.className} | ${DAY_NAMES[s.dayOfWeek]} ${s.startTime} | ` +
            `ocupación: ${Math.round(s.fillRate * 100)}% | ` +
            `lista de espera: ${Math.round(s.waitlistPressure * 10)} personas | ` +
            `retención: ${Math.round(s.retentionScore * 100)}% | ` +
            `rating: ${s.avgRating > 0 ? s.avgRating.toFixed(1) : "sin reseñas"} | ` +
            `${s.isAnchor ? "⚓ ANCLA (NO mover)" : ""}` +
            `(score: ${s.score.toFixed(0)})`
          )
          .join("\n");

        const anchorLines = demand.anchors
          .map((a) => `  - ${a.className} ${DAY_NAMES[a.dayOfWeek]} ${a.startTime} (${a.consecutiveWeeks} semanas consecutivas, ${Math.round(a.fillRate * 100)}% fill)`)
          .join("\n");

        demandContext = `
DATOS HISTÓRICOS (${weeksAnalyzed} semanas analizadas):
Slots con mejor rendimiento:
${slotLines || "  Sin datos"}

Slots ANCLA (no modificar — llevan 8+ semanas consecutivas con >60% ocupación):
${anchorLines || "  Ninguno detectado"}`;

        if (demand.topOpportunities.length > 0) {
          opportunitiesContext = `
OPORTUNIDADES DETECTADAS (alta demanda sin segunda sesión):
${demand.topOpportunities.map((o) =>
  `  - ${o.className} ${DAY_NAMES[o.dayOfWeek]} ${o.startTime}: ${o.waitlistCount} en lista de espera, ${Math.round(o.fillRate * 100)}% ocupación`
).join("\n")}`;
        }
      } else {
        dataQuality = "none";
        demandContext = `DATOS HISTÓRICOS: Insuficientes (${weeksAnalyzed} semanas). Usar mejores prácticas de la industria.`;
      }
    }

    // For upload mode, CSV context is injected below
  }

  // ── Mode: new_studio / fallback ─────────────────────────────────────────────
  let bestPracticeContext = "";
  if (mode === "new_studio" || dataQuality === "none") {
    const config = newStudioConfig ?? {
      studioType: "mixed" as const,
      classNames: activeClasses.map((c) => c.name),
      operatingDays: [1, 2, 3, 4, 5, 6],
      peakHoursType: "both" as const,
      targetDemo: "mixed" as const,
    };
    const peakSlots = getNewStudioPeakSlots(config);
    bestPracticeContext = `
MEJORES PRÁCTICAS PARA ESTUDIO NUEVO (tipo: ${config.studioType}, demo: ${config.targetDemo}):
Horarios de mayor demanda histórica en estudios similares:
${peakSlots.slice(0, 20).map((s) =>
  `  - ${DAY_NAMES[s.dayOfWeek]} ${s.startTime} (score industria: ${s.priorityScore}/100) — ${s.rationale}`
).join("\n")}

Principios fundamentales de programación:
- Las 18:00-19:00 de lunes a viernes son la hora de mayor demanda universal en fitness
- Sábado 09:00-11:00 es la segunda ventana más popular
- Nunca programar más de 2 clases intensas consecutivas en el mismo espacio
- Siempre dejar al menos 15 min entre clases para salida/entrada
- Lunes y miércoles tienen 30% más demanda que jueves y viernes
- Mantener al menos 1 clase introductoria/de bajo impacto por cada 3 de alto impacto`;
    dataQuality = "none";
    weeksAnalyzed = 0;
  }

  // ── Build coach & class context ──────────────────────────────────────────────
  const classContext = activeClasses.map((c) =>
    `  - ${c.name} (id:${c.id}) | ${c.duration} min | cap: ${c.maxCapacity} | cat: ${c.category ?? "general"}`
  ).join("\n");

  const coachContext = coachProfiles.map((cp) => {
    const name = `${cp.user.firstName} ${cp.user.lastName}`;
    const avail = cp.availability.map((a) =>
      `${DAY_NAMES[a.dayOfWeek]} ${a.startTime}-${a.endTime}`
    ).join(", ");
    const eligible = eligibleClassIds(cp).map((id) =>
      activeClasses.find((c) => c.id === id)?.name
    ).filter(Boolean).join(", ");
    return `  - ${name} (id:${cp.id}) | disponible: ${avail || "no configurado"} | clases: ${eligible || "todas"}`;
  }).join("\n");

  const spaceContext = spaces.map((s) => `  - ${s.name} (id:${s.id}) cap: ${s.capacity}`).join("\n");

  const existingContext = existingSchedules.length > 0
    ? existingSchedules.map((s) => {
        const cls = activeClasses.find((c) => c.id === s.classId);
        const coach = coachProfiles.find((cp) => cp.id === s.coachProfileId);
        return `  - ${cls?.name ?? s.classId} | ${DAY_NAMES[s.dayOfWeek]} ${s.startTime} | coach: ${coach ? `${coach.user.firstName} ${coach.user.lastName}` : "sin coach"}`;
      }).join("\n")
    : "  (sin horario existente — estudio nuevo)";

  // ── Upload mode: prepend CSV context ────────────────────────────────────────
  const uploadContext = csvData
    ? `
DATOS IMPORTADOS DE PLATAFORMA ANTERIOR (analiza los patrones de este reporte):
\`\`\`
${csvData.slice(0, 6000)}
\`\`\`
Extrae de estos datos: qué clases tenían mayor asistencia, en qué días/horarios, y úsalos como señales de demanda junto con las mejores prácticas.`
    : "";

  // ── Build the full Claude prompt ──────────────────────────────────────────────
  const prompt = `Eres el motor de inteligencia para la programación de horarios de un estudio de bienestar en México. Tu objetivo es generar el horario semanal óptimo que maximice ocupación, retención de clientes e ingresos.

CLASES DISPONIBLES:
${classContext}

COACHES Y DISPONIBILIDAD:
${coachContext || "  Sin coaches configurados"}

ESPACIOS:
${spaceContext || "  Sin espacios configurados"}

HORARIO ACTUAL:
${existingContext}
${demandContext}
${bestPracticeContext}
${opportunitiesContext}
${uploadContext}

REGLAS OBLIGATORIAS:
1. Nunca asignar un coach en un horario fuera de su disponibilidad
2. Nunca poner dos clases al mismo tiempo en el mismo espacio
3. Nunca poner al mismo coach en dos clases simultáneas
4. Respetar slots ANCLA — no moverlos ni eliminarlos
5. Dejar al menos 15 min entre clases del mismo coach o espacio
6. No más de 6 clases por día por espacio
7. Distribuir clases entre todos los días disponibles

OBJETIVO: Generar un horario completo para toda la semana.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "summary": "Resumen en español de 3-4 oraciones explicando la lógica general del horario propuesto",
  "suggestions": [
    {
      "classId": "id de la clase",
      "className": "nombre de la clase",
      "coachProfileId": "id del coach profile o null",
      "coachName": "nombre del coach o Sin asignar",
      "spaceId": "id del espacio o null",
      "spaceName": "nombre del espacio o Sin espacio",
      "dayOfWeek": 1,
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "score": 85,
      "reasoning": "Explicación en español de 1-2 oraciones de por qué este slot específico",
      "isAnchor": false
    }
  ],
  "opportunities": [
    {
      "classId": "id",
      "className": "nombre",
      "message": "Descripción de la oportunidad en español"
    }
  ],
  "unschedulable": [
    {
      "classId": "id",
      "className": "nombre",
      "reason": "Razón en español"
    }
  ]
}`;

  // ── Call Claude ──────────────────────────────────────────────────────────────
  let aiResponse: {
    summary: string;
    suggestions: {
      classId: string;
      className: string;
      coachProfileId: string | null;
      coachName: string;
      spaceId: string | null;
      spaceName: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      score: number;
      reasoning: string;
      isAnchor: boolean;
    }[];
    opportunities: { classId: string; className: string; message: string }[];
    unschedulable: { classId: string; className: string; reason: string }[];
  };

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    aiResponse = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Claude AI suggest error:", err);
    return NextResponse.json({ error: "Error generando horario con IA. Verifica la API key de Claude." }, { status: 500 });
  }

  // ── Post-process: validate conflicts, add metadata ─────────────────────────
  // Build busy maps for conflict validation
  const coachBusy = new Map<string, { dayOfWeek: number; startMin: number; endMin: number }[]>();
  const spaceBusy = new Map<string, { dayOfWeek: number; startMin: number; endMin: number }[]>();

  // Seed from existing schedules (anchors keep their slots)
  for (const s of existingSchedules) {
    const startMin = timeToMinutes(s.startTime);
    const endMin = timeToMinutes(s.endTime);
    if (s.coachProfileId) {
      if (!coachBusy.has(s.coachProfileId)) coachBusy.set(s.coachProfileId, []);
      coachBusy.get(s.coachProfileId)!.push({ dayOfWeek: s.dayOfWeek, startMin, endMin });
    }
    if (s.spaceId) {
      if (!spaceBusy.has(s.spaceId)) spaceBusy.set(s.spaceId, []);
      spaceBusy.get(s.spaceId)!.push({ dayOfWeek: s.dayOfWeek, startMin, endMin });
    }
  }

  const validatedSuggestions: AISuggestion[] = [];
  const conflictSkipped: AIScheduleResult["unschedulable"] = [];

  for (const s of aiResponse.suggestions ?? []) {
    const cls = activeClasses.find((c) => c.id === s.classId);
    if (!cls) continue;

    // Derive endTime from class duration if not provided
    const startMin = timeToMinutes(s.startTime);
    const endMin = s.endTime ? timeToMinutes(s.endTime) : startMin + cls.duration;
    const endTime = minutesToTime(endMin);

    // Validate coach conflict
    if (s.coachProfileId) {
      const busy = coachBusy.get(s.coachProfileId) ?? [];
      const conflict = busy.some(
        (b) => b.dayOfWeek === s.dayOfWeek && overlaps(startMin, endMin, b.startMin, b.endMin)
      );
      if (conflict) {
        conflictSkipped.push({ classId: s.classId, className: s.className, reason: "Conflicto de coach" });
        continue;
      }
    }

    // Validate space conflict
    if (s.spaceId) {
      const busy = spaceBusy.get(s.spaceId) ?? [];
      const conflict = busy.some(
        (b) => b.dayOfWeek === s.dayOfWeek && overlaps(startMin, endMin, b.startMin, b.endMin)
      );
      if (conflict) {
        conflictSkipped.push({ classId: s.classId, className: s.className, reason: "Conflicto de espacio" });
        continue;
      }
    }

    // Mark busy
    if (s.coachProfileId) {
      if (!coachBusy.has(s.coachProfileId)) coachBusy.set(s.coachProfileId, []);
      coachBusy.get(s.coachProfileId)!.push({ dayOfWeek: s.dayOfWeek, startMin, endMin });
    }
    if (s.spaceId) {
      if (!spaceBusy.has(s.spaceId)) spaceBusy.set(s.spaceId, []);
      spaceBusy.get(s.spaceId)!.push({ dayOfWeek: s.dayOfWeek, startMin, endMin });
    }

    const isNew = !existingSchedules.some(
      (e) => e.classId === s.classId && e.dayOfWeek === s.dayOfWeek && e.startTime === s.startTime
    );

    validatedSuggestions.push({
      classId: s.classId,
      className: s.className,
      classColor: cls.color,
      coachProfileId: s.coachProfileId ?? null,
      coachName: s.coachName ?? "Sin asignar",
      spaceId: s.spaceId ?? null,
      spaceName: s.spaceName ?? "Sin espacio",
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime,
      locationId,
      score: s.score ?? 75,
      reasoning: s.reasoning ?? "",
      isAnchor: anchorIds.includes(s.classId) || s.isAnchor,
      isNew,
      dataSource: mode === "upload" ? "upload" : dataQuality === "none" ? "best_practice" : "historical",
    });
  }

  const result: AIScheduleResult = {
    mode,
    suggestions: validatedSuggestions,
    anchors: anchorIds,
    aiSummary: aiResponse.summary ?? "",
    opportunities: aiResponse.opportunities ?? [],
    unschedulable: [
      ...(aiResponse.unschedulable ?? []),
      ...conflictSkipped,
    ],
    dataQuality,
    weeksAnalyzed,
  };

  return NextResponse.json(result);
}
