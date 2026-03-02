import { Calendar, Clock, Users, DollarSign, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MetricCard } from "@/components/charts/metric-card";

const todayClasses: any[] = [];

const weekSchedule: any[] = [];

export default function CoachPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mi Panel - Coach</h1>
        <p className="text-sm text-neutral-500">Tu resumen del día</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Clases Hoy" value="0" icon={Calendar} iconColor="text-accent-blue" iconBg="bg-accent-blue-light" />
        <MetricCard title="Alumnos Hoy" value="0" icon={Users} />
        <MetricCard title="Clases Este Mes" value="0" icon={CheckCircle2} iconColor="text-primary-600" iconBg="bg-primary-100" />
        <MetricCard title="Ganancia Mes" value="$0" icon={DollarSign} iconColor="text-accent-amber" iconBg="bg-accent-amber-light" />
      </div>

      {/* Today's classes */}
      <Card>
        <CardHeader>
          <CardTitle>Clases de Hoy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayClasses.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No hay datos disponibles</p>
            </div>
          ) : (
            todayClasses.map((cls, i) => (
              <div key={i} className="p-4 border border-neutral-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-sm font-bold">{cls.time}</p>
                      <p className="text-xs text-neutral-400">{cls.endTime}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold">{cls.name}</h3>
                      <p className="text-sm text-neutral-500">{cls.enrolled}/{cls.capacity} inscritos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cls.status === "completed" ? "secondary" : "success"}>
                      {cls.status === "completed" ? "Completada" : "Próxima"}
                    </Badge>
                    {cls.status === "upcoming" && (
                      <Button size="sm">Check-in</Button>
                    )}
                  </div>
                </div>

                {cls.attendees.length > 0 && (
                  <div className="border-t border-neutral-100 pt-3">
                    <p className="text-xs font-medium text-neutral-500 mb-2">Alumnos destacados:</p>
                    <div className="flex flex-wrap gap-2">
                      {cls.attendees.map((a: any) => (
                        <div key={a.name} className="flex items-center gap-2 bg-neutral-50 rounded-lg px-2 py-1">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">{a.name.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{a.name}</span>
                          {a.healthFlags.map((flag: string) => (
                            <Badge key={flag} variant="warning" className="text-xs">{flag}</Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Week view */}
      <Card>
        <CardHeader>
          <CardTitle>Mi Semana</CardTitle>
        </CardHeader>
        <CardContent>
          {weekSchedule.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No hay datos disponibles</p>
            </div>
          ) : (
            <div className="flex gap-3">
              {weekSchedule.map((day) => (
                <div key={day.day} className="flex-1 text-center">
                  <p className="text-xs text-neutral-500 mb-2">{day.day}</p>
                  <div className={`py-3 rounded-lg ${day.classes > 0 ? "bg-primary-100 text-primary-700" : "bg-neutral-50 text-neutral-400"}`}>
                    <p className="text-lg font-bold">{day.classes}</p>
                    <p className="text-xs">clases</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
