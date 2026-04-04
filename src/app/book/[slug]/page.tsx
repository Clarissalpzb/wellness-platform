"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Tag,
  Zap,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";

interface ClassSlot {
  id: string;
  time: string;
  endTime: string;
  name: string;
  description: string | null;
  color: string;
  duration: number;
  capacity: number;
  category: string | null;
  level: string | null;
  location: string;
  address: string;
  space: string;
  coach: string;
  enrolled: number;
  available: number;
  hasDiscount: boolean;
  discountPercent: number;
}

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

export default function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [schedules, setSchedules] = useState<ClassSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const dateStr = selectedDate.toISOString().split("T")[0];
    fetch(`/api/public/schedule?slug=${slug}&date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setOrg(data.org);
          setSchedules(data.schedules);
        }
      })
      .catch(() => setError("No se pudo cargar el horario"))
      .finally(() => setLoading(false));
  }, [slug, selectedDate]);

  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <p className="text-neutral-500 text-lg">{error}</p>
          <Link href="/" className="mt-4 text-green-600 underline text-sm">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          {org?.logo && (
            <img src={org.logo} alt={org.name} className="h-8 w-8 rounded-full object-cover" />
          )}
          <div>
            <h1 className="font-bold text-neutral-900 text-lg leading-tight">
              {org?.name ?? "Cargando..."}
            </h1>
            <p className="text-xs text-neutral-500">Reserva tu clase</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Link href={`/login`}>
              <Button variant="outline" size="sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link href={`/registro`}>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                Registrarse
              </Button>
            </Link>
          </div>
        </div>

        {/* Date selector */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {dates.map((d) => {
              const isSelected = d.toDateString() === selectedDate.toDateString();
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(d)}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-green-600 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  <span className="capitalize">{format(d, "EEE", { locale: es })}</span>
                  <span className="text-base font-bold">{format(d, "d")}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl animate-pulse border border-neutral-100" />
          ))
        ) : schedules.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">
            <Calendar className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>No hay clases programadas para este día</p>
          </div>
        ) : (
          schedules.map((slot) => (
            <Card key={slot.id} className="overflow-hidden border border-neutral-200 hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex">
                  {/* Color bar */}
                  <div className="w-1.5 flex-shrink-0 rounded-l-xl" style={{ backgroundColor: slot.color }} />

                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-neutral-900 text-sm">{slot.name}</h3>
                          {slot.level && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {LEVEL_LABELS[slot.level] ?? slot.level}
                            </Badge>
                          )}
                          {slot.hasDiscount && (
                            <Badge className="text-xs px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-200 gap-1">
                              <Zap className="h-3 w-3" />
                              {slot.discountPercent}% OFF
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {slot.time} – {slot.endTime} ({slot.duration} min)
                          </span>
                          {slot.coach && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {slot.coach}
                            </span>
                          )}
                          {slot.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {slot.location}
                              {slot.space ? ` · ${slot.space}` : ""}
                            </span>
                          )}
                        </div>

                        {slot.hasDiscount && (
                          <p className="mt-1.5 text-xs text-orange-600 font-medium">
                            Clase con cupo disponible — precio reducido para nuevos miembros
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`text-xs font-medium ${slot.available === 0 ? "text-red-500" : "text-neutral-500"}`}>
                          {slot.available === 0 ? "Lleno" : `${slot.available} lugares`}
                        </span>
                        <Link href={`/registro?redirect=/app/reservar`}>
                          <Button
                            size="sm"
                            disabled={slot.available === 0}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                          >
                            Reservar
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Footer CTA */}
      <div className="max-w-3xl mx-auto px-4 py-8 text-center border-t border-neutral-200 mt-4">
        <p className="text-sm text-neutral-500 mb-3">
          ¿Ya tienes una cuenta?
        </p>
        <Link href="/login">
          <Button variant="outline" className="mr-2">
            Iniciar sesión
          </Button>
        </Link>
        <Link href="/registro">
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            Crear cuenta gratis
          </Button>
        </Link>
      </div>
    </div>
  );
}
