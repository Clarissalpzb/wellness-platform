import { Clock, Users, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { MetricCard } from "@/components/charts/metric-card";
import { OccupancyHeatmap } from "@/components/charts/occupancy-heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const todayClasses: any[] = [];

const statusLabels: Record<string, string> = { completed: "Completada", in_progress: "En curso", upcoming: "Próxima" };
const statusVariant: Record<string, "secondary" | "success" | "info"> = { completed: "secondary", in_progress: "success", upcoming: "info" };

export default function OperacionesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Operaciones</h1>
        <p className="text-sm text-neutral-500">Vista operativa del día</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Clases Hoy" value="0" icon={Clock} iconColor="text-accent-blue" iconBg="bg-accent-blue-light" />
        <MetricCard title="Check-ins" value="0" icon={CheckCircle2} />
        <MetricCard title="No-shows" value="0" icon={XCircle} iconColor="text-accent-rose" iconBg="bg-accent-rose-light" />
        <MetricCard title="En Lista Espera" value="0" icon={Users} iconColor="text-accent-amber" iconBg="bg-accent-amber-light" />
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Horario de Hoy</CardTitle>
        </CardHeader>
        <CardContent>
          {todayClasses.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No hay datos disponibles</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayClasses.map((cls, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <span className="text-sm font-mono text-neutral-500 w-12">{cls.time}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{cls.name}</p>
                    <p className="text-xs text-neutral-500">{cls.coach}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`text-sm font-medium ${cls.enrolled >= cls.capacity ? "text-accent-rose" : ""}`}>
                        {cls.enrolled}/{cls.capacity}
                      </span>
                      {cls.enrolled >= cls.capacity && (
                        <p className="text-xs text-accent-amber">Lista de espera</p>
                      )}
                    </div>
                    <Badge variant={statusVariant[cls.status]}>{statusLabels[cls.status]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Occupancy Heatmap */}
      <OccupancyHeatmap />
    </div>
  );
}
