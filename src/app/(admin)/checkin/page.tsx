"use client";

import { useState, useEffect } from "react";
import { CalendarDays, MapPin, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTime } from "@/lib/utils";

interface BookingItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  status: "CONFIRMED" | "CHECKED_IN" | "CANCELLED";
  checkedInAt: string | null;
}

interface ScheduleItem {
  id: string;
  className: string;
  classColor: string;
  time: string;
  endTime: string;
  coach: string | null;
  location: string;
  space: string | null;
  capacity: number;
  bookings: BookingItem[];
}

function todayString() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export default function CheckinPage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayString);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const fetchSchedules = async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/schedule-checkin?date=${d}`);
      if (res.ok) {
        const json = await res.json();
        setSchedules(json.schedules);
      } else {
        setSchedules([]);
      }
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules(date);
  }, [date]);

  const handleCheckin = async (bookingId: string) => {
    setCheckingIn(bookingId);

    // Optimistic update
    setSchedules((prev) =>
      prev.map((s) => ({
        ...s,
        bookings: s.bookings.map((b) =>
          b.id === bookingId
            ? { ...b, status: "CHECKED_IN" as const, checkedInAt: new Date().toISOString() }
            : b
        ),
      }))
    );

    try {
      const res = await fetch("/api/bookings/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      if (!res.ok) {
        // Revert on failure
        fetchSchedules(date);
      }
    } catch {
      fetchSchedules(date);
    } finally {
      setCheckingIn(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Check-in</h1>
          <p className="text-sm text-neutral-500">Registra la asistencia de clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-neutral-400" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {schedules.length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <CalendarDays className="mx-auto h-10 w-10 mb-3 text-neutral-300" />
          <p>No hay clases programadas para este día</p>
        </div>
      )}

      <div className="space-y-4">
        {schedules.map((schedule) => {
          const checkedIn = schedule.bookings.filter((b) => b.status === "CHECKED_IN").length;
          const total = schedule.bookings.filter((b) => b.status !== "CANCELLED").length;

          return (
            <div
              key={schedule.id}
              className="border border-neutral-200 rounded-xl bg-white overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: schedule.classColor }}
                  />
                  <h2 className="font-semibold text-neutral-900">{schedule.className}</h2>
                  <span className="text-sm text-neutral-500 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(schedule.time)} – {formatTime(schedule.endTime)}
                  </span>
                  {schedule.coach && (
                    <span className="text-sm text-neutral-500 flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {schedule.coach}
                    </span>
                  )}
                  <span className="text-sm text-neutral-500 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {schedule.location}
                    {schedule.space && ` · ${schedule.space}`}
                  </span>
                </div>
                <Badge variant={checkedIn === total && total > 0 ? "success" : "outline"}>
                  {checkedIn}/{total} registrados
                </Badge>
              </div>

              {schedule.bookings.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-neutral-400">
                  Sin reservas
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-40 text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={booking.userAvatar || ""} />
                              <AvatarFallback className="text-xs">
                                {booking.userName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{booking.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {booking.status === "CONFIRMED" && (
                            <Badge variant="outline">Pendiente</Badge>
                          )}
                          {booking.status === "CHECKED_IN" && (
                            <Badge variant="success">
                              Registrado
                              {booking.checkedInAt && (
                                <span className="ml-1 font-normal opacity-75">
                                  {new Date(booking.checkedInAt).toLocaleTimeString("es-MX", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </Badge>
                          )}
                          {booking.status === "CANCELLED" && (
                            <Badge variant="secondary">Cancelado</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {booking.status === "CONFIRMED" && (
                            <Button
                              size="sm"
                              onClick={() => handleCheckin(booking.id)}
                              disabled={checkingIn === booking.id}
                            >
                              Registrar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
