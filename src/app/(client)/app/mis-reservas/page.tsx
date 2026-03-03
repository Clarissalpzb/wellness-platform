"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, MapPin, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Booking {
  id: string;
  className: string;
  coach: string;
  date: string;
  time: string;
  location: string;
  color: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const statusLabels: Record<string, string> = {
  CONFIRMED: "Confirmada",
  CHECKED_IN: "Check-in",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

const statusVariant: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
  CONFIRMED: "success",
  CHECKED_IN: "success",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

const fullDayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const fullMonthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function formatBookingDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${fullDayNames[d.getUTCDay()]} ${d.getUTCDate()} de ${fullMonthNames[d.getUTCMonth()]}`;
}

function formatTime12h(time24: string): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

/**
 * Try to map an API booking response into the display format.
 * API may return nested objects (classSchedule.class.name, etc.) or
 * an already-flat shape. This normalises both.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBooking(raw: any): Booking {
  // Already flat (mock shape)
  if (raw.className) return raw as Booking;

  // Nested API shape
  const cs = raw.classSchedule ?? {};
  const cls = cs.class ?? cs.classInfo ?? {};
  return {
    id: raw.id,
    className: cls.name ?? raw.name ?? "Clase",
    coach: cs.coach ?? raw.coach ?? "",
    date: raw.date ?? "",
    time: cs.time && cs.endTime ? `${cs.time} - ${cs.endTime}` : raw.time ?? "",
    location: cs.location ?? raw.location ?? "",
    color: cls.color ?? raw.color ?? "#6b7280",
    status: raw.status ?? "confirmed",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MisReservasPage() {
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // ---- Fetch bookings ----
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const [upRes, pastRes] = await Promise.all([
        fetch("/api/bookings?upcoming=true"),
        fetch("/api/bookings"),
      ]);

      if (!upRes.ok && !pastRes.ok) throw new Error("API error");

      const upData = upRes.ok ? await upRes.json() : null;
      const pastData = pastRes.ok ? await pastRes.json() : null;

      if (upData && Array.isArray(upData)) {
        setUpcoming(upData.map(mapBooking));
      } else {
        setUpcoming([]);
      }

      if (pastData && Array.isArray(pastData)) {
        // If both endpoints returned the same data, separate by status
        const all = pastData.map(mapBooking);
        const upcomingStatuses = new Set(["CONFIRMED", "CHECKED_IN"]);
        const pastOnly = all.filter((b) => !upcomingStatuses.has(b.status));
        // Only use separated past if we got separate upcoming already
        if (upData && Array.isArray(upData)) {
          setPast(pastOnly);
        } else {
          setPast(all);
        }
      } else {
        setPast([]);
      }
    } catch {
      setUpcoming([]);
      setPast([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ---- Cancel booking ----
  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch(`/api/bookings/${cancelTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al cancelar" }));
        throw new Error(err.error || "Error al cancelar");
      }
      setCancelTarget(null);
      fetchBookings();
    } catch (e: unknown) {
      setCancelError(e instanceof Error ? e.message : "Error al cancelar. Intenta de nuevo.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mis Reservas</h1>
        <p className="text-sm text-neutral-500">Gestiona tus reservas de clases</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          <span className="ml-2 text-sm text-neutral-500">Cargando reservas...</span>
        </div>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Próximas ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Historial ({past.length})</TabsTrigger>
          </TabsList>

          {/* Upcoming bookings */}
          <TabsContent value="upcoming" className="space-y-3 mt-4">
            {upcoming.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
                <p className="text-neutral-500">No tienes reservas próximas.</p>
                <p className="text-sm text-neutral-400 mt-1">Explora el horario para reservar tu próxima clase.</p>
              </div>
            ) : (
              upcoming.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-1 rounded-full" style={{ backgroundColor: booking.color }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{booking.className}</h3>
                          <Badge variant={statusVariant[booking.status] ?? "secondary"}>
                            {statusLabels[booking.status] ?? booking.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatBookingDate(booking.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime12h(booking.time)}
                          </span>
                          {booking.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {booking.location}
                            </span>
                          )}
                        </div>
                        {booking.coach && (
                          <p className="text-sm text-neutral-500 mt-1">Coach: {booking.coach}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-accent-rose border-accent-rose/30 hover:bg-accent-rose-light shrink-0"
                        onClick={() => {
                          setCancelTarget(booking);
                          setCancelError("");
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Past bookings */}
          <TabsContent value="past" className="space-y-3 mt-4">
            {past.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
                <p className="text-neutral-500">No hay historial de reservas.</p>
              </div>
            ) : (
              past.map((booking) => (
                <Card key={booking.id} className="opacity-75">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-1 rounded-full" style={{ backgroundColor: booking.color }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{booking.className}</h3>
                          <Badge variant={statusVariant[booking.status] ?? "secondary"}>
                            {statusLabels[booking.status] ?? booking.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatBookingDate(booking.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime12h(booking.time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Cancel confirmation dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        {cancelTarget && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cancelar Reserva</DialogTitle>
              <DialogDescription>
                ¿Estás seguro que deseas cancelar tu reserva?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Clase:</span> {cancelTarget.className}</p>
              <p><span className="font-medium">Fecha:</span> {formatBookingDate(cancelTarget.date)}</p>
              <p><span className="font-medium">Horario:</span> {formatTime12h(cancelTarget.time)}</p>
            </div>
            {cancelError && (
              <div className="flex items-center gap-2 bg-red-50 text-red-800 text-sm p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelTarget(null)}>
                Volver
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar Cancelación
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
