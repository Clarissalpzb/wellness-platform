"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2, AlertCircle, Search, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getStudioColor, getStudioGradient, buildDates } from "@/lib/booking/helpers";
import type { ScheduleItem, Studio, StudioFilter } from "@/lib/booking/types";
import { ClassCard } from "@/components/booking/class-card";
import { ClassDetailOverlay } from "@/components/booking/class-detail-overlay";
import { StudioCard } from "@/components/booking/studio-card";

export default function ReservarPage() {
  return (
    <Suspense>
      <ReservarContent />
    </Suspense>
  );
}

function ReservarContent() {
  const dates = buildDates();
  const searchParams = useSearchParams();
  const purchaseCancelled = searchParams.get("purchase") === "cancelled";

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayIndex = dates.findIndex((d) => d.iso === todayIso);

  // ── Studios from API ──
  const [studios, setStudios] = useState<Studio[]>([]);
  const [studiosLoading, setStudiosLoading] = useState(true);

  // Build lookup maps from studios
  const studioMap = useMemo(() => {
    const map: Record<string, { name: string; color: string; gradient: string }> = {};
    studios.forEach((s, i) => {
      map[s.id] = { name: s.name, color: getStudioColor(i), gradient: getStudioGradient(i) };
    });
    return map;
  }, [studios]);

  // ── Active view ──
  const [activeView, setActiveView] = useState<"clases" | "estudios">("clases");

  // ── Browse view state ──
  const [selectedDay, setSelectedDay] = useState(todayIndex >= 0 ? todayIndex : 0);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [studioFilter, setStudioFilter] = useState<StudioFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");

  // ── User bookings (to show "Reservada" badge) ──
  const [bookedScheduleIds, setBookedScheduleIds] = useState<Set<string>>(new Set());

  // ── User active packages (org IDs) ──
  const [userPackageOrgIds, setUserPackageOrgIds] = useState<Set<string>>(new Set());

  // ── Class detail overlay ──
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // ── Derived ──
  const selectedDateIso = dates[selectedDay]?.iso ?? "";

  const availableCategories = useMemo(() => {
    const source = studioFilter === "all"
      ? schedule
      : schedule.filter((c) => c.organizationId === studioFilter);
    const cats = Array.from(new Set(source.map((c) => c.category)));
    cats.sort();
    return cats;
  }, [schedule, studioFilter]);

  useEffect(() => {
    if (selectedCategory !== "all" && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory("all");
    }
  }, [availableCategories, selectedCategory]);

  const filteredSchedule = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    return schedule.filter((cls) => {
      if (studioFilter !== "all" && cls.organizationId !== studioFilter) return false;
      if (selectedCategory !== "all" && cls.category !== selectedCategory) return false;
      if (selectedLevel !== "all" && cls.level !== selectedLevel) return false;
      if (searchLower && !cls.name.toLowerCase().includes(searchLower) && !cls.coach.toLowerCase().includes(searchLower)) return false;
      return true;
    });
  }, [schedule, studioFilter, selectedCategory, selectedLevel, search]);

  const hasActiveFilters = studioFilter !== "all" || search !== "" || selectedCategory !== "all" || selectedLevel !== "all";

  const clearFilters = () => {
    setStudioFilter("all");
    setSearch("");
    setSelectedCategory("all");
    setSelectedLevel("all");
  };

  // Studio class counts for studio cards
  const studioClassCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cls of schedule) {
      counts[cls.organizationId] = (counts[cls.organizationId] || 0) + 1;
    }
    return counts;
  }, [schedule]);

  // ── Fetch studios ──
  useEffect(() => {
    async function loadStudios() {
      try {
        const res = await fetch("/api/studios");
        if (res.ok) {
          const data: Studio[] = await res.json();
          setStudios(data);
        }
      } catch {
        // silently fail
      } finally {
        setStudiosLoading(false);
      }
    }
    loadStudios();
  }, []);

  // ── Fetch user bookings for selected date ──
  const fetchBookings = useCallback(async (dateStr: string) => {
    try {
      const res = await fetch(`/api/bookings?upcoming=true`);
      if (!res.ok) return;
      const data: any[] = await res.json();
      const ids = new Set<string>();
      for (const b of data) {
        const bDate = new Date(b.date).toISOString().slice(0, 10);
        if (bDate === dateStr && b.status !== "CANCELLED") {
          ids.add(b.classScheduleId);
        }
      }
      setBookedScheduleIds(ids);
    } catch {
      // silently fail
    }
  }, []);

  // ── Fetch user active packages ──
  const fetchUserPackages = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = await res.json();
      const orgIds = new Set<string>(
        (data.packages ?? []).map((p: any) => p.organizationId)
      );
      setUserPackageOrgIds(orgIds);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchUserPackages();
  }, [fetchUserPackages]);

  // ── Fetch schedule for all studios ──
  const fetchSchedule = useCallback(async (dateStr: string) => {
    if (studios.length === 0) return;
    setLoading(true);
    try {
      const allSchedules = await Promise.all(
        studios.map(async (studio) => {
          const res = await fetch(`/api/schedule?date=${dateStr}&orgId=${studio.id}`);
          if (!res.ok) return [];
          const data: ScheduleItem[] = await res.json();
          return data;
        })
      );
      setSchedule(allSchedules.flat());
    } catch {
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }, [studios]);

  useEffect(() => {
    if (selectedDateIso && studios.length > 0) fetchSchedule(selectedDateIso);
    if (selectedDateIso) fetchBookings(selectedDateIso);
  }, [selectedDateIso, fetchSchedule, fetchBookings, studios]);

  // ── Navigation handlers ──
  function openClassDetail(cls: ScheduleItem) {
    setSelectedClassId(cls.id);
  }

  function closeClassDetail() {
    setSelectedClassId(null);
  }

  // Helper to get studio name / color for a schedule item
  function getStudioName(orgId: string) {
    return studioMap[orgId]?.name ?? "";
  }
  function getStudioColorById(orgId: string) {
    return studioMap[orgId]?.color ?? "#6b7280";
  }

  const detailClass = selectedClassId ? schedule.find((c) => c.id === selectedClassId) : null;
  const detailStudioInfo = detailClass ? studioMap[detailClass.organizationId] : null;

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {purchaseCancelled && (
        <div className="flex items-center gap-2 text-sm p-4 rounded-xl bg-amber-50 text-amber-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>El pago fue cancelado. Puedes intentar de nuevo cuando quieras.</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Reservar Clase</h1>
        <p className="text-sm text-neutral-500">Selecciona una clase para reservar</p>
      </div>

      {/* Toggle: Clases / Estudios */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "clases" | "estudios")}>
        <TabsList className="w-full">
          <TabsTrigger value="clases" className="flex-1">Clases</TabsTrigger>
          <TabsTrigger value="estudios" className="flex-1">Estudios</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* CLASES VIEW                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="clases">
          <div className="space-y-4 mt-2">
            {/* Studio filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setStudioFilter("all")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  studioFilter === "all"
                    ? "bg-neutral-900 text-white"
                    : "bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400"
                )}
              >
                Todas
              </button>
              {studiosLoading ? (
                <div className="flex items-center px-4">
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                </div>
              ) : (
                studios.map((studio, i) => (
                  <button
                    key={studio.id}
                    onClick={() => setStudioFilter(studio.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                      studioFilter === studio.id
                        ? "bg-neutral-900 text-white"
                        : "bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400"
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: getStudioColor(i) }}
                    />
                    {studio.name}
                  </button>
                ))
              )}
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Buscar clase o coach..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter dropdowns */}
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los niveles</SelectItem>
                  <SelectItem value="Principiante">Principiante</SelectItem>
                  <SelectItem value="Intermedio">Intermedio</SelectItem>
                  <SelectItem value="Avanzado">Avanzado</SelectItem>
                  <SelectItem value="Todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active filter badges */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                {studioFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setStudioFilter("all")}>
                    {getStudioName(studioFilter)}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {search && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSearch("")}>
                    &ldquo;{search}&rdquo;
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {selectedCategory !== "all" && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSelectedCategory("all")}>
                    {selectedCategory}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {selectedLevel !== "all" && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSelectedLevel("all")}>
                    {selectedLevel}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                <button onClick={clearFilters} className="text-xs text-primary-600 hover:underline ml-1">
                  Limpiar filtros
                </button>
              </div>
            )}

            {!loading && (
              <p className="text-xs text-neutral-400">
                {filteredSchedule.length} {filteredSchedule.length === 1 ? "clase disponible" : "clases disponibles"}
              </p>
            )}

            {/* Date selector */}
            <div className="flex justify-center gap-2 overflow-x-auto">
              {dates.map((d, i) => (
                <button
                  key={d.iso}
                  onClick={() => setSelectedDay(i)}
                  className={cn(
                    "flex flex-col items-center px-4 py-2 rounded-xl min-w-[60px] transition-colors",
                    selectedDay === i
                      ? "bg-primary-500 text-white"
                      : "bg-white border border-neutral-200 text-neutral-600 hover:border-primary-300"
                  )}
                >
                  <span className="text-xs font-medium">{d.day}</span>
                  <span className="text-lg font-bold">{d.date}</span>
                  <span className="text-xs">{d.month}</span>
                </button>
              ))}
            </div>

            {/* Class list */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                <span className="ml-2 text-sm text-neutral-500">Cargando horarios...</span>
              </div>
            ) : schedule.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
                <p className="text-neutral-500">No hay clases programadas para este día.</p>
              </div>
            ) : filteredSchedule.length === 0 ? (
              <div className="text-center py-16">
                <Search className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
                <p className="text-neutral-500">No hay clases que coincidan con tus filtros.</p>
                <button onClick={clearFilters} className="mt-2 text-sm text-primary-600 hover:underline">
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSchedule.map((cls) => (
                  <ClassCard
                    key={cls.id}
                    classItem={cls}
                    variant="browse"
                    isBooked={bookedScheduleIds.has(cls.id)}
                    studioName={getStudioName(cls.organizationId)}
                    studioColor={getStudioColorById(cls.organizationId)}
                    showStudioBadge={studioFilter === "all"}
                    onClick={() => openClassDetail(cls)}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ESTUDIOS VIEW                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="estudios">
          <div className="mt-2">
            {studiosLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                <span className="ml-2 text-sm text-neutral-500">Cargando estudios...</span>
              </div>
            ) : studios.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
                <p className="text-neutral-500">No hay estudios disponibles.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {studios.map((studio, i) => (
                  <StudioCard
                    key={studio.id}
                    studio={studio}
                    color={getStudioColor(i)}
                    gradient={getStudioGradient(i)}
                    classCount={studioClassCounts[studio.id] ?? 0}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Class detail overlay */}
      {selectedClassId && detailClass && (
        <ClassDetailOverlay
          classItem={detailClass}
          studioColor={detailStudioInfo?.color ?? "#6b7280"}
          studioGradient={detailStudioInfo?.gradient ?? "from-neutral-900 to-neutral-700"}
          dateIso={selectedDateIso}
          hasActivePackage={userPackageOrgIds.has(detailClass.organizationId)}
          onClose={closeClassDetail}
          onGoToPackages={() => {
            closeClassDetail();
            window.location.href = `/app/studio/${detailClass.organizationId}?tab=paquetes`;
          }}
          onBookingComplete={() => {
            fetchSchedule(selectedDateIso);
            fetchBookings(selectedDateIso);
          }}
        />
      )}
    </div>
  );
}
