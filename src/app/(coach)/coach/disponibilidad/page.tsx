"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export default function DisponibilidadPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchAvailability = useCallback(async () => {
    try {
      const res = await fetch("/api/coach/availability");
      if (res.ok) {
        const data = await res.json();
        setSlots(
          data.map((s: any) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const addSlot = (dayOfWeek: number) => {
    setSlots((prev) => [
      ...prev,
      { dayOfWeek, startTime: "09:00", endTime: "17:00" },
    ]);
    setSaved(false);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const updateSlot = (index: number, field: "startTime" | "endTime", value: string) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/coach/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const getSlotsForDay = (dayOfWeek: number) => {
    return slots
      .map((slot, index) => ({ ...slot, originalIndex: index }))
      .filter((slot) => slot.dayOfWeek === dayOfWeek);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Disponibilidad</h1>
          <p className="text-sm text-neutral-500">
            Configura tus horarios disponibles para clases
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saved ? "Guardado" : "Guardar"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {DAYS.map((day) => {
          const daySlots = getSlotsForDay(day.value);
          return (
            <Card key={day.value}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{day.label}</CardTitle>
                  <div className="flex items-center gap-2">
                    {daySlots.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {daySlots.length} {daySlots.length === 1 ? "bloque" : "bloques"}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addSlot(day.value)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {daySlots.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-4">
                    Sin disponibilidad
                  </p>
                ) : (
                  <div className="space-y-2">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.originalIndex}
                        className="flex items-center gap-2 p-2 rounded-lg bg-primary-50 border border-primary-100"
                      >
                        <Clock className="h-4 w-4 text-primary-500 shrink-0" />
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) =>
                            updateSlot(slot.originalIndex, "startTime", e.target.value)
                          }
                          className="h-8 text-sm w-24"
                        />
                        <span className="text-neutral-400 text-sm">-</span>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) =>
                            updateSlot(slot.originalIndex, "endTime", e.target.value)
                          }
                          className="h-8 text-sm w-24"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-neutral-400 hover:text-red-500"
                          onClick={() => removeSlot(slot.originalIndex)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
