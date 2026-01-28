import { Lightbulb, TrendingUp, Users, Calendar, DollarSign, AlertTriangle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIQueryInput } from "@/components/ai/ai-query-input";

const insights = [
  {
    id: "1",
    type: "revenue",
    title: "Oportunidad de precio en Yoga Flow 18:00",
    description: "Yoga Flow de las 18:00 tiene 95%+ ocupación y lista de espera frecuente durante las últimas 6 semanas. El precio actual ($250/clase) podría ajustarse o se podría agregar una sesión adicional para capturar la demanda insatisfecha. Ingreso potencial: $12,000-15,000/mes adicionales.",
    impactScore: 9,
    confidenceScore: 8,
    icon: DollarSign,
    createdAt: "Hace 2h",
    status: "NEW",
    suggestedActions: ["Agregar clase a las 19:00", "Incrementar precio 15%", "Crear paquete premium"],
  },
  {
    id: "2",
    type: "retention",
    title: "3 clientes de alto valor en riesgo",
    description: "Sofía H. (LTV $15,000), Diego T. (LTV $12,000) y Valentina R. (LTV $8,500) han reducido su frecuencia de visitas >50%. Sofía pasó de 4 a 1 visita/semana, Diego de 3 a 0 en las últimas 2 semanas. Intervención inmediata recomendada.",
    impactScore: 8,
    confidenceScore: 7,
    icon: Users,
    createdAt: "Hace 4h",
    status: "NEW",
    suggestedActions: ["Enviar mensaje personalizado", "Ofrecer clase cortesía", "Agendar llamada"],
  },
  {
    id: "3",
    type: "schedule",
    title: "Meditación martes 10:00 - baja ocupación crónica",
    description: "Esta clase ha promediado 32% de ocupación (8/25) por 4 semanas consecutivas. Costo operativo estimado: $800/clase vs ingresos de $500. Considere reubicar al horario de las 07:00 donde hay búsquedas sin oferta.",
    impactScore: 6,
    confidenceScore: 9,
    icon: Calendar,
    createdAt: "Hace 6h",
    status: "SEEN",
    suggestedActions: ["Mover a las 07:00", "Reducir a quincenal", "Cancelar temporalmente"],
  },
  {
    id: "4",
    type: "coach",
    title: "Carlos López: coach estrella del mes",
    description: "Tasa de retención del 92% (promedio: 78%), NPS de 9.2, y 0 cancelaciones. Sus clientes renuevan paquetes 35% más que el promedio. Considere incentivos para retener a este talento.",
    impactScore: 5,
    confidenceScore: 8,
    icon: TrendingUp,
    createdAt: "Ayer",
    status: "SEEN",
    suggestedActions: ["Ofrecer bonus", "Asignar más clases", "Destacar en marketing"],
  },
  {
    id: "5",
    type: "operations",
    title: "Patrón de no-shows viernes 17:00",
    description: "Las clases de viernes 17:00 tienen 3x más no-shows que el promedio (12% vs 4%). Posible causa: hora de salida laboral. Considere mover a las 17:30 o implementar lista de espera automática.",
    impactScore: 4,
    confidenceScore: 7,
    icon: AlertTriangle,
    createdAt: "Ayer",
    status: "ACTED",
    suggestedActions: ["Enviar recordatorio 2h antes", "Mover a 17:30", "Penalizar no-shows"],
  },
];

const typeLabels: Record<string, string> = {
  revenue: "Ingresos",
  retention: "Retención",
  schedule: "Horarios",
  coach: "Coaches",
  operations: "Operaciones",
};

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Insights IA</h1>
          <p className="text-sm text-neutral-500">Recomendaciones inteligentes para tu negocio</p>
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filtrar
        </Button>
      </div>

      {/* AI Query */}
      <AIQueryInput />

      {/* Insights */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos ({insights.length})</TabsTrigger>
          <TabsTrigger value="new">Nuevos ({insights.filter(i => i.status === "NEW").length})</TabsTrigger>
          <TabsTrigger value="revenue">Ingresos</TabsTrigger>
          <TabsTrigger value="retention">Retención</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id} className={insight.status === "NEW" ? "border-primary-200" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    insight.type === "revenue" ? "bg-primary-100 text-primary-600" :
                    insight.type === "retention" ? "bg-accent-rose-light text-accent-rose" :
                    insight.type === "schedule" ? "bg-accent-amber-light text-accent-amber" :
                    insight.type === "coach" ? "bg-accent-blue-light text-accent-blue" :
                    "bg-neutral-100 text-neutral-600"
                  }`}>
                    <insight.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{insight.title}</h3>
                      {insight.status === "NEW" && (
                        <Badge variant="success">Nuevo</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{typeLabels[insight.type]}</Badge>
                      <span className="text-xs text-neutral-400">{insight.createdAt}</span>
                      <span className="text-xs text-neutral-400">|</span>
                      <span className="text-xs text-neutral-400">Impacto: {insight.impactScore}/10</span>
                      <span className="text-xs text-neutral-400">|</span>
                      <span className="text-xs text-neutral-400">Confianza: {insight.confidenceScore}/10</span>
                    </div>
                    <p className="text-sm text-neutral-600 mb-3">{insight.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {insight.suggestedActions.map((action) => (
                        <Button key={action} variant="outline" size="sm">
                          {action}
                        </Button>
                      ))}
                      <Button variant="ghost" size="sm" className="text-neutral-400">
                        Descartar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="new" className="mt-4 space-y-4">
          {insights.filter(i => i.status === "NEW").map((insight) => (
            <Card key={insight.id} className="border-primary-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                    <insight.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{insight.title}</h3>
                    <p className="text-sm text-neutral-600 mb-3">{insight.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {insight.suggestedActions.map((action) => (
                        <Button key={action} variant="outline" size="sm">{action}</Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="revenue" className="mt-4 text-center py-8 text-neutral-500">
          <p>Filtro por ingresos - misma estructura con datos filtrados</p>
        </TabsContent>
        <TabsContent value="retention" className="mt-4 text-center py-8 text-neutral-500">
          <p>Filtro por retención - misma estructura con datos filtrados</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
