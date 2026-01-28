"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const hours = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

// Mock occupancy data (0-100)
const occupancy: Record<string, Record<string, number>> = {
  Lun: { "07:00": 80, "08:00": 95, "09:00": 70, "10:00": 45, "11:00": 30, "12:00": 20, "13:00": 15, "14:00": 25, "15:00": 35, "16:00": 50, "17:00": 75, "18:00": 90, "19:00": 85, "20:00": 60 },
  Mar: { "07:00": 70, "08:00": 85, "09:00": 60, "10:00": 40, "11:00": 25, "12:00": 15, "13:00": 10, "14:00": 20, "15:00": 30, "16:00": 55, "17:00": 80, "18:00": 95, "19:00": 90, "20:00": 65 },
  Mié: { "07:00": 75, "08:00": 90, "09:00": 65, "10:00": 35, "11:00": 20, "12:00": 15, "13:00": 10, "14:00": 20, "15:00": 40, "16:00": 60, "17:00": 85, "18:00": 95, "19:00": 80, "20:00": 55 },
  Jue: { "07:00": 65, "08:00": 80, "09:00": 55, "10:00": 30, "11:00": 20, "12:00": 15, "13:00": 10, "14:00": 25, "15:00": 35, "16:00": 50, "17:00": 70, "18:00": 85, "19:00": 75, "20:00": 50 },
  Vie: { "07:00": 85, "08:00": 95, "09:00": 75, "10:00": 50, "11:00": 35, "12:00": 20, "13:00": 15, "14:00": 20, "15:00": 30, "16:00": 45, "17:00": 65, "18:00": 80, "19:00": 70, "20:00": 40 },
  Sáb: { "07:00": 40, "08:00": 65, "09:00": 90, "10:00": 95, "11:00": 85, "12:00": 60, "13:00": 30, "14:00": 15, "15:00": 10, "16:00": 15, "17:00": 25, "18:00": 20, "19:00": 15, "20:00": 10 },
  Dom: { "07:00": 20, "08:00": 40, "09:00": 70, "10:00": 85, "11:00": 75, "12:00": 45, "13:00": 20, "14:00": 10, "15:00": 5, "16:00": 10, "17:00": 15, "18:00": 10, "19:00": 5, "20:00": 5 },
};

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
