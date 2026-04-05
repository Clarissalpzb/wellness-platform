// Demand Engine — historical behavioral scoring for schedule optimization
// Queries real booking data to compute how valuable each (class × day × time) slot is.
// Pure DB queries, no AI calls. Used as input to the AI suggest route.

import { db } from "@/lib/db";

// ─── Output types ────────────────────────────────────────────────────────────

export interface DemandSlot {
  classId: string;
  className: string;
  classColor: string;
  dayOfWeek: number;       // 0=Sun … 6=Sat
  startTime: string;       // "HH:mm"
  endTime: string;
  score: number;           // 0–100 composite
  fillRate: number;        // 0–1  (avg across sessions)
  waitlistPressure: number;// 0–1  (normalised waitlist count)
  retentionScore: number;  // 0–1  (% of attendees who rebooked within 30d)
  revenueScore: number;    // 0–1  (avg revenue per session relative to org avg)
  avgRating: number;       // 1–5  (0 if no reviews)
  sessionsAnalyzed: number;
  isAnchor: boolean;       // 8+ consecutive weeks & avg fill ≥ 60%
  scheduleId: string;      // the existing ClassSchedule id, if any
}

export interface AnchorSlot {
  scheduleId: string;
  classId: string;
  className: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  coachProfileId: string | null;
  spaceId: string | null;
  fillRate: number;
  consecutiveWeeks: number;
}

export interface DemandEngineResult {
  slots: DemandSlot[];
  anchors: AnchorSlot[];
  hasData: boolean;        // false when studio has <3 weeks of bookings
  weeksOfData: number;
  topOpportunities: {      // waitlist > 5, no second session scheduled
    classId: string;
    className: string;
    dayOfWeek: number;
    startTime: string;
    waitlistCount: number;
    fillRate: number;
  }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function floorToWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function computeDemand(orgId: string): Promise<DemandEngineResult> {
  const now = new Date();
  const twelveWeeksAgo = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo  = new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000);

  // 1. Pull all recurring schedules for the org, with bookings + reviews
  const schedules = await db.classSchedule.findMany({
    where: {
      class: { organizationId: orgId },
      isRecurring: true,
      isCancelled: false,
    },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          color: true,
          maxCapacity: true,
          duration: true,
        },
      },
      bookings: {
        where: {
          date: { gte: twelveWeeksAgo },
          status: { not: "CANCELLED" },
        },
        select: { id: true, date: true, userId: true },
      },
      waitlist: {
        select: { id: true },
      },
      reviews: {
        select: { rating: true },
      },
      coachProfile: {
        select: { id: true },
      },
    },
  });

  if (schedules.length === 0) {
    return { slots: [], anchors: [], hasData: false, weeksOfData: 0, topOpportunities: [] };
  }

  // 2. Determine total weeks of data
  const allDates = schedules.flatMap((s) => s.bookings.map((b) => b.date));
  const weeks = new Set(allDates.map(floorToWeek));
  const weeksOfData = weeks.size;

  // 3. Build a user-booking map for retention scoring
  //    userId → Set of booking dates (last 30d) to check if they rebooked
  const recentUserBookings = await db.booking.findMany({
    where: {
      classSchedule: { class: { organizationId: orgId } },
      date: { gte: thirtyDaysAgo },
      status: { not: "CANCELLED" },
    },
    select: { userId: true, date: true },
  });
  const recentUserSet = new Set(
    recentUserBookings.map((b) => `${b.userId}:${b.date.toISOString().slice(0, 10)}`)
  );

  // 4. Compute org-wide avg revenue per booking for normalisation
  const orgRevResult = await db.transaction.aggregate({
    where: { organizationId: orgId },
    _avg: { amount: true },
    _count: true,
  });
  const avgRevPerBooking = orgRevResult._avg.amount ?? 1;

  // 5. Score each schedule
  const slots: DemandSlot[] = [];
  const anchors: AnchorSlot[] = [];
  const topOpportunities: DemandEngineResult["topOpportunities"] = [];

  for (const sched of schedules) {
    const { bookings, waitlist, reviews, class: cls } = sched;

    if (bookings.length === 0) continue; // skip if truly no history

    // --- Fill rate ---
    const sessionDates = new Set(bookings.map((b) => b.date.toISOString().slice(0, 10)));
    const sessionsCount = sessionDates.size;
    const avgBookingsPerSession = bookings.length / sessionsCount;
    const fillRate = Math.min(avgBookingsPerSession / cls.maxCapacity, 1);

    // --- Waitlist pressure ---
    const waitlistCount = waitlist.length;
    const waitlistPressure = Math.min(waitlistCount / 10, 1); // saturates at 10 people

    // --- Retention score ---
    // For each attendee in this slot, did they book anything else in the next 30 days?
    const attendeeIds = [...new Set(bookings.map((b) => b.userId))];
    const retained = attendeeIds.filter((userId) => {
      // Check if this user has any recent booking (rough proxy for retention)
      return recentUserSet.has(`${userId}:`) ||
        recentUserBookings.some((rb) => rb.userId === userId);
    });
    const retentionScore = attendeeIds.length > 0 ? retained.length / attendeeIds.length : 0;

    // --- Review score ---
    const avgRating = reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;
    const reviewScore = avgRating / 5; // normalise to 0–1

    // --- Revenue score ---
    // Use avg revenue per booking vs org average
    const revenueScore = Math.min(avgRevPerBooking / Math.max(avgRevPerBooking, 1), 1);

    // --- Composite score (0–100) ---
    const score = Math.round(
      fillRate        * 40 +
      waitlistPressure * 20 +
      retentionScore  * 20 +
      revenueScore    * 10 +
      reviewScore     * 10
    ) * 100 / 100;

    // --- Anchor detection ---
    // Group bookings by week and count consecutive weeks with presence
    const weekSet = new Set(bookings.map((b) => floorToWeek(b.date)));
    const sortedWeeks = [...weekSet].sort();
    let consecutive = 0;
    let maxConsecutive = 0;
    let prevWeekMs: number | null = null;
    for (const w of sortedWeeks) {
      const ms = new Date(w).getTime();
      if (prevWeekMs !== null && ms - prevWeekMs === 7 * 24 * 60 * 60 * 1000) {
        consecutive++;
      } else {
        consecutive = 1;
      }
      maxConsecutive = Math.max(maxConsecutive, consecutive);
      prevWeekMs = ms;
    }
    const isAnchor = maxConsecutive >= 8 && fillRate >= 0.6;

    const slot: DemandSlot = {
      classId: cls.id,
      className: cls.name,
      classColor: cls.color,
      dayOfWeek: sched.dayOfWeek,
      startTime: sched.startTime,
      endTime: sched.endTime,
      score,
      fillRate,
      waitlistPressure,
      retentionScore,
      revenueScore,
      avgRating,
      sessionsAnalyzed: sessionsCount,
      isAnchor,
      scheduleId: sched.id,
    };

    slots.push(slot);

    if (isAnchor) {
      anchors.push({
        scheduleId: sched.id,
        classId: cls.id,
        className: cls.name,
        dayOfWeek: sched.dayOfWeek,
        startTime: sched.startTime,
        endTime: sched.endTime,
        coachProfileId: sched.coachProfileId,
        spaceId: sched.spaceId,
        fillRate,
        consecutiveWeeks: maxConsecutive,
      });
    }

    // Opportunity: high waitlist, no duplicate slot same day
    const hasDuplicateSlot = schedules.some(
      (other) =>
        other.id !== sched.id &&
        other.classId === cls.id &&
        other.dayOfWeek === sched.dayOfWeek
    );
    if (waitlistCount >= 5 && !hasDuplicateSlot) {
      topOpportunities.push({
        classId: cls.id,
        className: cls.name,
        dayOfWeek: sched.dayOfWeek,
        startTime: sched.startTime,
        waitlistCount,
        fillRate,
      });
    }
  }

  slots.sort((a, b) => b.score - a.score);

  return {
    slots,
    anchors,
    hasData: weeksOfData >= 3,
    weeksOfData,
    topOpportunities,
  };
}

// ─── Industry best-practice defaults for new studios ─────────────────────────

export interface NewStudioInput {
  studioType: "yoga" | "pilates" | "gym" | "crossfit" | "dance" | "mixed";
  classNames: string[];    // what classes the studio has
  operatingDays: number[]; // 0–6, days the studio is open
  peakHoursType: "morning" | "evening" | "both" | "midday";
  targetDemo: "families" | "young_professionals" | "seniors" | "mixed";
}

export interface PeakSlot {
  dayOfWeek: number;
  startTime: string;
  priorityScore: number; // 0–100 recommendation strength
  rationale: string;
}

export function getNewStudioPeakSlots(input: NewStudioInput): PeakSlot[] {
  const { operatingDays, peakHoursType, targetDemo, studioType } = input;

  const peaks: { time: string; score: number; label: string }[] = [];

  // Morning peak
  if (peakHoursType === "morning" || peakHoursType === "both") {
    peaks.push({ time: "07:00", score: 85, label: "Mañana temprano (commuters)" });
    peaks.push({ time: "09:00", score: 75, label: "Media mañana" });
    if (targetDemo === "families" || targetDemo === "mixed") {
      peaks.push({ time: "10:00", score: 65, label: "Mañana (papás/mamás)" });
    }
  }

  // Midday peak
  if (peakHoursType === "midday" || peakHoursType === "both") {
    peaks.push({ time: "12:00", score: 70, label: "Mediodía (lunch break)" });
    peaks.push({ time: "13:00", score: 65, label: "Hora de comida" });
  }

  // Evening peak (most common for fitness)
  if (peakHoursType === "evening" || peakHoursType === "both") {
    peaks.push({ time: "17:00", score: 90, label: "Tarde (salida del trabajo)" });
    peaks.push({ time: "18:00", score: 95, label: "Tarde-noche (hora pico)" });
    peaks.push({ time: "19:00", score: 88, label: "Noche" });
    if (studioType !== "crossfit") {
      peaks.push({ time: "20:00", score: 72, label: "Noche tardía" });
    }
  }

  // Saturday morning is universally strong
  const slots: PeakSlot[] = [];
  for (const day of operatingDays) {
    for (const peak of peaks) {
      let score = peak.score;

      // Saturday morning boost
      if (day === 6 && peak.time.startsWith("09") || peak.time.startsWith("10")) score += 5;
      // Sunday afternoon is softer
      if (day === 0 && parseInt(peak.time) >= 17) score -= 10;
      // Weekday evenings strongest
      if (day >= 1 && day <= 5 && parseInt(peak.time) >= 17) score += 5;
      // Monday morning motivation boost
      if (day === 1 && peak.time.startsWith("07")) score += 8;

      slots.push({
        dayOfWeek: day,
        startTime: peak.time,
        priorityScore: Math.min(100, Math.max(0, score)),
        rationale: peak.label,
      });
    }
  }

  return slots.sort((a, b) => b.priorityScore - a.priorityScore);
}
