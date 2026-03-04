"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, MapPin, Loader2, AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dayHeaders, fullMonthNames } from "@/lib/booking/constants";
import {
  buildDates, formatFullDate, getStudioColor, getStudioGradient,
} from "@/lib/booking/helpers";
import type { ScheduleItem, Studio, PackageItem, TabName } from "@/lib/booking/types";
import { ClassCard } from "@/components/booking/class-card";
import { ClassDetailOverlay } from "@/components/booking/class-detail-overlay";
import { PackageCard } from "@/components/booking/package-card";

export default function StudioPage() {
  return (
    <Suspense>
      <StudioContent />
    </Suspense>
  );
}

function StudioContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studioId = params.id as string;

  const initialTab = (searchParams.get("tab") as TabName) || "sesiones";
  const purchaseCancelled = searchParams.get("purchase") === "cancelled";
  const purchaseSuccess = searchParams.get("purchase") === "success";

  const dates = buildDates();
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayIndex = dates.findIndex((d) => d.iso === todayIso);

  // ── State ──
  const [studios, setStudios] = useState<Studio[]>([]);
  const [studiosLoading, setStudiosLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(todayIndex >= 0 ? todayIndex : 0);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabName>(initialTab);
  const [studioPackages, setStudioPackages] = useState<PackageItem[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [bookedScheduleIds, setBookedScheduleIds] = useState<Set<string>>(new Set());
  const [userPackageOrgIds, setUserPackageOrgIds] = useState<Set<string>>(new Set());
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const selectedDateIso = dates[selectedDay]?.iso ?? "";
  const profileDate = dates[selectedDay];
  const profileMonthLabel = profileDate
    ? fullMonthNames[profileDate.monthIdx].charAt(0).toUpperCase() + fullMonthNames[profileDate.monthIdx].slice(1)
    : "";

  // Find studio info from list
  const studioIndex = useMemo(() => studios.findIndex((s) => s.id === studioId), [studios, studioId]);
  const studio = studios[studioIndex] ?? null;
  const studioColor = studioIndex >= 0 ? getStudioColor(studioIndex) : "#6b7280";
  const studioGradient = studioIndex >= 0 ? getStudioGradient(studioIndex) : "from-neutral-900 to-neutral-700";

  const profileClasses = useMemo(
    () => schedule.filter((c) => c.organizationId === studioId),
    [schedule, studioId]
  );

  const detailClass = selectedClassId ? schedule.find((c) => c.id === selectedClassId) : null;

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

  // ── Fetch user bookings ──
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

  // ── Fetch schedule ──
  const fetchSchedule = useCallback(async (dateStr: string) => {
    if (!studioId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule?date=${dateStr}&orgId=${studioId}`);
      if (res.ok) {
        const data: ScheduleItem[] = await res.json();
        setSchedule(data);
      } else {
        setSchedule([]);
      }
    } catch {
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }, [studioId]);

  useEffect(() => {
    if (selectedDateIso) {
      fetchSchedule(selectedDateIso);
      fetchBookings(selectedDateIso);
    }
  }, [selectedDateIso, fetchSchedule, fetchBookings]);

  // ── Fetch studio packages ──
  const fetchStudioPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      const res = await fetch(`/api/packages/public?organizationId=${studioId}`);
      if (res.ok) {
        const data: PackageItem[] = await res.json();
        setStudioPackages(data);
      } else {
        setStudioPackages([]);
      }
    } catch {
      setStudioPackages([]);
    } finally {
      setPackagesLoading(false);
    }
  }, [studioId]);

  useEffect(() => {
    if (activeTab === "paquetes") {
      fetchStudioPackages();
    }
  }, [activeTab, fetchStudioPackages]);

  // ── Navigation handlers ──
  function openClassDetail(id: string) {
    setSelectedClassId(id);
  }

  function closeClassDetail() {
    setSelectedClassId(null);
  }

  function goToPackages() {
    setSelectedClassId(null);
    setActiveTab("paquetes");
  }

  if (studiosLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        <span className="ml-2 text-sm text-neutral-500">Cargando...</span>
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="text-center py-32">
        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
        <p className="text-neutral-500">Estudio no encontrado.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Purchase status banners */}
      {purchaseCancelled && (
        <div className="flex items-center gap-2 text-sm p-4 rounded-xl bg-amber-50 text-amber-800 mx-4 mt-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>El pago fue cancelado. Puedes intentar de nuevo cuando quieras.</span>
        </div>
      )}
      {purchaseSuccess && (
        <div className="flex items-center gap-2 text-sm p-4 rounded-xl bg-green-50 text-green-800 mx-4 mt-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>Paquete adquirido exitosamente.</span>
        </div>
      )}

      {/* Hero */}
      <div className={cn("relative bg-gradient-to-br text-white px-6 pt-14 pb-20 text-center", studioGradient)}>
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors hover:bg-white/30"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="text-3xl font-bold tracking-tight">{studio.name}</h1>
      </div>

      {/* Logo + info */}
      <div className="flex flex-col items-center -mt-10 relative z-10">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-white"
          style={{ backgroundColor: studioColor }}
        >
          {studio.name[0]}
        </div>
        <h2 className="mt-3 text-lg font-semibold text-neutral-900">{studio.name}</h2>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mt-6 px-4">
        {([
          { key: "sesiones" as TabName, label: "Sesiones" },
          { key: "paquetes" as TabName, label: "Paquetes" },
          { key: "ubicacion" as TabName, label: "Ubicación" },
        ]).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}>
            <Badge
              variant={activeTab === tab.key ? "default" : "outline"}
              className={cn(
                "px-4 py-1.5 text-sm cursor-pointer",
                activeTab === tab.key ? "text-white" : "hover:bg-neutral-100"
              )}
              style={activeTab === tab.key ? { backgroundColor: studioColor } : undefined}
            >
              {tab.label}
            </Badge>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-w-lg mx-auto px-4 mt-6 pb-12">
        {/* ═══ SESIONES ═══ */}
        {activeTab === "sesiones" && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-base font-semibold text-neutral-900">{profileMonthLabel}</h3>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {dayHeaders.map((dh, i) => (
                <span key={i} className="text-xs font-medium text-neutral-400">{dh}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 justify-items-center">
              {dates.map((d, i) => {
                const isSelected = selectedDay === i;
                const hasClasses = profileClasses.length > 0;
                return (
                  <button
                    key={d.iso}
                    onClick={() => setSelectedDay(i)}
                    className="flex flex-col items-center gap-0.5 py-1"
                  >
                    <span
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                        isSelected ? "text-white" : "text-neutral-700 hover:bg-neutral-100"
                      )}
                      style={isSelected ? { backgroundColor: studioColor } : undefined}
                    >
                      {d.date}
                    </span>
                    {hasClasses && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                  </button>
                );
              })}
            </div>

            {profileDate && (
              <p className="text-sm text-neutral-500 text-center">
                {formatFullDate(profileDate.iso)}
              </p>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                <span className="ml-2 text-sm text-neutral-500">Cargando horarios...</span>
              </div>
            ) : profileClasses.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
                <p className="text-neutral-500">No hay clases programadas para este estudio.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {profileClasses.map((cls) => (
                  <ClassCard
                    key={cls.id}
                    classItem={cls}
                    variant="compact"
                    isBooked={bookedScheduleIds.has(cls.id)}
                    onClick={() => openClassDetail(cls.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ PAQUETES ═══ */}
        {activeTab === "paquetes" && (
          <div className="space-y-4">
            {packagesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                <span className="ml-2 text-sm text-neutral-500">Cargando paquetes...</span>
              </div>
            ) : studioPackages.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
                <p className="text-neutral-500">No hay paquetes disponibles en este estudio.</p>
              </div>
            ) : (
              studioPackages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  studioId={studioId}
                  stripeRedirectPath={`/app/studio/${studioId}?tab=paquetes`}
                  onFreePurchase={() => {
                    fetchStudioPackages();
                    fetchUserPackages();
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* ═══ UBICACIÓN ═══ */}
        {activeTab === "ubicacion" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-neutral-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-neutral-900">{studio.name}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-neutral-200 flex items-center justify-center h-64">
              <p className="text-neutral-500 text-sm">Mapa próximamente</p>
            </div>
          </div>
        )}
      </div>

      {/* Class detail overlay */}
      {selectedClassId && detailClass && (
        <ClassDetailOverlay
          classItem={detailClass}
          studioColor={studioColor}
          studioGradient={studioGradient}
          dateIso={selectedDateIso}
          hasActivePackage={userPackageOrgIds.has(detailClass.organizationId)}
          onClose={closeClassDetail}
          onGoToPackages={goToPackages}
          onBookingComplete={() => {
            fetchSchedule(selectedDateIso);
            fetchBookings(selectedDateIso);
          }}
        />
      )}
    </div>
  );
}
