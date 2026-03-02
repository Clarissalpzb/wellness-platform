"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ChevronLeft, ChevronRight, ChevronDown, Clock, User, Users, MapPin,
  Loader2, CheckCircle2, AlertCircle, Search, X, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ScheduleItem {
  id: string;
  time: string;
  endTime: string;
  name: string;
  coach: string;
  enrolled: number;
  capacity: number;
  color: string;
  level: string;
  location: string;
  category: string;
  studio: string;
}

type StudioName = "Reformee" | "Raw Cycling" | "Hotflow";
type StudioFilter = "all" | StudioName;
type TabName = "sesiones" | "paquetes" | "ubicacion";

interface PackageItem {
  id: string;
  name: string;
  price: number;
  sessions: number | "unlimited";
  validDays: number;
  validClasses: string[];
}

// ---------------------------------------------------------------------------
// Studio constants
// ---------------------------------------------------------------------------
const STUDIO_COLORS: Record<string, string> = {
  Reformee: "#a855f7",
  "Raw Cycling": "#f59e0b",
  Hotflow: "#ef4444",
};

const STUDIO_HERO_GRADIENT: Record<string, string> = {
  Reformee: "from-purple-950 via-purple-900 to-purple-800",
  "Raw Cycling": "from-amber-950 via-amber-900 to-amber-800",
  Hotflow: "from-red-950 via-red-900 to-red-800",
};

const STUDIO_INFO: Record<string, { address: string; description: string }> = {
  Reformee: {
    address: "Av. Paseo de la Reforma 222, CDMX",
    description: "Pilates reformer de alta intensidad para transformar tu cuerpo y mente.",
  },
  "Raw Cycling": {
    address: "Calle Masaryk 101, Polanco, CDMX",
    description: "Cycling inmersivo con música en vivo y experiencia sensorial única.",
  },
  Hotflow: {
    address: "Av. Presidente Masaryk 460, Polanco, CDMX",
    description: "Hot yoga y flow en un espacio diseñado para reconectar contigo.",
  },
};

const STUDIO_DISTANCES: Record<string, string> = {
  Reformee: "A 1.2 Km de distancia",
  "Raw Cycling": "A 2.5 Km de distancia",
  Hotflow: "A 0.8 Km de distancia",
};

const STUDIO_PRICES: Record<string, number> = {
  Reformee: 350,
  "Raw Cycling": 250,
  Hotflow: 280,
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Reformer: "Clase en máquina de Pilates Reformer. Trabaja fuerza, flexibilidad y control corporal mediante movimientos controlados y precisos con resistencia ajustable.",
  Barre: "Fusión de ballet, Pilates y yoga. Ejercicios en la barra que tonifican y esculpen el cuerpo con movimientos de bajo impacto y alta efectividad.",
  Yoga: "Práctica de yoga que conecta cuerpo y mente a través de posturas, respiración y meditación. Mejora flexibilidad, fuerza y bienestar general.",
  Cycling: "Clase de ciclismo indoor de alta energía al ritmo de la música. Quema calorías, mejora resistencia cardiovascular y fortalece piernas.",
  Fuerza: "Entrenamiento de fuerza funcional centrado en fortalecer el core, mejorar la flexibilidad y alinear el cuerpo mediante movimientos controlados.",
};

const STUDIO_CANCELLATION: Record<string, { type: string; text: string }> = {
  Reformee: { type: "Moderadamente flexible", text: "Podrás cancelar hasta 4 horas antes del inicio de la sesión para recibir un reembolso." },
  "Raw Cycling": { type: "Moderadamente flexible", text: "Podrás cancelar hasta 4 horas antes del inicio de la sesión para recibir un reembolso." },
  Hotflow: { type: "Flexible", text: "Podrás cancelar hasta 2 horas antes del inicio de la sesión para recibir un reembolso." },
};

const STUDIOS: StudioName[] = ["Reformee", "Raw Cycling", "Hotflow"];

// ---------------------------------------------------------------------------
// Packages (empty until fetched from API)
// ---------------------------------------------------------------------------
const PACKAGES: Record<StudioName, PackageItem[]> = {
  Reformee: [],
  "Raw Cycling": [],
  Hotflow: [],
};

// ---------------------------------------------------------------------------
// Schedule (empty until fetched from API)
// ---------------------------------------------------------------------------
const mockSchedule: ScheduleItem[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const dayHeaders = ["L", "M", "M", "J", "V", "S", "D"];
const fullDayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const fullMonthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function buildDates(): { day: string; date: number; month: string; monthIdx: number; iso: string }[] {
  const today = new Date();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? -6 : -(currentDay - 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    return {
      day: dayNames[d.getDay()],
      date: d.getDate(),
      month: monthNames[d.getMonth()],
      monthIdx: d.getMonth(),
      iso: d.toISOString().slice(0, 10),
    };
  });
}

function durationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : 60;
}

function formatFullDate(isoStr: string): string {
  const d = new Date(isoStr + "T12:00:00");
  return `${fullDayNames[d.getDay()]} ${d.getDate()} de ${fullMonthNames[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function generateTakenSpots(classId: string, enrolled: number, capacity: number): Set<number> {
  const taken = new Set<number>();
  if (enrolled <= 0) return taken;
  let hash = 0;
  for (let i = 0; i < classId.length; i++) {
    hash = ((hash << 5) - hash) + classId.charCodeAt(i);
    hash |= 0;
  }
  const spots = Array.from({ length: capacity }, (_, i) => i + 1);
  for (let i = spots.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i;
    hash |= 0;
    const j = Math.abs(hash) % (i + 1);
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  for (let i = 0; i < Math.min(enrolled, capacity); i++) {
    taken.add(spots[i]);
  }
  return taken;
}

function getCoachInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatPrice(price: number) {
  const formatted = price.toLocaleString("es-MX");
  return { whole: formatted, cents: "00" };
}

function sessionLabel(sessions: number | "unlimited") {
  if (sessions === "unlimited") return "Ilimitadas";
  return `${sessions} sesión${sessions > 1 ? "es" : ""}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ReservarPage() {
  const dates = buildDates();
  const spotSelectorRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const profileScrollRef = useRef<HTMLDivElement>(null);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayIndex = dates.findIndex((d) => d.iso === todayIso);

  // ── View layer: null = browse, StudioName = studio profile ──
  const [viewingStudio, setViewingStudio] = useState<StudioName | null>(null);

  // ── Browse view state ──
  const [selectedDay, setSelectedDay] = useState(todayIndex >= 0 ? todayIndex : 0);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [studioFilter, setStudioFilter] = useState<StudioFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");

  // ── Studio profile state ──
  const [activeTab, setActiveTab] = useState<TabName>("sesiones");
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
  const [purchasedId, setPurchasedId] = useState<string | null>(null);

  // ── Class detail overlay state ──
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bookingMessage, setBookingMessage] = useState("");

  // ── Derived ──
  const selectedDateIso = dates[selectedDay]?.iso ?? "";

  const availableCategories = useMemo(() => {
    const source = studioFilter === "all"
      ? schedule
      : schedule.filter((c) => c.studio === studioFilter);
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
      if (studioFilter !== "all" && cls.studio !== studioFilter) return false;
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

  // Studio profile derived
  const profileStudio = viewingStudio;
  const profileColor = profileStudio ? STUDIO_COLORS[profileStudio] : "";
  const profileGradient = profileStudio ? STUDIO_HERO_GRADIENT[profileStudio] : "";
  const profileInfo = profileStudio ? STUDIO_INFO[profileStudio] : null;
  const profilePackages = profileStudio ? PACKAGES[profileStudio] : [];
  const profileClasses = profileStudio ? schedule.filter((c) => c.studio === profileStudio) : [];
  const profileDate = dates[selectedDay];
  const profileMonthLabel = profileDate
    ? fullMonthNames[profileDate.monthIdx].charAt(0).toUpperCase() + fullMonthNames[profileDate.monthIdx].slice(1)
    : "";

  // ── Fetch schedule ──
  const fetchSchedule = useCallback(async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule?date=${dateStr}`);
      if (!res.ok) throw new Error("API error");
      const data: ScheduleItem[] = await res.json();
      setSchedule(data);
    } catch {
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDateIso) fetchSchedule(selectedDateIso);
  }, [selectedDateIso, fetchSchedule]);

  // ── Navigation handlers ──
  function openStudioProfile(studio: StudioName) {
    setViewingStudio(studio);
    setActiveTab("sesiones");
    setExpandedPackage(null);
    setPurchasedId(null);
    setSelectedClassId(null);
    setTimeout(() => profileScrollRef.current?.scrollTo(0, 0), 0);
  }

  function closeStudioProfile() {
    setViewingStudio(null);
    setSelectedClassId(null);
  }

  function openClassDetail(id: string) {
    setSelectedClassId(id);
    setSelectedSpot(null);
    setShowFullDescription(false);
    setBookingStatus("idle");
    setBookingMessage("");
    setTimeout(() => scrollRef.current?.scrollTo(0, 0), 0);
  }

  function openClassFromBrowse(cls: ScheduleItem) {
    setViewingStudio(cls.studio as StudioName);
    setActiveTab("sesiones");
    setSelectedClassId(cls.id);
    setSelectedSpot(null);
    setShowFullDescription(false);
    setBookingStatus("idle");
    setBookingMessage("");
    setTimeout(() => scrollRef.current?.scrollTo(0, 0), 0);
  }

  function backToList() {
    setSelectedClassId(null);
    setSelectedSpot(null);
    setShowFullDescription(false);
    setBookingStatus("idle");
    setBookingMessage("");
  }

  // ── Booking ──
  const handleBook = async () => {
    if (!selectedClassId) return;
    setBookingStatus("loading");
    setBookingMessage("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classScheduleId: selectedClassId,
          date: selectedDateIso,
          ...(selectedSpot && { spotNumber: selectedSpot }),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al reservar" }));
        throw new Error(err.error || "Error al reservar");
      }
      setBookingStatus("success");
      setBookingMessage("Reserva confirmada exitosamente.");
      fetchSchedule(selectedDateIso);
    } catch (e: unknown) {
      setBookingStatus("error");
      setBookingMessage(e instanceof Error ? e.message : "Error al reservar. Intenta de nuevo.");
    }
  };

  function handleBuy(pkgId: string) {
    setPurchasedId(pkgId);
    setTimeout(() => setPurchasedId(null), 3000);
  }

  const detailClass = schedule.find((c) => c.id === selectedClassId);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* BROWSE VIEW (default)                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Reservar Clase</h1>
        <p className="text-sm text-neutral-500">Selecciona una clase para reservar</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Studio pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", ...STUDIOS] as StudioFilter[]).map((studio) => (
            <button
              key={studio}
              onClick={() => {
                if (studio === "all") {
                  setStudioFilter("all");
                } else {
                  openStudioProfile(studio);
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                studioFilter === studio && studio === "all"
                  ? "bg-neutral-900 text-white"
                  : "bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400"
              )}
            >
              {studio !== "all" && (
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: STUDIO_COLORS[studio] }}
                />
              )}
              {studio === "all" ? "Todas" : studio}
            </button>
          ))}
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
                {studioFilter}
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
      </div>

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
          {filteredSchedule.map((cls) => {
            const full = cls.enrolled >= cls.capacity;
            const spotsLeft = cls.capacity - cls.enrolled;
            return (
              <Card
                key={cls.id}
                className={cn("cursor-pointer transition-shadow hover:shadow-md", full && "opacity-75")}
                onClick={() => openClassFromBrowse(cls)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[50px]">
                      <p className="text-sm font-bold text-neutral-900">{cls.time}</p>
                      <p className="text-xs text-neutral-400">{cls.endTime}</p>
                    </div>
                    <div className="h-12 w-1 rounded-full" style={{ backgroundColor: cls.color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{cls.name}</h3>
                        <Badge variant="outline" className="text-xs">{cls.level}</Badge>
                        {studioFilter === "all" && (
                          <Badge className="text-xs text-white" style={{ backgroundColor: STUDIO_COLORS[cls.studio] }}>
                            {cls.studio}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-neutral-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {cls.coach}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {durationMinutes(cls.time, cls.endTime)} min
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {cls.location}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {full ? (
                        <Badge variant="secondary" className="text-amber-600 bg-amber-50">Lleno</Badge>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-primary-600">{spotsLeft} lugares</p>
                          <div className="flex items-center gap-1 text-xs text-neutral-400">
                            <Users className="h-3 w-3" />
                            {cls.enrolled}/{cls.capacity}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* STUDIO PROFILE OVERLAY                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {viewingStudio && profileInfo && (
        <div className="fixed inset-0 z-40 bg-neutral-50">
          <div ref={profileScrollRef} className="h-full overflow-y-auto">
            {/* Hero */}
            <div className={cn("relative bg-gradient-to-br text-white px-6 pt-14 pb-20 text-center", profileGradient)}>
              <button
                onClick={closeStudioProfile}
                className="absolute top-4 left-4 z-10 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors hover:bg-white/30"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
              <h1 className="text-3xl font-bold tracking-tight">{viewingStudio}</h1>
            </div>

            {/* Logo + info */}
            <div className="flex flex-col items-center -mt-10 relative z-10">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-white"
                style={{ backgroundColor: profileColor }}
              >
                {viewingStudio[0]}
              </div>
              <h2 className="mt-3 text-lg font-semibold text-neutral-900">{viewingStudio}</h2>
              <p className="text-sm font-medium mt-1" style={{ color: profileColor }}>
                {STUDIO_DISTANCES[viewingStudio]}
              </p>
              <p className="flex items-center gap-1 text-sm text-neutral-500 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {profileInfo.address}
              </p>
              <p className="text-sm text-neutral-500 mt-2 max-w-xs text-center px-4">
                {profileInfo.description}
              </p>
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
                    style={activeTab === tab.key ? { backgroundColor: profileColor } : undefined}
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
                            style={isSelected ? { backgroundColor: profileColor } : undefined}
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
                      {profileClasses.map((cls) => {
                        const full = cls.enrolled >= cls.capacity;
                        const spotsLeft = cls.capacity - cls.enrolled;
                        return (
                          <Card
                            key={cls.id}
                            className={cn("cursor-pointer transition-shadow hover:shadow-md", full && "opacity-75")}
                            onClick={() => openClassDetail(cls.id)}
                          >
                            <CardContent className="py-4">
                              <div className="flex items-center gap-4">
                                <div className="text-center min-w-[50px]">
                                  <p className="text-sm font-bold text-neutral-900">{formatTime12h(cls.time)}</p>
                                </div>
                                <div className="h-12 w-1 rounded-full" style={{ backgroundColor: cls.color }} />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-neutral-900">{cls.name}</h4>
                                  <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {durationMinutes(cls.time, cls.endTime)} min
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {cls.coach}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  {full ? (
                                    <span className="text-xs text-amber-600 font-medium">Lleno</span>
                                  ) : (
                                    <div className="flex items-center gap-1 text-xs text-neutral-400">
                                      <Users className="h-3 w-3" />
                                      {spotsLeft}
                                    </div>
                                  )}
                                </div>
                                <ChevronRight className="h-5 w-5 text-neutral-300 shrink-0" />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ PAQUETES ═══ */}
              {activeTab === "paquetes" && (
                <div className="space-y-4">
                  {profilePackages.map((pkg) => {
                    const { whole, cents } = formatPrice(pkg.price);
                    const isExpanded = expandedPackage === pkg.id;
                    const isPurchased = purchasedId === pkg.id;
                    return (
                      <Card key={pkg.id} className="overflow-hidden">
                        <CardContent className="p-5">
                          <h3 className="text-lg font-bold text-neutral-900">{pkg.name}</h3>
                          <p className="mt-1 text-3xl font-extrabold text-neutral-900">
                            ${whole}
                            <sup className="text-base font-semibold align-super ml-0.5">{cents}</sup>
                          </p>
                          <div className="my-4 border-t border-neutral-200" />
                          <ul className="space-y-2.5 text-sm text-neutral-700">
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: profileColor }} />
                              {sessionLabel(pkg.sessions)}
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: profileColor }} />
                              <span>
                                Válido en {pkg.validClasses.slice(0, 2).join(", ")}
                                {pkg.validClasses.length > 2 && (
                                  <>
                                    {" "}
                                    <button
                                      onClick={() => setExpandedPackage(isExpanded ? null : pkg.id)}
                                      className="inline-flex items-center gap-0.5 text-xs font-medium underline underline-offset-2"
                                      style={{ color: profileColor }}
                                    >
                                      Ver detalles
                                      <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                                    </button>
                                  </>
                                )}
                              </span>
                            </li>
                            {isExpanded && pkg.validClasses.length > 2 && (
                              <li className="ml-6 text-xs text-neutral-500">{pkg.validClasses.join(", ")}</li>
                            )}
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: profileColor }} />
                              Vigencia {pkg.validDays} día{pkg.validDays > 1 ? "s" : ""}
                            </li>
                          </ul>
                          <Button
                            className="w-full mt-5 text-white"
                            style={{ backgroundColor: profileColor }}
                            onClick={() => handleBuy(pkg.id)}
                          >
                            {isPurchased ? "Próximamente — Pago con Stripe" : "Comprar"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* ═══ UBICACIÓN ═══ */}
              {activeTab === "ubicacion" && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-neutral-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-neutral-900">{viewingStudio}</p>
                      <p className="text-sm text-neutral-500">{profileInfo.address}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-neutral-200 flex items-center justify-center h-64">
                    <p className="text-neutral-500 text-sm">Mapa próximamente</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CLASS DETAIL OVERLAY                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {selectedClassId && detailClass && (() => {
        const cls = detailClass;
        const full = cls.enrolled >= cls.capacity;
        const takenSpots = generateTakenSpots(cls.id, cls.enrolled, cls.capacity);
        const price = STUDIO_PRICES[cls.studio] ?? 250;
        const description = CATEGORY_DESCRIPTIONS[cls.category] ?? "";
        const cancellation = STUDIO_CANCELLATION[cls.studio];
        const heroGradient = STUDIO_HERO_GRADIENT[cls.studio] ?? "from-neutral-900 to-neutral-700";

        return (
          <div className="fixed inset-0 z-50 bg-white">
            <div ref={scrollRef} className="h-full overflow-y-auto">
              <div className="pb-40">
                <div className={cn("relative h-52 bg-gradient-to-br", heroGradient)}>
                  <button
                    onClick={backToList}
                    className="absolute top-4 left-4 z-10 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors hover:bg-white/30"
                  >
                    <ChevronLeft className="h-5 w-5 text-white" />
                  </button>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white/20 text-4xl font-bold tracking-widest uppercase select-none">
                      {cls.category}
                    </span>
                  </div>
                </div>

                <div className="px-5 pt-5 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="text-2xl font-bold text-neutral-900 leading-tight">{cls.name}</h1>
                    <p className="text-2xl font-bold text-neutral-900 shrink-0">
                      <span className="text-sm align-top">$</span>{price}<sup className="text-sm font-bold">00</sup>
                    </p>
                  </div>

                  {description && (
                    <div>
                      <p className={cn("text-sm text-neutral-600 leading-relaxed", !showFullDescription && "line-clamp-2")}>
                        {description}
                      </p>
                      <button
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="text-sm font-semibold text-neutral-900 mt-1"
                      >
                        {showFullDescription ? "Ver menos" : "Ver más"}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-neutral-700">
                    <CalendarDays className="h-5 w-5 shrink-0" />
                    <span className="text-sm">{formatFullDate(selectedDateIso)}</span>
                  </div>

                  <div className="flex items-center gap-3 text-neutral-700">
                    <Clock className="h-5 w-5 shrink-0" />
                    <span className="text-sm">
                      {formatTime12h(cls.time)} &middot; {durationMinutes(cls.time, cls.endTime)} min
                    </span>
                  </div>

                  <div className="flex items-center gap-3 py-4 border-t border-b border-neutral-100">
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: STUDIO_COLORS[cls.studio] }}
                    >
                      {getCoachInitials(cls.coach)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900">{cls.coach}</p>
                      <p className="text-sm text-neutral-500">Instructor</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-neutral-400 shrink-0" />
                  </div>

                  <div ref={spotSelectorRef}>
                    <h2 className="text-lg font-semibold text-neutral-900">Selecciona tu lugar</h2>
                    {full ? (
                      <div className="mt-4 bg-amber-50 text-amber-800 text-sm p-4 rounded-xl">
                        Esta clase está llena. Puedes unirte a la lista de espera y te notificaremos si se libera un lugar.
                      </div>
                    ) : (
                      <div className="mt-4 bg-neutral-50 rounded-2xl p-5">
                        <div className="flex justify-center mb-4">
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: STUDIO_COLORS[cls.studio] }}
                          >
                            {getCoachInitials(cls.coach)}
                          </div>
                        </div>
                        <div className="grid grid-cols-8 gap-2 justify-items-center">
                          {Array.from({ length: cls.capacity }, (_, i) => {
                            const spotNum = i + 1;
                            const isTaken = takenSpots.has(spotNum);
                            const isSelected = selectedSpot === spotNum;
                            return (
                              <button
                                key={spotNum}
                                disabled={isTaken}
                                onClick={() => setSelectedSpot(isSelected ? null : spotNum)}
                                className={cn(
                                  "h-9 w-9 rounded-full text-sm font-medium transition-all flex items-center justify-center",
                                  isTaken && "bg-neutral-100 text-neutral-300 cursor-not-allowed",
                                  !isTaken && !isSelected && "bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-400 hover:shadow-sm",
                                  isSelected && "bg-neutral-900 text-white shadow-md"
                                )}
                              >
                                {spotNum}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {cancellation && (
                    <div className="flex items-start gap-3 pt-2">
                      <CalendarDays className="h-5 w-5 text-neutral-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-neutral-700">Política de cancelación</p>
                        <p className="text-sm text-neutral-500 mt-0.5">
                          <span className="font-medium">{cancellation.type}</span>: {cancellation.text}
                        </p>
                      </div>
                    </div>
                  )}

                  {bookingStatus === "error" && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-800 text-sm p-4 rounded-xl">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span>{bookingMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 bg-white border-t border-neutral-200 px-5 pt-3 pb-6">
              {bookingStatus === "success" ? (
                <>
                  <div className="flex items-center gap-2 mb-3 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">{bookingMessage}</span>
                  </div>
                  <Button
                    onClick={backToList}
                    className="w-full h-12 text-base rounded-xl bg-neutral-900 hover:bg-neutral-800"
                  >
                    Volver a clases
                  </Button>
                </>
              ) : (
                <>
                  {selectedSpot && !full && (
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-bold">
                          {selectedSpot}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-neutral-900">Lugar {selectedSpot}</p>
                          <p className="text-xs text-neutral-500">{cls.name}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => spotSelectorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                        className="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"
                      >
                        Cambiar
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <Button
                    onClick={handleBook}
                    disabled={bookingStatus === "loading" || (!full && !selectedSpot)}
                    className="w-full h-12 text-base rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40"
                  >
                    {bookingStatus === "loading" && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                    {full ? "Unirme a Lista de Espera" : "Reservar lugar"}
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
