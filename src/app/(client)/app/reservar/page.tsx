"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, User, Users } from "lucide-react";
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

const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const dates = [
  { day: "Lun", date: 26, month: "Ene" },
  { day: "Mar", date: 27, month: "Ene" },
  { day: "Mié", date: 28, month: "Ene" },
  { day: "Jue", date: 29, month: "Ene" },
  { day: "Vie", date: 30, month: "Ene" },
  { day: "Sáb", date: 31, month: "Ene" },
  { day: "Dom", date: 1, month: "Feb" },
];

const mockSchedule = [
  { id: "1", time: "07:00", endTime: "08:00", name: "Yoga Flow", coach: "María García", enrolled: 16, capacity: 20, color: "#22c55e", level: "Todos" },
  { id: "2", time: "08:00", endTime: "08:45", name: "HIIT Cardio", coach: "Carlos López", enrolled: 15, capacity: 15, color: "#3b82f6", level: "Intermedio" },
  { id: "3", time: "09:00", endTime: "09:50", name: "Pilates Mat", coach: "María García", enrolled: 10, capacity: 12, color: "#f59e0b", level: "Principiante" },
  { id: "4", time: "10:00", endTime: "10:30", name: "Meditación", coach: "Laura Rdz", enrolled: 8, capacity: 25, color: "#8b5cf6", level: "Todos" },
  { id: "5", time: "17:00", endTime: "18:00", name: "Yoga Flow", coach: "María García", enrolled: 20, capacity: 20, color: "#22c55e", level: "Todos" },
  { id: "6", time: "18:00", endTime: "18:45", name: "HIIT Cardio", coach: "Carlos López", enrolled: 14, capacity: 15, color: "#3b82f6", level: "Intermedio" },
  { id: "7", time: "19:00", endTime: "20:00", name: "CrossFit", coach: "Carlos López", enrolled: 9, capacity: 10, color: "#f43f5e", level: "Avanzado" },
];

export default function ReservarPage() {
  const [selectedDay, setSelectedDay] = useState(2); // Wednesday
  const [showBooking, setShowBooking] = useState<string | null>(null);

  const selectedClass = mockSchedule.find((c) => c.id === showBooking);
  const isFull = selectedClass ? selectedClass.enrolled >= selectedClass.capacity : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Reservar Clase</h1>
        <p className="text-sm text-neutral-500">Selecciona una clase para reservar</p>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-2 overflow-x-auto flex-1">
          {dates.map((d, i) => (
            <button
              key={i}
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
        <Button variant="ghost" size="icon" className="shrink-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Class list */}
      <div className="space-y-3">
        {mockSchedule.map((cls) => {
          const full = cls.enrolled >= cls.capacity;
          const spotsLeft = cls.capacity - cls.enrolled;

          return (
            <Card
              key={cls.id}
              className={cn("cursor-pointer transition-shadow hover:shadow-md", full && "opacity-75")}
              onClick={() => setShowBooking(cls.id)}
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
                    <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {cls.coach}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {parseInt(cls.endTime) - parseInt(cls.time) > 0 ? `${parseInt(cls.endTime) - parseInt(cls.time)}` : "60"} min
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

      {/* Booking Dialog */}
      <Dialog open={!!showBooking} onOpenChange={() => setShowBooking(null)}>
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
                <Users className="h-4 w-4 text-neutral-400" />
                <span>
                  {selectedClass.enrolled}/{selectedClass.capacity} reservados
                  {isFull && " (llena)"}
                </span>
              </div>
              {isFull && (
                <div className="bg-accent-amber-light text-amber-800 text-sm p-3 rounded-lg">
                  Esta clase está llena. Puedes unirte a la lista de espera y te notificaremos si se libera un lugar.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBooking(null)}>Cancelar</Button>
              <Button>
                {isFull ? "Unirme a Lista de Espera" : "Reservar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
