"use client";

import { useState, useRef } from "react";
import {
  ChevronLeft, ChevronRight, ChevronDown, Clock, Users,
  Loader2, CheckCircle2, AlertCircle, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CATEGORY_DESCRIPTIONS } from "@/lib/booking/constants";
import {
  formatFullDate, formatTime12h, durationMinutes,
  generateTakenSpots, getCoachInitials,
} from "@/lib/booking/helpers";
import type { ScheduleItem } from "@/lib/booking/types";

interface ClassDetailOverlayProps {
  classItem: ScheduleItem;
  studioColor: string;
  studioGradient: string;
  dateIso: string;
  hasActivePackage: boolean;
  onClose: () => void;
  onGoToPackages: () => void;
  onBookingComplete: () => void;
}

export function ClassDetailOverlay({
  classItem: cls,
  studioColor,
  studioGradient,
  dateIso,
  hasActivePackage,
  onClose,
  onGoToPackages,
  onBookingComplete,
}: ClassDetailOverlayProps) {
  const spotSelectorRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bookingMessage, setBookingMessage] = useState("");

  const full = cls.enrolled >= cls.capacity;
  const takenSpots = generateTakenSpots(cls.id, cls.enrolled, cls.capacity);
  const description = CATEGORY_DESCRIPTIONS[cls.category] ?? "";

  const handleBook = async () => {
    setBookingStatus("loading");
    setBookingMessage("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classScheduleId: cls.id,
          date: dateIso,
          ...(selectedSpot && { spotNumber: selectedSpot }),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al reservar" }));
        throw new Error(err.error || "Error al reservar");
      }
      setBookingStatus("success");
      setBookingMessage("Reserva confirmada exitosamente.");
      onBookingComplete();
    } catch (e: unknown) {
      setBookingStatus("error");
      setBookingMessage(e instanceof Error ? e.message : "Error al reservar. Intenta de nuevo.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div ref={scrollRef} className="h-full overflow-y-auto">
        <div className="pb-40">
          <div className={cn("relative h-52 bg-gradient-to-br", studioGradient)}>
            <button
              onClick={onClose}
              className="absolute top-4 left-4 z-10 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors hover:bg-white/30"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white/20 text-4xl font-bold tracking-widest uppercase select-none">
                {cls.category}
              </span>
            </div>
          </div>

          <div className="px-5 pt-5 space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 leading-tight">{cls.name}</h1>
            </div>

            {description && (
              <div>
                <p className={cn("text-sm text-neutral-600 leading-relaxed", !showFullDescription && "line-clamp-2")}>
                  {description}
                </p>
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-sm font-semibold text-neutral-900 mt-1"
                >
                  {showFullDescription ? "Ver menos" : "Ver más"}
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 text-neutral-700">
              <CalendarDays className="h-5 w-5 shrink-0" />
              <span className="text-sm">{formatFullDate(dateIso)}</span>
            </div>

            <div className="flex items-center gap-3 text-neutral-700">
              <Clock className="h-5 w-5 shrink-0" />
              <span className="text-sm">
                {formatTime12h(cls.time)} &middot; {durationMinutes(cls.time, cls.endTime)} min
              </span>
            </div>

            {cls.coach && (
              <div className="flex items-center gap-3 py-4 border-t border-b border-neutral-100">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: studioColor }}
                >
                  {getCoachInitials(cls.coach)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900">{cls.coach}</p>
                  <p className="text-sm text-neutral-500">Instructor</p>
                </div>
                <ChevronRight className="h-5 w-5 text-neutral-400 shrink-0" />
              </div>
            )}

            {hasActivePackage ? (
              <>
                <div ref={spotSelectorRef}>
                  <h2 className="text-lg font-semibold text-neutral-900">Selecciona tu lugar</h2>
                  {full ? (
                    <div className="mt-4 bg-amber-50 text-amber-800 text-sm p-4 rounded-xl">
                      Esta clase está llena. Puedes unirte a la lista de espera y te notificaremos si se libera un lugar.
                    </div>
                  ) : (
                    <div className="mt-4 bg-neutral-50 rounded-2xl p-5">
                      <div className="flex justify-center mb-4">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: studioColor }}
                        >
                          {getCoachInitials(cls.coach)}
                        </div>
                      </div>
                      <div className="grid grid-cols-8 gap-2 justify-items-center">
                        {Array.from({ length: cls.capacity }, (_, i) => {
                          const spotNum = i + 1;
                          const isTaken = takenSpots.has(spotNum);
                          const isSelected = selectedSpot === spotNum;
                          return (
                            <button
                              key={spotNum}
                              disabled={isTaken}
                              onClick={() => setSelectedSpot(isSelected ? null : spotNum)}
                              className={cn(
                                "h-9 w-9 rounded-full text-sm font-medium transition-all flex items-center justify-center",
                                isTaken && "bg-neutral-100 text-neutral-300 cursor-not-allowed",
                                !isTaken && !isSelected && "bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-400 hover:shadow-sm",
                                isSelected && "bg-neutral-900 text-white shadow-md"
                              )}
                            >
                              {spotNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {bookingStatus === "error" && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-800 text-sm p-4 rounded-xl">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{bookingMessage}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4 bg-amber-50 text-amber-800 text-sm p-5 rounded-xl space-y-3">
                <p className="font-medium">Necesitas un paquete activo para reservar en este estudio.</p>
                <Button
                  onClick={onGoToPackages}
                  className="w-full h-10 rounded-xl bg-amber-700 hover:bg-amber-800 text-white"
                >
                  Ver paquetes disponibles
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-neutral-200 px-5 pt-3 pb-6">
        {!hasActivePackage ? (
          <Button
            onClick={onGoToPackages}
            className="w-full h-12 text-base rounded-xl bg-amber-700 hover:bg-amber-800"
          >
            Ver paquetes disponibles
          </Button>
        ) : bookingStatus === "success" ? (
          <>
            <div className="flex items-center gap-2 mb-3 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">{bookingMessage}</span>
            </div>
            <Button
              onClick={onClose}
              className="w-full h-12 text-base rounded-xl bg-neutral-900 hover:bg-neutral-800"
            >
              Volver a clases
            </Button>
          </>
        ) : (
          <>
            {selectedSpot && !full && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-bold">
                    {selectedSpot}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-neutral-900">Lugar {selectedSpot}</p>
                    <p className="text-xs text-neutral-500">{cls.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => spotSelectorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"
                >
                  Cambiar
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )}
            <Button
              onClick={handleBook}
              disabled={bookingStatus === "loading" || (!full && !selectedSpot)}
              className="w-full h-12 text-base rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40"
            >
              {bookingStatus === "loading" && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
              {full ? "Unirme a Lista de Espera" : "Reservar lugar"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
