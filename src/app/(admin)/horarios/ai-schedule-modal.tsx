"use client";

import { useState, useRef } from "react";
import {
  Sparkles, History, Building2, Upload, Lock, Zap,
  Loader2, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  FileText, X, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { AIScheduleResult, AISuggestion } from "@/app/api/schedule/ai-suggest/route";

// ─── Re-export for the parent page ───────────────────────────────────────────
export type { AIScheduleResult, AISuggestion };

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const DATA_QUALITY_CONFIG = {
  high:   { label: "Alta — 8+ semanas de historial", color: "text-primary-600",  bg: "bg-primary-50",  icon: CheckCircle2 },
  medium: { label: "Media — 4–7 semanas de historial", color: "text-accent-amber", bg: "bg-accent-amber-light", icon: Info },
  low:    { label: "Baja — menos de 4 semanas", color: "text-accent-rose",   bg: "bg-accent-rose-light", icon: AlertTriangle },
  none:   { label: "Sin historial — usando mejores prácticas", color: "text-accent-blue", bg: "bg-accent-blue-light", icon: Zap },
};

interface Props {
  open: boolean;
  locationId: string;
  onClose: () => void;
  onApply: (result: AIScheduleResult) => void;
}

type Mode = "historical" | "new_studio" | "upload";

export function AIScheduleModal({ open, locationId, onClose, onApply }: Props) {
  const [step, setStep] = useState<"mode" | "config" | "result">("mode");
  const [mode, setMode] = useState<Mode>("historical");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIScheduleResult | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New studio config
  const [studioType, setStudioType] = useState<"yoga" | "pilates" | "gym" | "crossfit" | "dance" | "mixed">("mixed");
  const [peakHours, setPeakHours] = useState<"morning" | "evening" | "both" | "midday">("both");
  const [targetDemo, setTargetDemo] = useState<"families" | "young_professionals" | "seniors" | "mixed">("mixed");

  // Upload config
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("mode");
    setResult(null);
    setError(null);
    setCsvText("");
    setFileName(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleGenerate() {
    if (!locationId) return;
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { locationId, mode };

      if (mode === "new_studio") {
        body.newStudioConfig = {
          studioType,
          peakHoursType: peakHours,
          targetDemo,
          operatingDays: [1, 2, 3, 4, 5, 6],
          classNames: [],
        };
      }
      if (mode === "upload" && csvText) {
        body.csvData = csvText;
      }

      const res = await fetch("/api/schedule/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Error al generar horario");
        return;
      }

      const data: AIScheduleResult = await res.json();
      setResult(data);
      setStep("result");
    } catch {
      setError("Error de conexión. Verifica que el servidor esté activo.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileRead(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string ?? "");
    reader.readAsText(file);
  }

  function handleApply() {
    if (!result) return;
    onApply(result);
    handleClose();
  }

  const qualityConfig = result ? DATA_QUALITY_CONFIG[result.dataQuality] : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-amber" />
            Generar Horario con IA
          </DialogTitle>
          <DialogDescription>
            Claude analiza tus datos y propone el horario óptimo para maximizar ocupación y retención.
          </DialogDescription>
        </DialogHeader>

        {/* ── Step 1: Mode Selection ─────────────────────────────────────── */}
        {step === "mode" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-neutral-600">¿Cómo debe generar el horario la IA?</p>

            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  id: "historical" as Mode,
                  icon: History,
                  title: "Basado en historial real",
                  desc: "Analiza 12 semanas de reservas, listas de espera, retención y reseñas para proponer el horario que más dinero ha generado. Protege los slots ancla automáticamente.",
                  badge: "Recomendado",
                  badgeColor: "bg-primary-100 text-primary-700",
                },
                {
                  id: "new_studio" as Mode,
                  icon: Building2,
                  title: "Estudio nuevo (sin historial)",
                  desc: "Sin datos previos, Claude aplica las mejores prácticas de la industria fitness: horarios pico, distribución por tipo de clase, y consistencia de horarios para generar hábito.",
                  badge: "Para studios nuevos",
                  badgeColor: "bg-accent-blue-light text-accent-blue",
                },
                {
                  id: "upload" as Mode,
                  icon: Upload,
                  title: "Importar reporte de otra plataforma",
                  desc: "Sube o pega un reporte CSV de Mindbody, Glofox, Pike13, o cualquier plataforma. Claude extrae los patrones de asistencia y los usa para diseñar el horario.",
                  badge: "Migración",
                  badgeColor: "bg-accent-amber-light text-accent-amber",
                },
              ].map(({ id, icon: Icon, title, desc, badge, badgeColor }) => (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    mode === id
                      ? "border-primary-400 bg-primary-50"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${mode === id ? "bg-primary-100 text-primary-600" : "bg-neutral-100 text-neutral-500"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>{badge}</span>
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Mode-specific config */}
            {mode === "new_studio" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-100">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de estudio</Label>
                  <Select value={studioType} onValueChange={(v) => setStudioType(v as typeof studioType)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yoga">Yoga</SelectItem>
                      <SelectItem value="pilates">Pilates</SelectItem>
                      <SelectItem value="gym">Gimnasio</SelectItem>
                      <SelectItem value="crossfit">CrossFit / HIIT</SelectItem>
                      <SelectItem value="dance">Danza / Zumba</SelectItem>
                      <SelectItem value="mixed">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Horario pico</Label>
                  <Select value={peakHours} onValueChange={(v) => setPeakHours(v as typeof peakHours)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Mañanas</SelectItem>
                      <SelectItem value="evening">Tardes/Noches</SelectItem>
                      <SelectItem value="midday">Mediodía</SelectItem>
                      <SelectItem value="both">Mañanas y Tardes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Público objetivo</Label>
                  <Select value={targetDemo} onValueChange={(v) => setTargetDemo(v as typeof targetDemo)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="young_professionals">Profesionistas jóvenes</SelectItem>
                      <SelectItem value="families">Familias</SelectItem>
                      <SelectItem value="seniors">Adultos mayores</SelectItem>
                      <SelectItem value="mixed">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {mode === "upload" && (
              <div className="space-y-3 pt-2 border-t border-neutral-100">
                <p className="text-xs text-neutral-500">
                  Sube un archivo CSV exportado de tu plataforma anterior (Mindbody, Glofox, Pike13, etc.) o pega el contenido directamente. Formatos aceptados: cualquier CSV con fechas, clases y asistencia.
                </p>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <FileText className="mr-2 h-4 w-4" />
                    {fileName ? fileName : "Seleccionar archivo CSV"}
                  </Button>
                  {fileName && (
                    <button onClick={() => { setCsvText(""); setFileName(null); }}>
                      <X className="h-4 w-4 text-neutral-400 hover:text-neutral-700" />
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleFileRead} />
                </div>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="O pega aquí el contenido del CSV..."
                  className="w-full h-32 text-xs font-mono border border-neutral-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                {csvText && (
                  <p className="text-xs text-primary-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {csvText.split("\n").length} filas listas para analizar
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-accent-rose bg-accent-rose-light px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleGenerate}
                disabled={loading || (mode === "upload" && !csvText.trim())}
              >
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analizando con Claude...</>
                  : <><Sparkles className="mr-2 h-4 w-4" />Generar horario</>
                }
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Results ─────────────────────────────────────────────── */}
        {step === "result" && result && (
          <div className="space-y-4 py-2">

            {/* Data quality + mode badge */}
            {qualityConfig && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${qualityConfig.bg}`}>
                <qualityConfig.icon className={`h-4 w-4 shrink-0 ${qualityConfig.color}`} />
                <span className={`text-xs font-medium ${qualityConfig.color}`}>
                  {result.mode === "upload" ? "Análisis de plataforma importada" :
                   result.mode === "new_studio" ? "Estudio nuevo — mejores prácticas aplicadas" :
                   `Calidad de datos: ${qualityConfig.label}`}
                  {result.weeksAnalyzed > 0 && ` (${result.weeksAnalyzed} semanas)`}
                </span>
              </div>
            )}

            {/* AI Summary */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-accent-amber" />
                <span className="text-sm font-semibold">Análisis de Claude</span>
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed">{result.aiSummary}</p>
            </div>

            {/* Opportunities */}
            {result.opportunities.length > 0 && (
              <div className="bg-accent-amber-light border border-accent-amber rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-accent-amber flex items-center gap-1">
                  <Zap className="h-4 w-4" /> Oportunidades detectadas
                </p>
                {result.opportunities.map((op) => (
                  <p key={op.classId} className="text-xs text-neutral-700">• {op.message}</p>
                ))}
              </div>
            )}

            {/* Suggestion list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{result.suggestions.length} clases sugeridas</p>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-accent-blue" /> Ancla</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary-400 inline-block" /> Nuevo slot</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-neutral-300 inline-block" /> Sin cambio</span>
                </div>
              </div>

              {result.suggestions.map((s) => {
                const key = `${s.classId}-${s.dayOfWeek}-${s.startTime}`;
                const isExpanded = expandedId === key;
                return (
                  <div
                    key={key}
                    className={`border rounded-xl overflow-hidden ${
                      s.isAnchor
                        ? "border-accent-blue bg-accent-blue-light/30"
                        : s.isNew
                          ? "border-primary-200 bg-primary-50/40"
                          : "border-neutral-200 bg-white"
                    }`}
                  >
                    <button
                      className="w-full flex items-center gap-3 p-3 text-left"
                      onClick={() => setExpandedId(isExpanded ? null : key)}
                    >
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: s.classColor || "#4CAF50" }}
                      />
                      <span className="font-medium text-sm flex-1 truncate">{s.className}</span>
                      <span className="text-xs text-neutral-500 shrink-0">
                        {DAY_NAMES[s.dayOfWeek]} {s.startTime}
                      </span>
                      {s.isAnchor && <Lock className="h-3.5 w-3.5 text-accent-blue shrink-0" />}
                      {s.isNew && !s.isAnchor && <Badge variant="success" className="text-xs shrink-0">Nuevo</Badge>}
                      <span className={`text-xs font-bold shrink-0 ${s.score >= 80 ? "text-primary-600" : s.score >= 60 ? "text-accent-amber" : "text-neutral-400"}`}>
                        {s.score}
                      </span>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-neutral-400 shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
                      }
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-1.5 border-t border-neutral-100 pt-2">
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          <span className="font-medium">Razón: </span>{s.reasoning}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
                          <span>🕐 {s.startTime}–{s.endTime}</span>
                          <span>👤 {s.coachName}</span>
                          <span>📍 {s.spaceName}</span>
                          <span className="capitalize">
                            {s.dataSource === "historical" ? "📊 Datos reales" :
                             s.dataSource === "upload" ? "📁 Datos importados" :
                             "⚡ Mejores prácticas"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Unschedulable */}
            {result.unschedulable.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-neutral-500">No se pudieron programar:</p>
                {result.unschedulable.map((u) => (
                  <div key={u.classId} className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-lg">
                    <AlertTriangle className="h-3 w-3 text-accent-amber shrink-0" />
                    <span className="font-medium">{u.className}</span>
                    <span>— {u.reason}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
              <Button variant="outline" onClick={() => { setStep("mode"); setResult(null); setError(null); }}>
                ← Volver
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button onClick={handleApply} disabled={result.suggestions.length === 0}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Usar este horario ({result.suggestions.filter((s) => !s.isAnchor).length} nuevas clases)
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
