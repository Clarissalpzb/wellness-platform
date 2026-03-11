"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Wand2, Check, X, CheckCheck, Trash2, Loader2, Plus, CalendarPlus, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScheduleDialog, type ScheduleDialogData } from "@/components/schedule/schedule-dialog";
import { BulkScheduleDialog } from "@/components/schedule/bulk-schedule-dialog";

const HOUR_START = 6;
const HOUR_END = 21;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const ROW_HEIGHT = 60;

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
// Display order: Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6), Sun(0)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface ScheduleItem {
  id: string;
  classId: string;
  startTime: string;
  endTime: string;
  className: string;
  classColor: string;
  duration: number;
  capacity: number;
  category: string | null;
  level: string | null;
  locationId: string | null;
  location: string;
  spaceId: string | null;
  space: string;
  coach: string;
  coachProfileId: string | null;
}

interface CoachAvailability {
  coachProfileId: string;
  coachName: string;
  color: string;
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
}

interface ScheduleSuggestion {
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

interface UnschedulableClass {
  classId: string;
  className: string;
  reason: string;
}

interface LocationItem {
  id: string;
  name: string;
  spaces: { id: string; name: string }[];
}

interface ClassOption {
  id: string;
  name: string;
  duration: number;
  color: string;
}

interface CoachOption {
  id: string;
  firstName: string;
  lastName: string;
  coachProfileId: string;
}

function getMonday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}–${sunday.getDate()} ${months[monday.getMonth()]} ${monday.getFullYear()}`;
  }
  return `${monday.getDate()} ${months[monday.getMonth()]} – ${sunday.getDate()} ${months[sunday.getMonth()]} ${sunday.getFullYear()}`;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

function getSuggestionDuration(s: ScheduleSuggestion): number {
  return timeToMinutes(s.endTime) - timeToMinutes(s.startTime);
}

function snapTo15(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

export default function HorariosPage() {
  return (
    <Suspense>
      <HorariosContent />
    </Suspense>
  );
}

function HorariosContent() {
  const searchParams = useSearchParams();
  const highlightClassId = searchParams.get("clase") || null;

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [schedules, setSchedules] = useState<Record<number, ScheduleItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCoachId, setSelectedCoachId] = useState<string>("");
  const [coachData, setCoachData] = useState<CoachAvailability[] | null>(null);
  const [tooltip, setTooltip] = useState<{ item: ScheduleItem; x: number; y: number } | null>(null);

  // Auto-suggest state
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [unschedulable, setUnschedulable] = useState<UnschedulableClass[]>([]);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // Schedule dialog state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDialogMode, setScheduleDialogMode] = useState<"create" | "edit">("create");
  const [scheduleDialogData, setScheduleDialogData] = useState<ScheduleDialogData | undefined>(undefined);

  // Data for schedule dialog
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [coachOptions, setCoachOptions] = useState<CoachOption[]>([]);

  // Bulk schedule dialog state
  const [showBulkDialog, setShowBulkDialog] = useState(false);


  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule/week?weekStart=${toISODate(weekStart)}`);
      if (res.ok) {
        setSchedules(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Fetch locations on mount
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: LocationItem[]) => {
        setLocations(data);
        if (data.length > 0 && !selectedLocationId) {
          setSelectedLocationId(data[0].id);
        }
      })
      .catch(() => setLocations([]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch classes and coaches on mount (for schedule dialog)
  useEffect(() => {
    fetch("/api/classes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        setClassOptions(
          data
            .filter((c: any) => c.isActive)
            .map((c: any) => ({ id: c.id, name: c.name, duration: c.duration, color: c.color }))
        );
      })
      .catch(() => setClassOptions([]));

    fetch("/api/staff")
      .then((r) => (r.ok ? r.json() : []))
      .then((staff: any[]) => {
        setCoachOptions(
          staff
            .filter((s: any) => s.coachProfile)
            .map((s: any) => ({
              id: s.id,
              firstName: s.firstName,
              lastName: s.lastName,
              coachProfileId: s.coachProfile.id,
            }))
        );
      })
      .catch(() => setCoachOptions([]));
  }, []);

  useEffect(() => {
    if (!coachData) {
      fetch("/api/coach/availability/all")
        .then((r) => (r.ok ? r.json() : []))
        .then(setCoachData)
        .catch(() => setCoachData([]));
    }
  }, [coachData]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goToday = () => setWeekStart(getMonday(new Date()));

  // Schedule dialog handlers
  const openCreateDialog = (dayOfWeek: number, startTime?: string) => {
    setScheduleDialogMode("create");
    setScheduleDialogData({
      dayOfWeek,
      startTime: startTime || "",
      locationId: locations.length === 1 ? locations[0].id : "",
    });
    setShowScheduleDialog(true);
  };

  const openEditDialog = (item: ScheduleItem, dayOfWeek: number) => {
    setScheduleDialogMode("edit");
    setScheduleDialogData({
      id: item.id,
      classId: item.classId,
      className: item.className,
      dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      locationId: item.locationId || "",
      spaceId: item.spaceId,
      coachProfileId: item.coachProfileId,
      duration: item.duration,
    });
    setShowScheduleDialog(true);
  };

  const handleScheduleSaved = () => {
    setShowScheduleDialog(false);
    setScheduleDialogData(undefined);
    fetchSchedules();
  };

  const handleScheduleClose = () => {
    setShowScheduleDialog(false);
    setScheduleDialogData(undefined);
  };

  // Click on empty calendar space
  const handleColumnClick = (dow: number, e: React.MouseEvent<HTMLDivElement>) => {
    // Don't open dialog if clicking on a schedule block
    if ((e.target as HTMLElement).closest("[data-schedule-block]")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const yOffset = e.clientY - rect.top;
    const rawMinutes = HOUR_START * 60 + (yOffset / ROW_HEIGHT) * 60;
    const snapped = snapTo15(rawMinutes);
    const time = minutesToTime(Math.max(HOUR_START * 60, Math.min(snapped, HOUR_END * 60 - 15)));
    openCreateDialog(dow, time);
  };

  // Auto-suggest handlers
  const handleAutoSuggest = async () => {
    if (!selectedLocationId) return;
    setIsSuggesting(true);
    setSuggestError(null);
    setSuggestions([]);
    setUnschedulable([]);
    setAcceptedIds(new Set());
    setRejectedIds(new Set());

    try {
      const res = await fetch("/api/schedule/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: selectedLocationId }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSuggestError(err.error || "Error al generar sugerencias");
        return;
      }
      const data = await res.json();
      setSuggestions(data.suggestions);
      setUnschedulable(data.unschedulable);
      if (data.suggestions.length === 0 && data.unschedulable.length === 0) {
        setSuggestError("Todas las clases ya tienen horario asignado");
      }
    } catch {
      setSuggestError("Error de conexión");
    } finally {
      setIsSuggesting(false);
    }
  };

  const toggleAccept = (classId: string) => {
    setAcceptedIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
        setRejectedIds((r) => {
          const nr = new Set(r);
          nr.delete(classId);
          return nr;
        });
      }
      return next;
    });
  };

  const toggleReject = (classId: string) => {
    setRejectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
        setAcceptedIds((a) => {
          const na = new Set(a);
          na.delete(classId);
          return na;
        });
      }
      return next;
    });
  };

  const acceptAll = () => {
    setAcceptedIds(new Set(suggestions.map((s) => s.classId)));
    setRejectedIds(new Set());
  };

  const discardAll = () => {
    setSuggestions([]);
    setUnschedulable([]);
    setAcceptedIds(new Set());
    setRejectedIds(new Set());
  };

  const handleConfirm = async () => {
    const toCreate = suggestions.filter((s) => acceptedIds.has(s.classId));
    if (toCreate.length === 0) return;

    setIsConfirming(true);
    try {
      const schedulePayloads = toCreate.map((s) => ({
        classId: s.classId,
        locationId: s.locationId,
        spaceId: s.spaceId,
        coachProfileId: s.coachProfileId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isRecurring: true,
      }));

      const res = await fetch("/api/schedule/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules: schedulePayloads }),
      });

      if (res.ok) {
        setSuggestions([]);
        setUnschedulable([]);
        setAcceptedIds(new Set());
        setRejectedIds(new Set());
        fetchSchedules();
      } else {
        const err = await res.json();
        setSuggestError(err.error || "Error al crear horarios");
      }
    } catch {
      setSuggestError("Error de conexión");
    } finally {
      setIsConfirming(false);
    }
  };

  // Compute dates for each column header
  const columnDates = DAY_ORDER.map((dow, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hasSuggestions = suggestions.length > 0;
  const acceptedCount = acceptedIds.size;
  const pendingCount = suggestions.filter(
    (s) => !acceptedIds.has(s.classId) && !rejectedIds.has(s.classId)
  ).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Calendario Semanal</h1>
          <p className="text-sm text-neutral-500">Vista general de horarios y disponibilidad</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(true)}>
            <CalendarPlus className="h-4 w-4 mr-1" />
            Agendar Horario
          </Button>
          <Button variant="outline" size="sm" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoy
          </Button>
          <span className="text-sm font-medium min-w-[160px] text-center">
            {formatWeekLabel(weekStart)}
          </span>
          <Button variant="outline" size="sm" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Controls row: availability toggle + location selector + wand button */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-neutral-400" />
          <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Ver disponibilidad de..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ninguno</SelectItem>
              {coachData?.map((c) => (
                <SelectItem key={c.coachProfileId} value={c.coachProfileId}>
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    {c.coachName}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {locations.length > 1 && (
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="text-sm border border-neutral-300 rounded-md px-2 py-1.5 bg-white"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Suggestion controls bar */}
      {hasSuggestions && (
        <div className="flex flex-wrap items-center gap-3 bg-violet-50 border border-violet-200 rounded-lg px-4 py-2.5">
          <Badge variant="outline" className="border-violet-300 text-violet-700">
            {suggestions.length} sugerencia{suggestions.length !== 1 ? "s" : ""}
          </Badge>
          {acceptedCount > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
              {acceptedCount} aceptada{acceptedCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {pendingCount > 0 && (
            <Badge variant="outline" className="border-neutral-300 text-neutral-500">
              {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
            </Badge>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={acceptAll}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Aceptar todas
            </Button>
            <Button variant="outline" size="sm" onClick={discardAll}>
              <Trash2 className="h-4 w-4 mr-1" />
              Descartar
            </Button>
            {acceptedCount > 0 && (
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isConfirming}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isConfirming ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Confirmar seleccionadas ({acceptedCount})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {suggestError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
          {suggestError}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="border border-neutral-200 rounded-lg overflow-auto bg-white relative">
        <div
          className="grid min-w-[800px]"
          style={{
            gridTemplateColumns: "60px repeat(7, 1fr)",
          }}
        >
          {/* Header row */}
          <div className="border-b border-r border-neutral-200 bg-neutral-50 p-2" />
          {DAY_ORDER.map((dow, i) => {
            const d = columnDates[i];
            const isToday = toISODate(d) === toISODate(new Date());
            return (
              <div
                key={dow}
                className={`border-b border-neutral-200 p-2 text-center text-sm font-medium relative group ${
                  i < 6 ? "border-r" : ""
                } ${isToday ? "bg-primary-50" : "bg-neutral-50"}`}
              >
                <div className={isToday ? "text-primary-600" : "text-neutral-700"}>
                  {DAY_LABELS[dow]}
                </div>
                <div
                  className={`text-lg ${
                    isToday
                      ? "bg-primary-500 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto"
                      : "text-neutral-900"
                  }`}
                >
                  {d.getDate()}
                </div>
                {/* "+" button on day header */}
                <button
                  onClick={() => openCreateDialog(dow)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-neutral-200"
                  title="Agregar horario"
                >
                  <Plus className="h-3.5 w-3.5 text-neutral-500" />
                </button>
              </div>
            );
          })}

          {/* Time rows + day columns */}
          <div
            className="col-span-full grid"
            style={{
              gridTemplateColumns: "60px repeat(7, 1fr)",
            }}
          >
            {/* Time labels column */}
            <div className="border-r border-neutral-200 relative">
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="text-xs text-neutral-400 text-right pr-2 absolute w-full"
                  style={{ top: i * ROW_HEIGHT - 6, height: ROW_HEIGHT }}
                >
                  {String(HOUR_START + i).padStart(2, "0")}:00
                </div>
              ))}
              <div style={{ height: TOTAL_HOURS * ROW_HEIGHT }} />
            </div>

            {/* Day columns */}
            {DAY_ORDER.map((dow, colIdx) => {
              const daySchedules = schedules[dow] || [];
              const selectedCoach = selectedCoachId && selectedCoachId !== "none" && coachData
                ? coachData.find((c) => c.coachProfileId === selectedCoachId)
                : null;
              const dayAvailability = selectedCoach
                ? selectedCoach.availability
                    .filter((a) => a.dayOfWeek === dow)
                    .map((a) => ({ ...a, color: selectedCoach.color, coachName: selectedCoach.coachName }))
                : [];
              const isToday = toISODate(columnDates[colIdx]) === toISODate(new Date());

              // Ghost blocks for this day
              const daySuggestions = suggestions.filter(
                (s) => s.dayOfWeek === dow && !rejectedIds.has(s.classId)
              );

              return (
                <div
                  key={dow}
                  className={`relative cursor-crosshair ${colIdx < 6 ? "border-r border-neutral-200" : ""} ${
                    isToday ? "bg-primary-50/30" : ""
                  }`}
                  style={{ height: TOTAL_HOURS * ROW_HEIGHT }}
                  onClick={(e) => handleColumnClick(dow, e)}
                >
                  {/* Horizontal gridlines */}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div
                      key={i}
                      className="absolute w-full border-b border-neutral-100 pointer-events-none"
                      style={{ top: i * ROW_HEIGHT }}
                    />
                  ))}

                  {/* Coach availability strips */}
                  {dayAvailability.map((avail, aIdx) => {
                    const startMin = timeToMinutes(avail.startTime);
                    const endMin = timeToMinutes(avail.endTime);
                    const topOffset = (startMin - HOUR_START * 60) * (ROW_HEIGHT / 60);
                    const height = (endMin - startMin) * (ROW_HEIGHT / 60);
                    if (topOffset + height <= 0 || topOffset >= TOTAL_HOURS * ROW_HEIGHT) return null;
                    return (
                      <div
                        key={`avail-${aIdx}`}
                        className="absolute left-0 right-0 opacity-20 z-0 pointer-events-none"
                        style={{
                          top: Math.max(0, topOffset),
                          height: Math.min(height, TOTAL_HOURS * ROW_HEIGHT - topOffset),
                          backgroundColor: avail.color,
                        }}
                      />
                    );
                  })}

                  {/* Existing schedule blocks */}
                  {daySchedules.map((item) => {
                    const startMin = timeToMinutes(item.startTime);
                    const topOffset = (startMin - HOUR_START * 60) * (ROW_HEIGHT / 60);
                    const height = item.duration * (ROW_HEIGHT / 60);
                    const isShort = item.duration < 30;
                    const isHighlighted = highlightClassId === item.classId;

                    return (
                      <div
                        key={item.id}
                        data-schedule-block
                        className={`absolute left-1 right-1 rounded-md shadow-sm z-10 overflow-hidden cursor-pointer px-1.5 py-1 text-white transition-shadow hover:shadow-md ${
                          isHighlighted ? "ring-2 ring-offset-1 ring-yellow-400" : ""
                        }`}
                        style={{
                          top: topOffset,
                          height,
                          backgroundColor: item.classColor,
                          opacity: 0.9,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTooltip(null);
                          openEditDialog(item, dow);
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({ item, x: rect.left + rect.width / 2, y: rect.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <div className="text-xs font-semibold truncate leading-tight">
                          {item.className}
                        </div>
                        {!isShort && (
                          <>
                            <div className="text-[10px] opacity-90 truncate leading-tight">
                              {item.coach}
                            </div>
                            <div className="text-[10px] opacity-80 truncate leading-tight">
                              {formatTimeDisplay(item.startTime)} – {formatTimeDisplay(item.endTime)}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Ghost suggestion blocks */}
                  {daySuggestions.map((sug) => {
                    const startMin = timeToMinutes(sug.startTime);
                    const duration = getSuggestionDuration(sug);
                    const topOffset = (startMin - HOUR_START * 60) * (ROW_HEIGHT / 60);
                    const height = duration * (ROW_HEIGHT / 60);
                    const isAccepted = acceptedIds.has(sug.classId);
                    const isShort = duration < 30;

                    return (
                      <div
                        key={`sug-${sug.classId}`}
                        data-schedule-block
                        className={`absolute left-1 right-1 rounded-md z-20 overflow-hidden px-1.5 py-1 border-2 border-dashed ${
                          isAccepted
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-neutral-400 bg-white"
                        }`}
                        style={{
                          top: topOffset,
                          height,
                          borderColor: isAccepted ? undefined : sug.classColor,
                        }}
                      >
                        <div
                          className="text-xs font-semibold truncate leading-tight"
                          style={{ color: sug.classColor }}
                        >
                          {sug.className}
                        </div>
                        {!isShort && (
                          <>
                            <div className="text-[10px] text-neutral-500 truncate leading-tight">
                              {sug.coachName}
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate leading-tight">
                              {formatTimeDisplay(sug.startTime)} – {formatTimeDisplay(sug.endTime)}
                            </div>
                          </>
                        )}
                        {/* Accept/Reject buttons */}
                        <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleAccept(sug.classId); }}
                            className={`p-0.5 rounded ${
                              isAccepted
                                ? "bg-emerald-500 text-white"
                                : "bg-white/90 text-emerald-600 hover:bg-emerald-100"
                            }`}
                            title="Aceptar"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleReject(sug.classId); }}
                            className="p-0.5 rounded bg-white/90 text-red-500 hover:bg-red-100"
                            title="Rechazar"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 bg-neutral-900 text-white text-xs rounded-lg shadow-lg px-3 py-2 pointer-events-none max-w-[220px]"
            style={{
              left: tooltip.x,
              top: tooltip.y - 8,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="font-semibold">{tooltip.item.className}</div>
            <div className="text-neutral-300">
              {formatTimeDisplay(tooltip.item.startTime)} – {formatTimeDisplay(tooltip.item.endTime)}
            </div>
            {tooltip.item.coach && <div className="text-neutral-300">Coach: {tooltip.item.coach}</div>}
            {tooltip.item.location && (
              <div className="text-neutral-300">
                {tooltip.item.location}
                {tooltip.item.space ? ` · ${tooltip.item.space}` : ""}
              </div>
            )}
            <div className="text-neutral-300">Capacidad: {tooltip.item.capacity}</div>
            {tooltip.item.category && (
              <div className="text-neutral-300">{tooltip.item.category}</div>
            )}
            {tooltip.item.level && (
              <div className="text-neutral-300">Nivel: {tooltip.item.level}</div>
            )}
          </div>
        )}
      </div>

      {/* Unschedulable classes warning */}
      {unschedulable.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-sm font-medium text-amber-800 mb-1">
            Clases sin horario posible:
          </p>
          <ul className="space-y-1">
            {unschedulable.map((u) => (
              <li key={u.classId} className="text-sm text-amber-700">
                <span className="font-medium">{u.className}</span> — {u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-neutral-500 py-8">Cargando horarios...</div>
      )}

      {/* Schedule create/edit dialog */}
      <ScheduleDialog
        open={showScheduleDialog}
        mode={scheduleDialogMode}
        initialData={scheduleDialogData}
        classes={classOptions}
        locations={locations}
        coaches={coachOptions}
        onSaved={handleScheduleSaved}
        onClose={handleScheduleClose}
      />

      {/* Bulk schedule dialog */}
      <BulkScheduleDialog
        open={showBulkDialog}
        classes={classOptions}
        locations={locations}
        onSaved={() => { setShowBulkDialog(false); fetchSchedules(); }}
        onClose={() => setShowBulkDialog(false)}
      />

    </div>
  );
}
