"use client";

import { useState, useEffect } from "react";
import { Loader2, CalendarPlus, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface ClassOption {
  id: string;
  name: string;
  duration: number;
  color: string;
}

interface LocationOption {
  id: string;
  name: string;
  spaces: { id: string; name: string }[];
}

interface BulkAssignment {
  dayOfWeek: number;
  coachProfileId: string | null;
  coachName: string | null;
  spaceId: string | null;
  spaceName: string | null;
}

interface BulkSuggestResponse {
  assignments: BulkAssignment[];
  classId: string;
  className: string;
  duration: number;
  startTime: string;
  endTime: string;
  locationId: string;
}

interface BulkScheduleDialogProps {
  open: boolean;
  classes: ClassOption[];
  locations: LocationOption[];
  onSaved: () => void;
  onClose: () => void;
}

function computeEndTime(start: string, durationMin: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + durationMin;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

export function BulkScheduleDialog({
  open,
  classes,
  locations,
  onSaved,
  onClose,
}: BulkScheduleDialogProps) {
  const [classId, setClassId] = useState("");
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState("07:00");
  const [locationId, setLocationId] = useState("");
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkSuggestResponse | null>(null);

  useEffect(() => {
    if (open) {
      setClassId("");
      setSelectedDays(new Set());
      setStartTime("07:00");
      setLocationId(locations.length === 1 ? locations[0].id : "");
      setSearching(false);
      setConfirming(false);
      setError(null);
      setResult(null);
    }
  }, [open, locations]);

  const selectedClass = classes.find((c) => c.id === classId);
  const duration = selectedClass?.duration ?? 60;
  const endTime = startTime ? computeEndTime(startTime, duration) : "";

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
    setResult(null);
  };

  const canSearch = classId && selectedDays.size > 0 && startTime && locationId;

  const handleSearch = async () => {
    if (!canSearch) return;
    setSearching(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/schedule/bulk-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          days: Array.from(selectedDays).sort((a, b) => a - b),
          startTime,
          locationId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Error al buscar coaches");
        return;
      }

      setResult(await res.json());
    } catch {
      setError("Error de conexión");
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = async () => {
    if (!result) return;
    setConfirming(true);
    setError(null);

    try {
      const schedules = result.assignments.map((a) => ({
        classId: result.classId,
        dayOfWeek: a.dayOfWeek,
        startTime: result.startTime,
        endTime: result.endTime,
        locationId: result.locationId,
        spaceId: a.spaceId,
        coachProfileId: a.coachProfileId,
        isRecurring: true,
      }));

      const res = await fetch("/api/schedule/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Error al crear horarios");
        return;
      }

      onSaved();
    } catch {
      setError("Error de conexión");
    } finally {
      setConfirming(false);
    }
  };

  // Display order: Mon(1) to Sun(0)
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Agendar en Bloque
          </DialogTitle>
          <DialogDescription>
            Crea múltiples horarios recurrentes con auto-asignación de coaches
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Class select */}
          <div className="space-y-2">
            <Label>Clase</Label>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setResult(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar clase" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Day multi-select */}
          <div className="space-y-2">
            <Label>Días</Label>
            <div className="flex gap-1.5">
              {dayOrder.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    selectedDays.has(day)
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Hora inicio</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => { setStartTime(e.target.value); setResult(null); }}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora fin</Label>
              <Input type="time" value={endTime} readOnly className="bg-neutral-50" />
              {startTime && selectedClass && (
                <p className="text-xs text-neutral-400">{duration} min</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Ubicación</Label>
            <Select value={locationId} onValueChange={(v) => { setLocationId(v); setResult(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar ubicación" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search button */}
          <Button
            onClick={handleSearch}
            disabled={!canSearch || searching}
            className="w-full"
            variant="outline"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Buscar coaches
          </Button>

          {/* Preview table */}
          {result && (
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="text-left px-3 py-2 font-medium text-neutral-600">Día</th>
                    <th className="text-left px-3 py-2 font-medium text-neutral-600">Coach</th>
                    <th className="text-left px-3 py-2 font-medium text-neutral-600">Espacio</th>
                  </tr>
                </thead>
                <tbody>
                  {result.assignments.map((a) => (
                    <tr
                      key={a.dayOfWeek}
                      className={`border-b border-neutral-100 last:border-0 ${
                        !a.coachProfileId ? "bg-amber-50" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-medium">{DAY_LABELS[a.dayOfWeek]}</td>
                      <td className="px-3 py-2">
                        {a.coachName ? (
                          a.coachName
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Sin coach asignado
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {a.spaceName ?? <span className="text-neutral-400">Sin espacio</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.assignments.some((a) => !a.coachProfileId) && (
                <div className="px-3 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700">
                  Los días sin coach se crearán sin asignar — se puede editar después.
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {result && (
            <Button onClick={handleConfirm} disabled={confirming}>
              {confirming && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirmar ({result.assignments.length} horarios)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
