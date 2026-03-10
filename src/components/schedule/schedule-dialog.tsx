"use client";

import { useState, useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";
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

interface CoachOption {
  id: string;
  firstName: string;
  lastName: string;
  coachProfileId: string;
}

export interface ScheduleDialogData {
  id?: string;
  classId?: string;
  className?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  locationId?: string;
  spaceId?: string | null;
  coachProfileId?: string | null;
  duration?: number;
}

interface ScheduleDialogProps {
  open: boolean;
  mode: "create" | "edit";
  initialData?: ScheduleDialogData;
  classes: ClassOption[];
  locations: LocationOption[];
  coaches: CoachOption[];
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

export function ScheduleDialog({
  open,
  mode,
  initialData,
  classes,
  locations,
  coaches,
  onSaved,
  onClose,
}: ScheduleDialogProps) {
  const [classId, setClassId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [locationId, setLocationId] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [coachProfileId, setCoachProfileId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialData) {
      setClassId(initialData.classId || "");
      setDayOfWeek(initialData.dayOfWeek ?? null);
      setStartTime(initialData.startTime || "");
      setLocationId(initialData.locationId || "");
      setSpaceId(initialData.spaceId || "");
      setCoachProfileId(initialData.coachProfileId || "");
      setError(null);
    } else if (open) {
      setClassId("");
      setDayOfWeek(null);
      setStartTime("");
      setLocationId(locations.length === 1 ? locations[0].id : "");
      setSpaceId("");
      setCoachProfileId("");
      setError(null);
    }
  }, [open, initialData, locations]);

  const selectedClass = classes.find((c) => c.id === classId);
  const duration = selectedClass?.duration || initialData?.duration || 60;
  const endTime = startTime ? computeEndTime(startTime, duration) : "";
  const selectedLocation = locations.find((l) => l.id === locationId);
  const filteredSpaces = selectedLocation?.spaces ?? [];

  const canSave =
    (mode === "edit" || classId) &&
    dayOfWeek !== null &&
    startTime &&
    locationId;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    try {
      if (mode === "create") {
        const res = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId,
            dayOfWeek,
            startTime,
            endTime,
            locationId,
            spaceId: spaceId || undefined,
            coachProfileId: coachProfileId || undefined,
            isRecurring: true,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || "Error al crear horario");
          return;
        }
      } else {
        const body: Record<string, any> = {};
        if (dayOfWeek !== (initialData?.dayOfWeek ?? null)) body.dayOfWeek = dayOfWeek;
        if (startTime !== (initialData?.startTime || "")) {
          body.startTime = startTime;
          body.endTime = endTime;
        }
        if (locationId !== (initialData?.locationId || "")) body.locationId = locationId;
        if (spaceId !== (initialData?.spaceId || "")) body.spaceId = spaceId || "";
        if (coachProfileId !== (initialData?.coachProfileId || "")) body.coachProfileId = coachProfileId || "";

        const res = await fetch(`/api/schedule/${initialData?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || "Error al actualizar horario");
          return;
        }
      }
      onSaved();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedule/${initialData.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Error al eliminar horario");
        return;
      }
      onSaved();
    } catch {
      setError("Error de conexión");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar Horario" : "Nuevo Horario"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Modifica los datos del horario"
              : "Agrega un nuevo horario al calendario"}
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
            {mode === "edit" ? (
              <Input value={initialData?.className || ""} readOnly className="bg-neutral-50" />
            ) : (
              <Select value={classId} onValueChange={setClassId}>
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
            )}
          </div>

          {/* Day selection - 7 single-select buttons */}
          <div className="space-y-2">
            <Label>Día</Label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDayOfWeek(i)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    dayOfWeek === i
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {label}
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
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora fin</Label>
              <Input
                type="time"
                value={endTime}
                readOnly
                className="bg-neutral-50"
              />
              {startTime && (
                <p className="text-xs text-neutral-400">{duration} min</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Ubicación</Label>
            <Select value={locationId} onValueChange={(v) => { setLocationId(v); setSpaceId(""); }}>
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

          {/* Space */}
          <div className="space-y-2">
            <Label>Salón</Label>
            <Select value={spaceId} onValueChange={setSpaceId} disabled={filteredSpaces.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                {filteredSpaces.map((sp) => (
                  <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Coach */}
          <div className="space-y-2">
            <Label>Instructor</Label>
            <Select value={coachProfileId} onValueChange={setCoachProfileId}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((c) => (
                  <SelectItem key={c.coachProfileId} value={c.coachProfileId}>
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {mode === "edit" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Eliminar
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!canSave || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
