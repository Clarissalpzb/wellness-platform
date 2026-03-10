"use client";

import { useState, useEffect } from "react";
import { Clock, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface CoachScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  member: { id: string; firstName: string; lastName?: string; coachProfile?: { id: string } } | null;
}

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ClassSlot {
  id: string;
  className: string;
  classColor: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationName: string;
  spaceName: string | null;
}

export function CoachScheduleDialog({ open, onClose, member }: CoachScheduleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [classes, setClasses] = useState<ClassSlot[]>([]);

  useEffect(() => {
    if (!open || !member) return;
    setLoading(true);
    fetch(`/api/staff/${member.id}/schedule`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setAvailability(data.availability);
        setClasses(data.classes);
      })
      .catch(() => {
        setAvailability([]);
        setClasses([]);
      })
      .finally(() => setLoading(false));
  }, [open, member]);

  const name = member ? `${member.firstName} ${member.lastName || ""}`.trim() : "";

  const availabilityByDay = availability.reduce<Record<number, AvailabilitySlot[]>>((acc, slot) => {
    (acc[slot.dayOfWeek] ??= []).push(slot);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Horarios de {name}</DialogTitle>
          <DialogDescription>Disponibilidad semanal y clases asignadas</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Availability */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 mb-3">Disponibilidad</h3>
              {availability.length === 0 ? (
                <p className="text-sm text-neutral-400">Sin disponibilidad configurada</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(availabilityByDay)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([day, slots]) => (
                      <div key={day} className="flex items-start gap-3">
                        <span className="text-sm font-medium text-neutral-600 w-24 shrink-0">
                          {DAY_NAMES[Number(day)]}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {slots.map((s, i) => (
                            <Badge key={i} variant="secondary" className="font-normal">
                              <Clock className="mr-1 h-3 w-3" />
                              {s.startTime} – {s.endTime}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Classes */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 mb-3">Clases Asignadas</h3>
              {classes.length === 0 ? (
                <p className="text-sm text-neutral-400">Sin clases asignadas</p>
              ) : (
                <div className="space-y-2">
                  {classes.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3"
                    >
                      <div
                        className="w-2 h-8 rounded-full shrink-0"
                        style={{ backgroundColor: c.classColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.className}</p>
                        <div className="flex items-center gap-3 text-xs text-neutral-500">
                          <span>{DAY_NAMES[c.dayOfWeek]}</span>
                          <span>{c.startTime} – {c.endTime}</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {c.locationName}
                            {c.spaceName && ` · ${c.spaceName}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
