// Auto-schedule algorithm: greedy, most-constrained-first
// Pure function — no DB dependencies, fully testable

// ─── Input Types ────────────────────────────────────────────

export interface ClassInput {
  id: string;
  name: string;
  duration: number; // minutes
  maxCapacity: number;
  category: string | null;
  color: string;
}

export interface CoachAvailabilitySlot {
  coachProfileId: string;
  coachName: string;
  dayOfWeek: number; // 0-6
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface ExistingSchedule {
  id: string;
  classId: string;
  coachProfileId: string | null;
  spaceId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface SpaceInput {
  id: string;
  name: string;
  capacity: number;
}

export interface CoachClassLink {
  coachProfileId: string;
  classId: string;
}

export interface AutoScheduleInput {
  classes: ClassInput[];
  coachAvailability: CoachAvailabilitySlot[];
  existingSchedules: ExistingSchedule[];
  spaces: SpaceInput[];
  coachClassLinks: CoachClassLink[];
  locationId: string;
}

// ─── Output Types ───────────────────────────────────────────

export interface ScheduleSuggestion {
  classId: string;
  className: string;
  classColor: string;
  coachProfileId: string;
  coachName: string;
  spaceId: string;
  spaceName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string;
  score: number;
}

export interface UnschedulableClass {
  classId: string;
  className: string;
  reason: string;
}

export interface AutoScheduleResult {
  suggestions: ScheduleSuggestion[];
  unschedulable: UnschedulableClass[];
  stats: {
    totalCandidates: number;
    scheduled: number;
    unscheduled: number;
  };
}

// ─── Helpers ────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ─── Algorithm ──────────────────────────────────────────────

export function autoSchedule(input: AutoScheduleInput): AutoScheduleResult {
  const {
    classes,
    coachAvailability,
    existingSchedules,
    spaces,
    coachClassLinks,
    locationId,
  } = input;

  // 1. Find classes with NO recurring schedules
  const scheduledClassIds = new Set(existingSchedules.map((s) => s.classId));
  const unscheduledClasses = classes.filter((c) => !scheduledClassIds.has(c.id));

  if (unscheduledClasses.length === 0) {
    return {
      suggestions: [],
      unschedulable: [],
      stats: { totalCandidates: 0, scheduled: 0, unscheduled: 0 },
    };
  }

  // 2. Build coach-class map from CoachCompensation + existing schedule pairings
  const coachClassMap = new Map<string, Set<string>>(); // classId -> Set<coachProfileId>

  for (const link of coachClassLinks) {
    if (!coachClassMap.has(link.classId)) {
      coachClassMap.set(link.classId, new Set());
    }
    coachClassMap.get(link.classId)!.add(link.coachProfileId);
  }

  // Also extract coach-class links from existing schedules as fallback
  for (const sched of existingSchedules) {
    if (sched.coachProfileId) {
      if (!coachClassMap.has(sched.classId)) {
        coachClassMap.set(sched.classId, new Set());
      }
      coachClassMap.get(sched.classId)!.add(sched.coachProfileId);
    }
  }

  // 3. Sort unscheduled classes by constraint level (fewest coaches first)
  const sortedClasses = [...unscheduledClasses].sort((a, b) => {
    const coachesA = coachClassMap.get(a.id)?.size ?? 0;
    const coachesB = coachClassMap.get(b.id)?.size ?? 0;
    return coachesA - coachesB;
  });

  // Track occupied slots as we build suggestions
  // coach -> array of { dayOfWeek, startMin, endMin }
  const coachBusy = new Map<string, { dayOfWeek: number; startMin: number; endMin: number }[]>();
  // space -> array of { dayOfWeek, startMin, endMin }
  const spaceBusy = new Map<string, { dayOfWeek: number; startMin: number; endMin: number }[]>();

  // Seed busy maps from existing schedules
  for (const s of existingSchedules) {
    const startMin = timeToMinutes(s.startTime);
    const endMin = timeToMinutes(s.endTime);
    const slot = { dayOfWeek: s.dayOfWeek, startMin, endMin };

    if (s.coachProfileId) {
      if (!coachBusy.has(s.coachProfileId)) coachBusy.set(s.coachProfileId, []);
      coachBusy.get(s.coachProfileId)!.push(slot);
    }
    if (s.spaceId) {
      if (!spaceBusy.has(s.spaceId)) spaceBusy.set(s.spaceId, []);
      spaceBusy.get(s.spaceId)!.push(slot);
    }
  }

  // Track day distribution for scoring
  const dayCount = new Map<number, number>();
  for (const s of existingSchedules) {
    dayCount.set(s.dayOfWeek, (dayCount.get(s.dayOfWeek) ?? 0) + 1);
  }

  const suggestions: ScheduleSuggestion[] = [];
  const unschedulable: UnschedulableClass[] = [];

  // 4. For each class, generate and score candidates
  for (const cls of sortedClasses) {
    const linkedCoaches = coachClassMap.get(cls.id);

    if (!linkedCoaches || linkedCoaches.size === 0) {
      unschedulable.push({
        classId: cls.id,
        className: cls.name,
        reason: "Sin coach asignado",
      });
      continue;
    }

    if (coachAvailability.length === 0) {
      unschedulable.push({
        classId: cls.id,
        className: cls.name,
        reason: "No hay disponibilidad de coaches configurada",
      });
      continue;
    }

    interface Candidate {
      coachProfileId: string;
      coachName: string;
      dayOfWeek: number;
      startMin: number;
      endMin: number;
      spaceId: string;
      spaceName: string;
      score: number;
    }

    const candidates: Candidate[] = [];

    for (const coachId of linkedCoaches) {
      // Get availability windows for this coach
      const windows = coachAvailability.filter(
        (a) => a.coachProfileId === coachId
      );

      for (const window of windows) {
        const windowStart = timeToMinutes(window.startTime);
        const windowEnd = timeToMinutes(window.endTime);

        // Generate 15-min interval start times
        for (
          let startMin = windowStart;
          startMin + cls.duration <= windowEnd;
          startMin += 15
        ) {
          const endMin = startMin + cls.duration;

          // Check coach conflict
          const coachSlots = coachBusy.get(coachId) ?? [];
          const coachConflict = coachSlots.some(
            (s) =>
              s.dayOfWeek === window.dayOfWeek &&
              overlaps(startMin, endMin, s.startMin, s.endMin)
          );
          if (coachConflict) continue;

          // Find a space with sufficient capacity
          for (const space of spaces) {
            if (space.capacity < cls.maxCapacity) continue;

            const spaceSlots = spaceBusy.get(space.id) ?? [];
            const spaceConflict = spaceSlots.some(
              (s) =>
                s.dayOfWeek === window.dayOfWeek &&
                overlaps(startMin, endMin, s.startMin, s.endMin)
            );
            if (spaceConflict) continue;

            // Score candidate (0–100)
            let score = 50; // base

            // Even day distribution: fewer classes this day = higher score
            const thisDay = dayCount.get(window.dayOfWeek) ?? 0;
            const avgPerDay =
              [...dayCount.values()].reduce((a, b) => a + b, 0) / 7;
            if (thisDay <= avgPerDay) score += 20;

            // Avoid time stacking: no other class starts within 30min
            const allBusy = [
              ...(coachBusy.get(coachId) ?? []),
              ...(spaceBusy.get(space.id) ?? []),
            ];
            const nearbyClasses = allBusy.filter(
              (s) =>
                s.dayOfWeek === window.dayOfWeek &&
                Math.abs(s.startMin - startMin) < 30
            );
            if (nearbyClasses.length === 0) score += 15;

            // Category spacing: no same-category class this day
            const sameCategoryToday = suggestions.some(
              (s) =>
                s.dayOfWeek === window.dayOfWeek &&
                cls.category &&
                existingSchedules.some(
                  (es) =>
                    es.dayOfWeek === window.dayOfWeek &&
                    classes.find((c) => c.id === es.classId)?.category ===
                      cls.category
                )
            );
            if (!sameCategoryToday && cls.category) score += 10;

            // Prime time bonus (7-9 AM or 17-20 PM)
            const startHour = startMin / 60;
            if (
              (startHour >= 7 && startHour < 9) ||
              (startHour >= 17 && startHour < 20)
            ) {
              score += 10;
            }

            // Space capacity fit: closer to class capacity = better
            const capacityRatio = cls.maxCapacity / space.capacity;
            if (capacityRatio >= 0.5 && capacityRatio <= 1) score += 5;

            candidates.push({
              coachProfileId: coachId,
              coachName: window.coachName,
              dayOfWeek: window.dayOfWeek,
              startMin,
              endMin,
              spaceId: space.id,
              spaceName: space.name,
              score,
            });
          }
        }
      }
    }

    if (candidates.length === 0) {
      unschedulable.push({
        classId: cls.id,
        className: cls.name,
        reason: "No hay horario disponible compatible con coach y espacio",
      });
      continue;
    }

    // 5-6. Pick highest-scoring slot
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    const suggestion: ScheduleSuggestion = {
      classId: cls.id,
      className: cls.name,
      classColor: cls.color,
      coachProfileId: best.coachProfileId,
      coachName: best.coachName,
      spaceId: best.spaceId,
      spaceName: best.spaceName,
      dayOfWeek: best.dayOfWeek,
      startTime: minutesToTime(best.startMin),
      endTime: minutesToTime(best.endMin),
      locationId,
      score: best.score,
    };

    suggestions.push(suggestion);

    // Update busy maps for future scoring
    const newSlot = {
      dayOfWeek: best.dayOfWeek,
      startMin: best.startMin,
      endMin: best.endMin,
    };

    if (!coachBusy.has(best.coachProfileId))
      coachBusy.set(best.coachProfileId, []);
    coachBusy.get(best.coachProfileId)!.push(newSlot);

    if (!spaceBusy.has(best.spaceId)) spaceBusy.set(best.spaceId, []);
    spaceBusy.get(best.spaceId)!.push(newSlot);

    dayCount.set(best.dayOfWeek, (dayCount.get(best.dayOfWeek) ?? 0) + 1);
  }

  return {
    suggestions,
    unschedulable,
    stats: {
      totalCandidates: unscheduledClasses.length,
      scheduled: suggestions.length,
      unscheduled: unschedulable.length,
    },
  };
}
