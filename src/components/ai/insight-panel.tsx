"use client";

import { X, Lightbulb, TrendingUp, AlertTriangle, Users, Calendar, DollarSign, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const mockInsights = [
  {
    id: "1",
    type: "revenue",
    title: "Oportunidad de precio",
    description: "Yoga Flow de las 18:00 tiene 95%+ ocupación y lista de espera frecuente. Considera aumentar precio o agregar otra sesión.",
    impactScore: 9,
    confidenceScore: 8,
    icon: DollarSign,
    iconBg: "bg-primary-100",
    iconColor: "text-primary-600",
    status: "NEW",
    suggestedActions: ["Agregar clase adicional", "Ajustar precio"],
  },
  {
    id: "2",
    type: "retention",
    title: "3 clientes en riesgo de churn",
    description: "Sofía H., Diego T. y Valentina R. han reducido su frecuencia de visitas más del 50% en las últimas 4 semanas.",
    impactScore: 8,
    confidenceScore: 7,
    icon: Users,
    iconBg: "bg-accent-rose-light",
    iconColor: "text-accent-rose",
    status: "NEW",
    suggestedActions: ["Enviar mensaje personalizado", "Ofrecer clase cortesía"],
  },
  {
    id: "3",
    type: "schedule",
    title: "Baja ocupación martes 10:00",
    description: "Meditación de martes 10:00 ha tenido menos del 40% de ocupación por 4 semanas consecutivas.",
    impactScore: 6,
    confidenceScore: 9,
    icon: Calendar,
    iconBg: "bg-accent-amber-light",
    iconColor: "text-accent-amber",
    status: "NEW",
    suggestedActions: ["Cambiar horario", "Promocionar clase", "Cancelar temporalmente"],
  },
  {
    id: "4",
    type: "coach",
    title: "Carlos López: coach estrella",
    description: "Sus clases tienen la mayor tasa de retención (92%) y las mejores calificaciones. Considere incentivos adicionales.",
    impactScore: 5,
    confidenceScore: 8,
    icon: TrendingUp,
    iconBg: "bg-accent-blue-light",
    iconColor: "text-accent-blue",
    status: "SEEN",
    suggestedActions: ["Ofrecer bonus", "Asignar más clases"],
  },
];

function getImpactLabel(score: number): string {
  if (score >= 8) return "Alto";
  if (score >= 5) return "Medio";
  return "Bajo";
}

function getImpactVariant(score: number): "destructive" | "warning" | "secondary" {
  if (score >= 8) return "destructive";
  if (score >= 5) return "warning";
  return "secondary";
}

export function InsightPanel() {
  const { insightPanelOpen, setInsightPanelOpen } = useUIStore();

  if (!insightPanelOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-xl border-l border-neutral-200 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent-amber" />
          <h2 className="font-semibold">Insights IA</h2>
          <Badge variant="warning">{mockInsights.filter(i => i.status === "NEW").length} nuevos</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setInsightPanelOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {mockInsights.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                "p-4 rounded-xl border transition-colors cursor-pointer hover:shadow-sm",
                insight.status === "NEW"
                  ? "border-primary-200 bg-primary-50/30"
                  : "border-neutral-200 bg-white"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", insight.iconBg)}>
                  <insight.icon className={cn("h-4 w-4", insight.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold truncate">{insight.title}</h3>
                    {insight.status === "NEW" && (
                      <span className="h-2 w-2 rounded-full bg-primary-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 line-clamp-2">{insight.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getImpactVariant(insight.impactScore)} className="text-xs">
                      Impacto: {getImpactLabel(insight.impactScore)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {insight.suggestedActions.map((action) => (
                      <Button key={action} variant="outline" size="sm" className="h-7 text-xs">
                        {action}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-neutral-200">
        <Button variant="outline" className="w-full" asChild>
          <a href="/dashboard/insights">
            Ver todos los insights
            <ChevronRight className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );
}
