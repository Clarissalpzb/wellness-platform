"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Zap, Bell, RefreshCw, ShoppingCart, TrendingUp,
  Mail, Lightbulb, CheckCircle2, XCircle, Play,
  Loader2, Clock, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AutomationConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  canRunNow: boolean;
  schedule: string;
}

const AUTOMATIONS: AutomationConfig[] = [
  {
    key: "motivational_notifications",
    label: "Notificaciones FOMO",
    description: "Envía mensajes de motivación a clientes que llevan 7–21 días sin reservar. Nunca molesta a suscriptores de largo plazo.",
    icon: Bell,
    canRunNow: true,
    schedule: "Diario · 10:00 AM",
  },
  {
    key: "retention_workflow",
    label: "Flujo de Retención",
    description: "Detecta clientes en riesgo (sin paquete activo) y les envía emails personalizados de reactivación.",
    icon: RefreshCw,
    canRunNow: true,
    schedule: "Cada 3 días",
  },
  {
    key: "abandoned_cart",
    label: "Carrito Abandonado",
    description: "Detecta clientes que vieron paquetes pero no compraron. Les envía un 20% de descuento a las 24 horas.",
    icon: ShoppingCart,
    canRunNow: true,
    schedule: "Diario · 9:00 AM",
  },
  {
    key: "dynamic_pricing",
    label: "Precios Dinámicos",
    description: "Aplica 30% de descuento automático a clases con menos del 40% de ocupación dentro de 24 horas.",
    icon: TrendingUp,
    canRunNow: false,
    schedule: "En tiempo real",
  },
  {
    key: "weekly_digest",
    label: "Resumen Semanal por Email",
    description: "Envía a los dueños un resumen con las métricas clave de la semana cada lunes por la mañana.",
    icon: Mail,
    canRunNow: false,
    schedule: "Lunes · 8:00 AM",
  },
  {
    key: "insight_generation",
    label: "Generación de Insights",
    description: "Analiza tus datos y genera recomendaciones automáticas de negocio (ocupación, demanda, retención).",
    icon: Lightbulb,
    canRunNow: true,
    schedule: "Diario · 7:00 AM",
  },
];

interface LogEntry {
  id: string;
  action: string;
  entityId: string;
  changes: Record<string, unknown>;
  createdAt: string;
  user?: { firstName: string; lastName: string } | null;
}

const actionLabel: Record<string, { label: string; color: string }> = {
  automation_enabled: { label: "Activada", color: "text-primary-600" },
  automation_disabled: { label: "Desactivada", color: "text-accent-rose" },
  automation_triggered: { label: "Ejecutada manualmente", color: "text-accent-blue" },
};

const automationLabel: Record<string, string> = {
  motivational_notifications: "Notificaciones FOMO",
  retention_workflow: "Retención",
  abandoned_cart: "Carrito Abandonado",
  dynamic_pricing: "Precios Dinámicos",
  weekly_digest: "Resumen Semanal",
  insight_generation: "Insights IA",
};

export default function AutopilotPage() {
  const [automations, setAutomations] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{ key: string; success: boolean; detail: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/autopilot");
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations ?? {});
        setLogs(data.logs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggle(key: string, current: boolean) {
    setToggling(key);
    try {
      const res = await fetch("/api/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: !current }),
      });
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations);
        fetchData();
      }
    } finally {
      setToggling(null);
    }
  }

  async function runNow(key: string) {
    setRunning(key);
    setRunResult(null);
    try {
      const res = await fetch("/api/autopilot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      setRunResult({ key, ...data });
      setTimeout(() => setRunResult(null), 5000);
      fetchData();
    } finally {
      setRunning(null);
    }
  }

  const enabledCount = Object.values(automations).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-accent-amber" />
            Piloto Automático
          </h1>
          <p className="text-sm text-neutral-500">Automatizaciones activas que mantienen el estudio funcionando solo</p>
        </div>
        <Badge variant={enabledCount > 0 ? "success" : "secondary"} className="text-sm px-3 py-1">
          {loading ? "..." : `${enabledCount} automatizaciones activas`}
        </Badge>
      </div>

      {/* Run result toast */}
      {runResult && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${runResult.success ? "bg-primary-50 border-primary-200 text-primary-700" : "bg-accent-rose-light border-accent-rose text-accent-rose"}`}>
          {runResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          <span className="text-sm font-medium">
            {automationLabel[runResult.key] ?? runResult.key}: {runResult.detail}
          </span>
        </div>
      )}

      {/* Automation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AUTOMATIONS.map((auto) => {
          const Icon = auto.icon;
          const isOn = automations[auto.key] ?? true;
          const isToggling = toggling === auto.key;
          const isRunning = running === auto.key;

          return (
            <Card key={auto.key} className={`transition-opacity ${!isOn ? "opacity-60" : ""}`}>
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isOn ? "bg-primary-50 text-primary-600" : "bg-neutral-100 text-neutral-400"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{auto.label}</h3>
                      <button
                        onClick={() => toggle(auto.key, isOn)}
                        disabled={isToggling}
                        className={`shrink-0 transition-colors ${isOn ? "text-primary-500 hover:text-primary-700" : "text-neutral-300 hover:text-neutral-500"}`}
                        title={isOn ? "Desactivar" : "Activar"}
                      >
                        {isToggling
                          ? <Loader2 className="h-6 w-6 animate-spin" />
                          : isOn
                            ? <ToggleRight className="h-6 w-6" />
                            : <ToggleLeft className="h-6 w-6" />
                        }
                      </button>
                    </div>
                    <p className="text-xs text-neutral-500 mb-3">{auto.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs text-neutral-400">
                        <Clock className="h-3 w-3" />
                        {auto.schedule}
                      </span>
                      {auto.canRunNow && isOn && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runNow(auto.key)}
                          disabled={isRunning}
                          className="h-7 text-xs"
                        >
                          {isRunning
                            ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Ejecutando...</>
                            : <><Play className="mr-1 h-3 w-3" />Ejecutar ahora</>
                          }
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-neutral-400" />
            Historial de Actividad
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-10 text-neutral-400">
              <Zap className="h-8 w-8 mx-auto mb-2 text-neutral-200" />
              <p className="text-sm">Aún no hay actividad registrada.</p>
              <p className="text-xs mt-1">Ejecuta una automatización para ver el historial aquí.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const meta = actionLabel[log.action] ?? { label: log.action, color: "text-neutral-600" };
                const changes = log.changes as Record<string, unknown>;
                const wasSuccess = changes?.success !== false;
                return (
                  <div key={log.id} className="flex items-start gap-3 py-2 border-b border-neutral-50 last:border-0">
                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${wasSuccess ? "bg-primary-400" : "bg-accent-rose"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
                        <span className="text-sm text-neutral-700">{automationLabel[log.entityId ?? ""] ?? log.entityId ?? ""}</span>
                      </div>
                      {typeof changes?.detail === "string" && (
                        <p className="text-xs text-neutral-400 mt-0.5">{changes.detail as string}</p>
                      )}
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {log.user ? `${log.user.firstName} ${log.user.lastName} · ` : ""}
                        {new Date(log.createdAt).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
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
