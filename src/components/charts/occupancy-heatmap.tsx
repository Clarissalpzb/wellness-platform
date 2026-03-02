"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const hours = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

const occupancy: Record<string, Record<string, number>> = {};

function getColor(value: number): string {
  if (value >= 90) return "bg-primary-600";
  if (value >= 70) return "bg-primary-400";
  if (value >= 50) return "bg-primary-300";
  if (value >= 30) return "bg-primary-200";
  if (value >= 15) return "bg-primary-100";
  return "bg-neutral-100";
}

export function OccupancyHeatmap() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa de Ocupación</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[60px_repeat(14,1fr)] gap-1">
              <div />
              {hours.map((h) => (
                <div key={h} className="text-xs text-neutral-500 text-center">{h}</div>
              ))}
              {days.map((day) => (
                <>
                  <div key={day} className="text-xs text-neutral-600 font-medium flex items-center">{day}</div>
                  {hours.map((hour) => (
                    <div
                      key={`${day}-${hour}`}
                      className={cn("h-8 rounded-sm", getColor(occupancy[day]?.[hour] || 0))}
                      title={`${day} ${hour}: ${occupancy[day]?.[hour] || 0}%`}
                    />
                  ))}
                </>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 justify-end">
              <span className="text-xs text-neutral-500">Baja</span>
              <div className="flex gap-1">
                {["bg-neutral-100", "bg-primary-100", "bg-primary-200", "bg-primary-300", "bg-primary-400", "bg-primary-600"].map((c) => (
                  <div key={c} className={cn("h-4 w-4 rounded-sm", c)} />
                ))}
              </div>
              <span className="text-xs text-neutral-500">Alta</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
