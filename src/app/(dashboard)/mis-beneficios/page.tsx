"use client";

import { useState, useEffect } from "react";
import {
  Dumbbell, Calendar, Clock, MapPin, Loader2, ChevronLeft,
  ChevronRight, CheckCircle2, ShoppingBag, Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BenefitsData {
  freeClasses: { used: number; total: number; remaining: number };
  upcomingBookings: {
    id: string; date: string; status: string; source: string;
    className: string; classColor: string; duration: number;
    time: string; location: string;
  }[];
  referrals: { total: number; rewarded: number; pending: number };
  hourlyRate: number | null;
}

interface ScheduleSlot {
  id: string;
  className: string;
  classColor: string;
  startTime: string;
  endTime: string;
  location: string;
  coachName: string;
  enrolled: number;
  maxCapacity: number;
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function buildWeek(offset: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      day: DAY_NAMES[d.getDay()],
      num: d.getDate(),
      isToday: d.toISOString().slice(0, 10) === today.toISOString().slice(0, 10),
    };
  });
}

export default function MisBeneficiosPage() {
  const [benefits, setBenefits] = useState<BenefitsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0, 10));
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const week = buildWeek(weekOffset);

  useEffect(() => {
    fetch("/api/staff/benefits")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setBenefits(d.data ?? d); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setScheduleLoading(true);
    setBookingError(null);
    fetch(`/api/schedule?date=${selectedDay}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        const raw = d?.data ?? d;
        setSchedule(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setSchedule([]))
      .finally(() => setScheduleLoading(false));
  }, [selectedDay]);

  const handleBook = async (slot: ScheduleSlot) => {
    setBookingId(slot.id);
    setBookingError(null);
    setBookingSuccess(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classScheduleId: slot.id, date: selectedDay }),
      });
      const data = await res.json().catch(() => ({}));
      const payload = data.data ?? data;
      if (res.ok) {
        setBookingSuccess(`¡Reservado! ${slot.className} el ${selectedDay}`);
        // Refresh benefits
        fetch("/api/staff/benefits")
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d) setBenefits(d.data ?? d); });
      } else {
        setBookingError(payload.error || "Error al reservar");
      }
    } catch {
      setBookingError("Error de conexión");
    } finally {
      setBookingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const fc = benefits?.freeClasses;
  const usedPct = fc ? (fc.used / fc.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mis Beneficios</h1>
        <p className="text-sm text-neutral-500">Tus clases gratuitas y reservas del mes</p>
      </div>

      {/* Free class quota */}
      <Card className="border-primary-200 bg-gradient-to-br from-primary-50 to-white">
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary-600" />
              <p className="font-semibold text-neutral-900">Clases gratuitas este mes</p>
            </div>
            <span className="text-2xl font-bold text-primary-700">
              {fc?.used ?? 0}
              <span className="text-base font-normal text-neutral-400">/{fc?.total ?? 4}</span>
            </span>
          </div>
          <div className="h-3 bg-white rounded-full border border-primary-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                usedPct >= 100 ? "bg-red-400" : usedPct >= 75 ? "bg-amber-400" : "bg-primary-500"
              )}
              style={{ width: `${Math.min(usedPct, 100)}%` }}
            />
          </div>
          <p className="text-sm text-neutral-500">
            {fc?.remaining === 0
              ? "Has usado todas tus clases gratuitas. Adquiere un paquete para seguir reservando."
              : `Te quedan ${fc?.remaining} clase${fc?.remaining !== 1 ? "s" : ""} gratuita${fc?.remaining !== 1 ? "s" : ""}.`}
          </p>
        </CardContent>
      </Card>

      {/* Buy package CTA when exhausted */}
      {fc?.remaining === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Clases gratuitas agotadas</p>
              <p className="text-xs text-amber-700">Adquiere un paquete para continuar reservando.</p>
            </div>
            <a href="/pos">
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100 shrink-0">
                <Package className="h-4 w-4 mr-1" /> Ver paquetes
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Upcoming booked classes */}
      {benefits?.upcomingBookings && benefits.upcomingBookings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Próximas reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {benefits.upcomingBookings.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
                  <div
                    className="h-10 w-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: b.classColor || "#6366f1" }}
                  >
                    {b.className.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{b.className}</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.time}</span>
                      {b.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.location}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-neutral-700">
                      {new Date(b.date).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                    {b.source === "staff_perk" && (
                      <Badge className="text-xs bg-primary-100 text-primary-700 border-0 mt-0.5">Beneficio</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule browser */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Reservar una clase</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((w) => w - 1)} disabled={weekOffset <= 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-neutral-500 px-1">
                {week[0].num} – {week[6].num} {MONTH_NAMES[new Date(week[0].iso).getMonth()]}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((w) => w + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Day selector */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {week.map((d) => (
              <button
                key={d.iso}
                onClick={() => setSelectedDay(d.iso)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg min-w-[44px] transition-colors text-xs",
                  selectedDay === d.iso
                    ? "bg-primary-500 text-white"
                    : d.isToday
                    ? "bg-primary-50 text-primary-700 font-medium"
                    : "hover:bg-neutral-100 text-neutral-600"
                )}
              >
                <span>{d.day}</span>
                <span className="font-semibold">{d.num}</span>
              </button>
            ))}
          </div>

          {bookingSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-800 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {bookingSuccess}
            </div>
          )}
          {bookingError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{bookingError}</div>
          )}

          {/* Classes for selected day */}
          {scheduleLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : schedule.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">No hay clases este día.</p>
          ) : (
            <div className="space-y-2">
              {schedule.map((slot) => {
                const isFull = slot.enrolled >= slot.maxCapacity;
                const isBooking = bookingId === slot.id;
                return (
                  <div key={slot.id} className="flex items-center gap-3 p-3 rounded-lg border border-neutral-100 hover:border-neutral-200 transition-colors">
                    <div
                      className="h-10 w-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: slot.classColor || "#6366f1" }}
                    >
                      {slot.className.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{slot.className}</p>
                      <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{slot.startTime}</span>
                        {slot.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{slot.location}</span>}
                        <span>{slot.enrolled}/{slot.maxCapacity}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isFull ? "outline" : "default"}
                      disabled={isBooking || (isFull && false)}
                      onClick={() => handleBook(slot)}
                      className="shrink-0"
                    >
                      {isBooking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isFull ? (
                        "Lista espera"
                      ) : (
                        "Reservar"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
