"use client";

import { Calendar, Clock, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const upcomingBookings = [
  { id: "1", className: "Yoga Flow", coach: "María García", date: "Mié 28 Ene", time: "07:00 - 08:00", location: "Sala Principal", color: "#22c55e", status: "confirmed" },
  { id: "2", className: "HIIT Cardio", coach: "Carlos López", date: "Jue 29 Ene", time: "18:00 - 18:45", location: "Sala Principal", color: "#3b82f6", status: "confirmed" },
  { id: "3", className: "Pilates Mat", coach: "María García", date: "Vie 30 Ene", time: "09:00 - 09:50", location: "Sala Yoga", color: "#f59e0b", status: "waitlist" },
];

const pastBookings = [
  { id: "4", className: "Yoga Flow", coach: "María García", date: "Lun 26 Ene", time: "07:00 - 08:00", location: "Sala Principal", color: "#22c55e", status: "completed" },
  { id: "5", className: "CrossFit", coach: "Carlos López", date: "Dom 25 Ene", time: "10:00 - 11:00", location: "Sala Principal", color: "#f43f5e", status: "completed" },
  { id: "6", className: "Meditación", coach: "Laura Rdz", date: "Sáb 24 Ene", time: "09:00 - 09:30", location: "Sala Yoga", color: "#8b5cf6", status: "no_show" },
];

const statusLabels: Record<string, string> = {
  confirmed: "Confirmada",
  waitlist: "En espera",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

const statusVariant: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
  confirmed: "success",
  waitlist: "warning",
  completed: "secondary",
  cancelled: "destructive",
  no_show: "destructive",
};

export default function MisReservasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mis Reservas</h1>
        <p className="text-sm text-neutral-500">Gestiona tus reservas de clases</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Próximas ({upcomingBookings.length})</TabsTrigger>
          <TabsTrigger value="past">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-3 mt-4">
          {upcomingBookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-1 rounded-full" style={{ backgroundColor: booking.color }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{booking.className}</h3>
                      <Badge variant={statusVariant[booking.status]}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {booking.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {booking.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {booking.location}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-500 mt-1">Coach: {booking.coach}</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-accent-rose border-accent-rose/30 hover:bg-accent-rose-light">
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="past" className="space-y-3 mt-4">
          {pastBookings.map((booking) => (
            <Card key={booking.id} className="opacity-75">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-1 rounded-full" style={{ backgroundColor: booking.color }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{booking.className}</h3>
                      <Badge variant={statusVariant[booking.status]}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {booking.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {booking.time}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
