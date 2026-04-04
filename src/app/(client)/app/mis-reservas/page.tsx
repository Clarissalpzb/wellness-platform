"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, MapPin, X, Loader2, AlertCircle, CalendarPlus, Repeat, Star } from "lucide-react";
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
  classScheduleId?: string;
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
  const [recurringIds, setRecurringIds] = useState<Set<string>>(new Set());
  const [togglingRecurring, setTogglingRecurring] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  // ---- Fetch recurring subscriptions ----
  useEffect(() => {
    fetch("/api/recurring-bookings")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRecurringIds(new Set(data.map((r: any) => r.classScheduleId)));
        }
      })
      .catch(() => {});
  }, []);

  async function toggleRecurring(booking: Booking) {
    if (!booking.classScheduleId) return;
    setTogglingRecurring(booking.classScheduleId);
    try {
      if (recurringIds.has(booking.classScheduleId)) {
        // Find the recurring booking id to delete — re-fetch list
        const res = await fetch("/api/recurring-bookings");
        const list = await res.json();
        const found = list.find((r: any) => r.classScheduleId === booking.classScheduleId);
        if (found) {
          await fetch(`/api/recurring-bookings/${found.id}`, { method: "DELETE" });
          setRecurringIds((prev) => { const s = new Set(prev); s.delete(booking.classScheduleId!); return s; });
        }
      } else {
        await fetch("/api/recurring-bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classScheduleId: booking.classScheduleId }),
        });
        setRecurringIds((prev) => new Set(prev).add(booking.classScheduleId!));
      }
    } finally {
      setTogglingRecurring(null);
    }
  }

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Mis Reservas</h1>
          <p className="text-sm text-neutral-500">Gestiona tus reservas de clases</p>
        </div>
        <a href="/api/bookings/ical" download="mis-clases.ics">
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <CalendarPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar a Calendario</span>
          </Button>
        </a>
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
                      <div className="flex gap-2 shrink-0">
                        {booking.classScheduleId && (
                          <Button
                            variant="outline"
                            size="sm"
                            title={recurringIds.has(booking.classScheduleId) ? "Cancelar recurrencia" : "Reservar cada semana"}
                            className={recurringIds.has(booking.classScheduleId) ? "text-green-700 border-green-300 bg-green-50" : ""}
                            onClick={() => toggleRecurring(booking)}
                            disabled={togglingRecurring === booking.classScheduleId}
                          >
                            {togglingRecurring === booking.classScheduleId
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Repeat className="h-3 w-3" />
                            }
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-accent-rose border-accent-rose/30 hover:bg-accent-rose-light"
                          onClick={() => {
                            setCancelTarget(booking);
                            setCancelError("");
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
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
                <Card key={booking.id} className="opacity-80">
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
                      {(booking.status === "COMPLETED" || booking.status === "CHECKED_IN") && !reviewedIds.has(booking.id) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                          onClick={() => { setReviewTarget(booking); setReviewRating(0); setReviewComment(""); }}
                        >
                          <Star className="h-3 w-3" />
                          Calificar
                        </Button>
                      )}
                      {reviewedIds.has(booking.id) && (
                        <span className="text-xs text-neutral-400 shrink-0">Reseña enviada ✓</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Review dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={() => setReviewTarget(null)}>
        {reviewTarget && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Calificar clase</DialogTitle>
              <DialogDescription>{reviewTarget.className}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-600 mb-2">¿Cómo fue tu experiencia?</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`text-2xl transition-transform hover:scale-110 ${star <= reviewRating ? "text-yellow-400" : "text-neutral-300"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Comentario opcional..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewTarget(null)}>Cancelar</Button>
              <Button
                disabled={reviewRating === 0 || reviewSubmitting}
                onClick={async () => {
                  setReviewSubmitting(true);
                  try {
                    const res = await fetch("/api/reviews", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ bookingId: reviewTarget.id, rating: reviewRating, comment: reviewComment }),
                    });
                    if (res.ok) {
                      setReviewedIds((s) => new Set(s).add(reviewTarget.id));
                      setReviewTarget(null);
                    }
                  } finally {
                    setReviewSubmitting(false);
                  }
                }}
              >
                {reviewSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enviar reseña
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

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
