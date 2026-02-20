"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Clock, User, Users, MapPin, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
}

// ---------------------------------------------------------------------------
// Mock data (fallback)
// ---------------------------------------------------------------------------
const mockSchedule: ScheduleItem[] = [
  { id: "1", time: "07:00", endTime: "08:00", name: "Yoga Flow", coach: "María García", enrolled: 16, capacity: 20, color: "#22c55e", level: "Todos", location: "Sala Principal" },
  { id: "2", time: "08:00", endTime: "08:45", name: "HIIT Cardio", coach: "Carlos López", enrolled: 15, capacity: 15, color: "#3b82f6", level: "Intermedio", location: "Sala Principal" },
  { id: "3", time: "09:00", endTime: "09:50", name: "Pilates Mat", coach: "María García", enrolled: 10, capacity: 12, color: "#f59e0b", level: "Principiante", location: "Sala Yoga" },
  { id: "4", time: "10:00", endTime: "10:30", name: "Meditación", coach: "Laura Rdz", enrolled: 8, capacity: 25, color: "#8b5cf6", level: "Todos", location: "Sala Meditación" },
  { id: "5", time: "17:00", endTime: "18:00", name: "Yoga Flow", coach: "María García", enrolled: 20, capacity: 20, color: "#22c55e", level: "Todos", location: "Sala Principal" },
  { id: "6", time: "18:00", endTime: "18:45", name: "HIIT Cardio", coach: "Carlos López", enrolled: 14, capacity: 15, color: "#3b82f6", level: "Intermedio", location: "Sala Principal" },
  { id: "7", time: "19:00", endTime: "20:00", name: "CrossFit", coach: "Carlos López", enrolled: 9, capacity: 10, color: "#f43f5e", level: "Avanzado", location: "Sala Principal" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function buildDates(count = 7): { day: string; date: number; month: string; iso: string }[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      day: dayNames[d.getDay()],
      date: d.getDate(),
      month: monthNames[d.getMonth()],
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ReservarPage() {
  const dates = buildDates(7);

  const [selectedDay, setSelectedDay] = useState(0);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(mockSchedule);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bookingMessage, setBookingMessage] = useState("");

  const selectedDate = dates[selectedDay]?.iso ?? "";

  // ---- Fetch schedule when day changes ----
  const fetchSchedule = useCallback(async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule?date=${dateStr}`);
      if (!res.ok) throw new Error("API error");
      const data: ScheduleItem[] = await res.json();
      setSchedule(data.length > 0 ? data : mockSchedule);
    } catch {
      setSchedule(mockSchedule);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchSchedule(selectedDate);
    }
  }, [selectedDate, fetchSchedule]);

  // ---- Booking handler ----
  const handleBook = async () => {
    if (!showBooking) return;
    setBookingStatus("loading");
    setBookingMessage("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classScheduleId: showBooking, date: selectedDate }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al reservar" }));
        throw new Error(err.error || "Error al reservar");
      }
      setBookingStatus("success");
      setBookingMessage("Reserva confirmada exitosamente.");
      // Refresh schedule to update counts
      fetchSchedule(selectedDate);
    } catch (e: unknown) {
      setBookingStatus("error");
      setBookingMessage(e instanceof Error ? e.message : "Error al reservar. Intenta de nuevo.");
    }
  };

  const openDialog = (id: string) => {
    setShowBooking(id);
    setBookingStatus("idle");
    setBookingMessage("");
  };

  const closeDialog = () => {
    setShowBooking(null);
    setBookingStatus("idle");
    setBookingMessage("");
  };

  const selectedClass = schedule.find((c) => c.id === showBooking);
  const isFull = selectedClass ? selectedClass.enrolled >= selectedClass.capacity : false;

  // ---- Navigate week ----
  // (date array is built dynamically starting from today so prev/next are not applicable in the simple version)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Reservar Clase</h1>
        <p className="text-sm text-neutral-500">Selecciona una clase para reservar</p>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0" disabled>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-2 overflow-x-auto flex-1">
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
        <Button variant="ghost" size="icon" className="shrink-0" disabled>
          <ChevronRight className="h-4 w-4" />
        </Button>
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
      ) : (
        <div className="space-y-3">
          {schedule.map((cls) => {
            const full = cls.enrolled >= cls.capacity;
            const spotsLeft = cls.capacity - cls.enrolled;

            return (
              <Card
                key={cls.id}
                className={cn("cursor-pointer transition-shadow hover:shadow-md", full && "opacity-75")}
                onClick={() => openDialog(cls.id)}
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
                        <Badge variant="warning">Lista de espera</Badge>
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

      {/* Booking Dialog */}
      <Dialog open={!!showBooking} onOpenChange={() => closeDialog()}>
        {selectedClass && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedClass.name}</DialogTitle>
              <DialogDescription>
                {dates[selectedDay].day} {dates[selectedDay].date} de {dates[selectedDay].month} - {selectedClass.time}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-neutral-400" />
                <span>Coach: {selectedClass.coach}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-neutral-400" />
                <span>{selectedClass.time} - {selectedClass.endTime}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-neutral-400" />
                <span>{selectedClass.location}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 text-neutral-400" />
                <span>
                  {selectedClass.enrolled}/{selectedClass.capacity} reservados
                  {isFull && " (llena)"}
                </span>
              </div>
              {isFull && bookingStatus === "idle" && (
                <div className="bg-accent-amber-light text-amber-800 text-sm p-3 rounded-lg">
                  Esta clase está llena. Puedes unirte a la lista de espera y te notificaremos si se libera un lugar.
                </div>
              )}

              {/* Booking feedback */}
              {bookingStatus === "success" && (
                <div className="flex items-center gap-2 bg-green-50 text-green-800 text-sm p-3 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>{bookingMessage}</span>
                </div>
              )}
              {bookingStatus === "error" && (
                <div className="flex items-center gap-2 bg-red-50 text-red-800 text-sm p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{bookingMessage}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                {bookingStatus === "success" ? "Cerrar" : "Cancelar"}
              </Button>
              {bookingStatus !== "success" && (
                <Button onClick={handleBook} disabled={bookingStatus === "loading"}>
                  {bookingStatus === "loading" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isFull ? "Unirme a Lista de Espera" : "Reservar"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
