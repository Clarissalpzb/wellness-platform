"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileText, Image, Table, File, Sparkles, CheckCircle,
  AlertCircle, ArrowRight, X, Calendar, Package, Users, Clock,
  ChevronRight, Info, TrendingUp, TrendingDown, BarChart3,
  Target, Zap, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type Step = "upload" | "analyzing" | "preview" | "importing" | "done";

interface ExtractedClass {
  name: string;
  description?: string | null;
  duration?: number | null;
  capacity?: number | null;
  category?: string | null;
  level?: string | null;
}

interface ExtractedStaff {
  name: string;
  role: string;
  email?: string | null;
  bio?: string | null;
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

interface BookingStat {
  className: string;
  sessions: number;
  totalBookings: number;
  totalCapacity: number;
  avgOccupancyPct: number;
  totalCancellations: number;
  cancellationRatePct: number;
  totalCheckIns: number;
  showRatePct: number;
  fullSessionsPct: number;
  lowSessionsPct: number;
  spotsPerSession: number;
}

interface Solution {
  option: number;
  difficulty: "fácil" | "moderado" | "avanzado";
  action: string;
  description: string;
  expectedImpact: string;
}

interface Recommendation {
  priority: "alta" | "media" | "baja";
  title: string;
  problem: string;
  solutions: Solution[];
  impact: "revenue" | "bookings" | "retention" | "operations";
}

interface SlotNote {
  className: string;
  reason: string;
  suggestion: string;
}

interface FeatureSuggestion {
  feature: string;
  problemItSolves: string;
  benefit: string;
  priority: "alta" | "media" | "baja";
}

interface ExtractedData {
  studio: { name?: string | null; description?: string | null; address?: string | null };
  classes: ExtractedClass[];
  staff: ExtractedStaff[];
  packages: ExtractedPackage[];
  schedule: ExtractedSchedule[];
  bookingStats?: BookingStat[];
  overallStats?: {
    totalSessions: number;
    totalSpots: number;
    totalBookings: number;
    totalCancellations: number;
    totalCheckIns: number;
    totalNoShows: number;
    overallOccupancyPct: number;
    overallCancellationRatePct: number;
    overallShowRatePct: number;
    unfilledSpots: number;
    spotsLostToCancellations: number;
  };
  insights?: {
    topClasses: string[];
    underperformingClasses: string[];
    highCancellationClasses: string[];
    revenueOpportunityNote: string;
    recommendations: Recommendation[];
    slotsToConsiderCutting?: SlotNote[];
    slotsToConsiderAdding?: SlotNote[];
    dayPatterns?: string | null;
    timePatterns?: string | null;
  };
  featureSuggestions?: FeatureSuggestion[];
  confidence: "high" | "medium" | "low";
  notes?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = [
  { label: "PDF", icon: FileText },
  { label: "Excel", icon: Table },
  { label: "Word", icon: File },
  { label: "CSV", icon: Table },
  { label: "Imagen", icon: Image },
];

const ANALYZING_MESSAGES = [
  "Leyendo tu documento...",
  "Identificando clases y horarios...",
  "Analizando tasas de ocupación...",
  "Calculando oportunidades de revenue...",
  "Generando recomendaciones de horario...",
  "Casi listo...",
];

const DAY_LABELS: Record<string, string> = {
  lunes: "Lun", martes: "Mar", "miércoles": "Mié",
  jueves: "Jue", viernes: "Vie", "sábado": "Sáb", domingo: "Dom",
};

const CONFIDENCE_CONFIG = {
  high: { label: "Alta confianza", color: "text-green-400 bg-green-400/10" },
  medium: { label: "Confianza media", color: "text-yellow-400 bg-yellow-400/10" },
  low: { label: "Confianza baja — revisa los datos", color: "text-red-400 bg-red-400/10" },
};

const PRIORITY_CONFIG = {
  alta: { label: "Prioridad alta", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  media: { label: "Prioridad media", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  baja: { label: "Prioridad baja", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
};

const IMPACT_CONFIG = {
  revenue: { icon: TrendingUp, color: "text-green-400" },
  bookings: { icon: BarChart3, color: "text-blue-400" },
  retention: { icon: Users, color: "text-purple-400" },
  operations: { icon: Zap, color: "text-orange-400" },
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function AnalyzingScreen({ fileName }: { fileName: string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  useState(() => {
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % ANALYZING_MESSAGES.length), 1800);
    return () => clearInterval(id);
  });
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="relative mb-8">
        <div className="h-24 w-24 rounded-2xl bg-primary-500/20 flex items-center justify-center">
          <Sparkles className="h-12 w-12 text-primary-400 animate-pulse" />
        </div>
        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary-500 animate-ping" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Analizando con IA</h2>
      <p className="text-neutral-400 mb-8 text-center max-w-sm">
        Leyendo <span className="text-white font-medium">{fileName}</span>
      </p>
      <p className="text-primary-400 text-sm animate-pulse h-6">{ANALYZING_MESSAGES[msgIdx]}</p>
      <div className="mt-8 flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1.5 w-8 rounded-full bg-neutral-800 overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function OccupancyBar({ pct, className }: { pct: number; className?: string }) {
  const color = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-2 rounded-full bg-neutral-700">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-mono text-neutral-300 w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

function StatPill({ value, label, color = "text-white" }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="text-center px-3 py-2 rounded-lg bg-neutral-800/60">
      <p className={cn("text-lg font-bold", color)}>{value}</p>
      <p className="text-neutral-500 text-xs">{label}</p>
    </div>
  );
}

function InsightsTab({ insights, overallStats }: { insights: ExtractedData["insights"]; overallStats: ExtractedData["overallStats"] }) {
  if (!insights && !overallStats) {
    return (
      <div className="py-16 text-center">
        <BarChart3 className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
        <p className="text-neutral-500 text-sm">No se encontraron datos de rendimiento en este documento.</p>
        <p className="text-neutral-600 text-xs mt-1">Sube un reporte de clases para ver análisis detallado.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-neutral-700/50">
      {/* Overall KPIs */}
      {overallStats && (
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Resumen general</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatPill value={overallStats.totalSessions} label="Sesiones" />
            <StatPill
              value={overallStats.overallOccupancyPct.toFixed(0) + "%"}
              label="Ocupación"
              color={overallStats.overallOccupancyPct >= 70 ? "text-green-400" : overallStats.overallOccupancyPct >= 50 ? "text-yellow-400" : "text-red-400"}
            />
            <StatPill
              value={overallStats.overallCancellationRatePct.toFixed(0) + "%"}
              label="Cancelaciones"
              color={overallStats.overallCancellationRatePct > 35 ? "text-red-400" : "text-yellow-400"}
            />
            <StatPill value={overallStats.overallShowRatePct.toFixed(0) + "%"} label="Asistencia" color="text-blue-400" />
          </div>
          {overallStats.unfilledSpots > 0 && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-xs">
                <span className="font-semibold">{overallStats.unfilledSpots.toLocaleString()} spots sin llenar</span> en el período analizado.
                {overallStats.spotsLostToCancellations > 0 && (
                  <> Adicionalmente, ~{overallStats.spotsLostToCancellations} spots perdidos por cancelaciones no rellenadas.</>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Revenue opportunity */}
      {insights?.revenueOpportunityNote && (
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Oportunidad de revenue</p>
          <div className="flex gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <TrendingUp className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-300 text-sm">{insights.revenueOpportunityNote}</p>
          </div>
        </div>
      )}

      {/* Day / time patterns */}
      {(insights?.dayPatterns || insights?.timePatterns) && (
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Patrones de demanda</p>
          <div className="space-y-2">
            {insights.dayPatterns && (
              <div className="flex gap-2 text-sm">
                <Calendar className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-neutral-300">{insights.dayPatterns}</p>
              </div>
            )}
            {insights.timePatterns && (
              <div className="flex gap-2 text-sm">
                <Clock className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-neutral-300">{insights.timePatterns}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {(insights?.recommendations?.length ?? 0) > 0 && (
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
            Recomendaciones de la IA ({insights!.recommendations.length})
          </p>
          <div className="space-y-3">
            {insights!.recommendations.map((rec, i) => {
              const priority = PRIORITY_CONFIG[rec.priority] ?? PRIORITY_CONFIG.media;
              const ImpactIcon = (IMPACT_CONFIG[rec.impact] ?? IMPACT_CONFIG.bookings).icon;
              const impactColor = (IMPACT_CONFIG[rec.impact] ?? IMPACT_CONFIG.bookings).color;
              return (
                <div key={i} className="p-4 rounded-xl bg-neutral-800/40 border border-neutral-700/50">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <ImpactIcon className={cn("h-4 w-4 flex-shrink-0", impactColor)} />
                      <p className="text-white font-medium text-sm">{rec.title}</p>
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border flex-shrink-0", priority.color)}>
                      {priority.label}
                    </span>
                  </div>
                  <p className="text-neutral-400 text-sm leading-relaxed">{rec.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BookingStatsTab({ stats }: { stats: BookingStat[] | undefined }) {
  if (!stats?.length) {
    return (
      <div className="py-12 text-center">
        <p className="text-neutral-500 text-sm">No se encontraron estadísticas de reservas en este documento.</p>
      </div>
    );
  }

  const sorted = [...stats].sort((a, b) => b.totalBookings - a.totalBookings);

  return (
    <div>
      {sorted.map((s, i) => (
        <div key={i} className="p-4 border-b border-neutral-700/50 last:border-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white font-medium text-sm">{s.className}</p>
              <p className="text-neutral-500 text-xs">{s.sessions} sesiones · {s.spotsPerSession} lugares/sesión</p>
            </div>
            <div className="text-right">
              <p className="text-white font-semibold text-sm">{s.totalBookings.toLocaleString()}</p>
              <p className="text-neutral-500 text-xs">reservas totales</p>
            </div>
          </div>

          {/* Occupancy bar */}
          <OccupancyBar pct={s.avgOccupancyPct} className="mb-2" />

          {/* Metrics row */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            <div className="text-center">
              <p className={cn("text-xs font-semibold", s.fullSessionsPct >= 15 ? "text-green-400" : "text-neutral-400")}>
                {s.fullSessionsPct.toFixed(0)}%
              </p>
              <p className="text-neutral-600 text-xs">llenas</p>
            </div>
            <div className="text-center">
              <p className={cn("text-xs font-semibold", s.cancellationRatePct > 40 ? "text-red-400" : s.cancellationRatePct > 30 ? "text-yellow-400" : "text-neutral-400")}>
                {s.cancellationRatePct.toFixed(0)}%
              </p>
              <p className="text-neutral-600 text-xs">cancels</p>
            </div>
            <div className="text-center">
              <p className={cn("text-xs font-semibold", s.showRatePct >= 85 ? "text-green-400" : "text-yellow-400")}>
                {s.showRatePct.toFixed(0)}%
              </p>
              <p className="text-neutral-600 text-xs">asistencia</p>
            </div>
            <div className="text-center">
              <p className={cn("text-xs font-semibold", s.lowSessionsPct > 20 ? "text-red-400" : "text-neutral-400")}>
                {s.lowSessionsPct.toFixed(0)}%
              </p>
              <p className="text-neutral-600 text-xs">vacías</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DataPreview({
  data, fileName, onImport, onReset, importing,
}: {
  data: ExtractedData; fileName: string; onImport: () => void; onReset: () => void; importing: boolean;
}) {
  const hasInsights = !!(data.bookingStats?.length || data.insights?.recommendations?.length || data.overallStats);
  const defaultTab = hasInsights ? "insights" : "classes";
  const [activeTab, setActiveTab] = useState<"insights" | "stats" | "classes" | "schedule" | "packages" | "staff">(defaultTab as "insights" | "classes");
  const confidence = CONFIDENCE_CONFIG[data.confidence] ?? CONFIDENCE_CONFIG.medium;

  const tabs = [
    ...(hasInsights ? [
      { id: "insights" as const, label: "IA Insights", icon: Sparkles, count: data.insights?.recommendations?.length ?? 0, highlight: true },
      { id: "stats" as const, label: "Rendimiento", icon: BarChart3, count: data.bookingStats?.length ?? 0 },
    ] : []),
    { id: "classes" as const, label: "Clases", icon: Calendar, count: data.classes?.length ?? 0 },
    { id: "schedule" as const, label: "Horarios", icon: Clock, count: data.schedule?.length ?? 0 },
    { id: "packages" as const, label: "Paquetes", icon: Package, count: data.packages?.length ?? 0 },
    { id: "staff" as const, label: "Instructores", icon: Users, count: data.staff?.length ?? 0 },
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-green-500/20 mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {hasInsights ? "Análisis completo listo" : "¡Información encontrada!"}
          </h1>
          {data.studio?.name && (
            <p className="text-neutral-400">
              Datos para <span className="text-white font-semibold">{data.studio.name}</span>
            </p>
          )}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className={cn("text-xs font-medium px-3 py-1 rounded-full", confidence.color)}>
              {confidence.label}
            </span>
            <span className="text-neutral-500 text-xs">— desde {fileName}</span>
          </div>
        </div>

        {/* AI notes */}
        {data.notes && (
          <div className="mb-6 flex gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-300 text-sm">{data.notes}</p>
          </div>
        )}

        {/* Top performers / worst performers badges */}
        {data.insights && (
          <div className="flex flex-wrap gap-2 mb-6">
            {data.insights.topClasses?.slice(0, 2).map((cls) => (
              <span key={cls} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-300">
                <TrendingUp className="h-3 w-3" /> {cls}
              </span>
            ))}
            {data.insights.underperformingClasses?.slice(0, 1).map((cls) => (
              <span key={cls} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300">
                <TrendingDown className="h-3 w-3" /> {cls}
              </span>
            ))}
            {data.insights.highCancellationClasses?.slice(0, 1).map((cls) => (
              <span key={cls} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300">
                <AlertTriangle className="h-3 w-3" /> Alta cancelación: {cls}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-neutral-800/50 mb-6 border border-neutral-700/50 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-shrink-0 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? tab.highlight ? "bg-primary-500 text-white shadow-md" : "bg-neutral-700 text-white"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.count > 0 && (
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-semibold",
                  activeTab === tab.id ? "bg-white/20" : "bg-neutral-700")}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rounded-xl bg-neutral-800/40 border border-neutral-700/50 overflow-hidden mb-6">
          {activeTab === "insights" && (
            <InsightsTab insights={data.insights} overallStats={data.overallStats} />
          )}

          {activeTab === "stats" && (
            <BookingStatsTab stats={data.bookingStats} />
          )}

          {activeTab === "classes" && (
            <TabContent
              items={data.classes}
              emptyLabel="No se encontraron clases"
              renderItem={(c: ExtractedClass, i) => (
                <div key={i} className="flex items-start justify-between p-4 border-b border-neutral-700/50 last:border-0">
                  <div>
                    <p className="text-white font-medium">{c.name}</p>
                    {c.description && <p className="text-neutral-400 text-sm mt-0.5 line-clamp-2">{c.description}</p>}
                    <div className="flex gap-2 mt-2">
                      {c.category && <span className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">{c.category}</span>}
                      {c.level && <span className="text-xs text-neutral-400">{c.level}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    {c.duration && <p className="text-neutral-300 text-sm">{c.duration} min</p>}
                    {c.capacity && <p className="text-neutral-500 text-xs">{c.capacity} lugares</p>}
                  </div>
                </div>
              )}
            />
          )}

          {activeTab === "schedule" && (
            <TabContent
              items={data.schedule}
              emptyLabel="No se encontraron horarios"
              renderItem={(s: ExtractedSchedule, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-neutral-700/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-400 text-xs font-bold">
                        {DAY_LABELS[s.dayOfWeek] ?? s.dayOfWeek?.slice(0, 3)}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{s.className}</p>
                      {s.instructorName && <p className="text-neutral-400 text-xs">{s.instructorName}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-neutral-300 text-sm font-mono">{s.startTime}</p>
                    {s.endTime && <p className="text-neutral-500 text-xs font-mono">→ {s.endTime}</p>}
                    {s.room && <p className="text-neutral-500 text-xs">{s.room}</p>}
                  </div>
                </div>
              )}
            />
          )}

          {activeTab === "packages" && (
            <TabContent
              items={data.packages}
              emptyLabel="No se encontraron paquetes"
              renderItem={(p: ExtractedPackage, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-neutral-700/50 last:border-0">
                  <div>
                    <p className="text-white font-medium">{p.name}</p>
                    {p.description && <p className="text-neutral-400 text-sm mt-0.5">{p.description}</p>}
                    <div className="flex gap-3 mt-1">
                      {p.sessions ? <span className="text-xs text-neutral-400">{p.sessions} clases</span> : <span className="text-xs text-primary-400">Ilimitado</span>}
                      {p.validityDays && <span className="text-xs text-neutral-500">{p.validityDays} días vigencia</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    {p.price != null ? (
                      <p className="text-white font-semibold">${p.price.toLocaleString("es-MX")}<span className="text-neutral-500 text-xs font-normal"> MXN</span></p>
                    ) : (
                      <p className="text-neutral-500 text-sm">Sin precio</p>
                    )}
                  </div>
                </div>
              )}
            />
          )}

          {activeTab === "staff" && (
            <>
              <TabContent
                items={data.staff}
                emptyLabel="No se encontraron instructores"
                renderItem={(s: ExtractedStaff, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 border-b border-neutral-700/50 last:border-0">
                    <div className="h-9 w-9 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-semibold">{s.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{s.name}</p>
                      <p className="text-neutral-400 text-xs">{s.role}</p>
                      {s.email && <p className="text-neutral-500 text-xs mt-0.5">{s.email}</p>}
                      {s.bio && <p className="text-neutral-400 text-xs mt-1 line-clamp-2">{s.bio}</p>}
                    </div>
                  </div>
                )}
              />
              {(data.staff?.length ?? 0) > 0 && (
                <div className="p-4 bg-blue-500/5 border-t border-blue-500/20">
                  <p className="text-blue-300 text-xs flex gap-2 items-start">
                    <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    Agrégalos desde <span className="font-semibold mx-1">Equipo → Nuevo instructor</span> para que puedan acceder al sistema.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onReset}
            disabled={importing}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors text-sm disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Subir otro archivo
          </button>
          <button
            onClick={onImport}
            disabled={importing}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm transition-colors disabled:opacity-70"
          >
            {importing ? (
              <><Sparkles className="h-4 w-4 animate-spin" /> Importando...</>
            ) : (
              <><CheckCircle className="h-4 w-4" /> Confirmar e Importar <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabContent<T>({ items, emptyLabel, renderItem }: {
  items: T[] | undefined; emptyLabel: string; renderItem: (item: T, index: number) => React.ReactNode;
}) {
  if (!items?.length) return <div className="py-12 text-center"><p className="text-neutral-500 text-sm">{emptyLabel}</p></div>;
  return <div>{items.map((item, i) => renderItem(item, i))}</div>;
}

function DoneScreen({ summary, onContinue }: { summary: { classes: number; packages: number; schedules: number }; onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="h-20 w-20 rounded-2xl bg-green-500/20 flex items-center justify-center mb-6">
        <CheckCircle className="h-10 w-10 text-green-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2 text-center">¡Listo para empezar!</h1>
      <p className="text-neutral-400 text-center mb-8 max-w-sm">Tu estudio ya está configurado. Las recomendaciones de IA están disponibles en el dashboard.</p>
      <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-sm">
        {[
          { label: "Clases", value: summary.classes, icon: Calendar },
          { label: "Paquetes", value: summary.packages, icon: Package },
          { label: "Horarios", value: summary.schedules, icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="text-center p-4 rounded-xl bg-neutral-800/60 border border-neutral-700/50">
            <Icon className="h-5 w-5 text-primary-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-neutral-400 text-xs">{label}</p>
          </div>
        ))}
      </div>
      <button onClick={onContinue} className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold transition-colors">
        Ir al Dashboard <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function SkipDisclaimer({ onConfirm, onBack }: { onConfirm: () => void; onBack: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
          </div>
          <h3 className="text-white font-semibold text-lg">Comenzar sin datos</h3>
        </div>
        <p className="text-neutral-300 text-sm mb-3">
          Las funciones de IA de optimización de horarios, maximización de reservas y recomendaciones personalizadas necesitan datos para funcionar.
        </p>
        <p className="text-neutral-400 text-sm mb-6">
          Sin importar tu historial, la IA comenzará a aprender el comportamiento de tu estudio.{" "}
          <span className="text-white font-medium">Esto toma aproximadamente 7 días</span> antes de que puedas ver recomendaciones confiables.
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={onBack} className="w-full py-2.5 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors">
            Mejor sí subo mis datos
          </button>
          <button onClick={onConfirm} className="w-full py-2.5 px-4 rounded-xl border border-neutral-700 text-neutral-400 hover:text-white text-sm transition-colors">
            Entiendo, continuar sin importar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

async function completeOnboarding() {
  await fetch("/api/onboarding/complete", { method: "POST" }).catch(() => {});
}

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");

  // Redirect to dashboard if onboarding was already completed (e.g. reactivation)
  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data) => {
        if (data.onboardingCompleted) router.replace("/dashboard");
      })
      .catch(() => {});
  }, [router]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [importSummary, setImportSummary] = useState({ classes: 0, packages: 0, schedules: 0 });
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo es demasiado grande. Máximo 10 MB.");
      return;
    }
    setFileName(file.name);
    setError(null);
    setStep("analyzing");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/onboarding/analyze", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al analizar el archivo.");
      setExtracted(json.data);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado. Intenta de nuevo.");
      setStep("upload");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleImport = async () => {
    if (!extracted) return;
    setStep("importing");
    try {
      const res = await fetch("/api/onboarding/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: extracted }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al importar.");
      setImportSummary(json.summary);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar. Intenta de nuevo.");
      setStep("preview");
    }
  };

  if (step === "analyzing") return <AnalyzingScreen fileName={fileName} />;

  if (step === "preview" && extracted) {
    return (
      <>
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
            <AlertCircle className="h-4 w-4" />{error}
          </div>
        )}
        <DataPreview
          data={extracted}
          fileName={fileName}
          onImport={handleImport}
          onReset={() => { setExtracted(null); setStep("upload"); setFileName(""); setError(null); }}
          importing={false}
        />
      </>
    );
  }

  if (step === "importing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <Sparkles className="h-12 w-12 text-primary-400 animate-pulse mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Importando datos...</h2>
        <p className="text-neutral-400 text-sm">Creando clases, paquetes y horarios en tu estudio</p>
      </div>
    );
  }

  if (step === "done") {
    return <DoneScreen summary={importSummary} onContinue={async () => { await completeOnboarding(); router.push("/dashboard"); }} />;
  }

  // ─── Upload step ──────────────────────────────────────────
  return (
    <>
      {showSkipWarning && <SkipDisclaimer onConfirm={async () => { setShowSkipWarning(false); await completeOnboarding(); router.push("/dashboard"); }} onBack={() => setShowSkipWarning(false)} />}

      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-500/20 mb-5">
              <Sparkles className="h-8 w-8 text-primary-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">Configura tu estudio con IA</h1>
            <p className="text-neutral-400 text-lg max-w-lg mx-auto leading-relaxed">
              Sube un reporte de tu plataforma anterior. La IA extrae tus clases, analiza tus métricas de reservas y te dice exactamente cómo optimizar tu horario.
            </p>
          </div>

          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 p-12 text-center group",
              isDragging ? "border-primary-400 bg-primary-500/10 scale-[1.01]" : "border-neutral-700 hover:border-neutral-500 bg-neutral-800/30 hover:bg-neutral-800/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.txt,.png,.jpg,.jpeg,.webp,.gif"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
            />
            <div className="flex flex-col items-center">
              <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center mb-4 transition-colors", isDragging ? "bg-primary-500/30" : "bg-neutral-700 group-hover:bg-neutral-600")}>
                <Upload className={cn("h-7 w-7 transition-colors", isDragging ? "text-primary-400" : "text-neutral-300")} />
              </div>
              <p className="text-white font-semibold text-lg mb-1">{isDragging ? "Suelta el archivo aquí" : "Arrastra tu archivo aquí"}</p>
              <p className="text-neutral-400 text-sm mb-5">
                o <span className="text-primary-400 underline underline-offset-2">selecciona desde tu computadora</span>
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {ACCEPTED_TYPES.map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-700/60 text-neutral-300 text-xs">
                    <Icon className="h-3 w-3" />{label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}

          {/* What gets extracted */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: BarChart3, label: "Análisis IA", desc: "Rendimiento y recomendaciones" },
              { icon: Target, label: "Ocupación", desc: "% por clase y horario" },
              { icon: Calendar, label: "Clases & Horarios", desc: "Días, horas, capacidad" },
              { icon: Package, label: "Paquetes", desc: "Precios y vigencias" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-4 rounded-xl bg-neutral-800/40 border border-neutral-700/50 text-center">
                <Icon className="h-5 w-5 text-primary-400 mx-auto mb-2" />
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-neutral-500 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>

          {/* Skip */}
          <div className="mt-8 text-center">
            <button onClick={() => setShowSkipWarning(true)} className="text-neutral-500 hover:text-neutral-300 text-sm transition-colors underline underline-offset-4">
              Prefiero empezar desde cero
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
