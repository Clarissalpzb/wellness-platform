import { Lightbulb, TrendingUp, Users, Calendar, DollarSign, AlertTriangle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIQueryInput } from "@/components/ai/ai-query-input";

const insights: any[] = [];

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
          {insights.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No hay datos disponibles</p>
            </div>
          ) : (
            insights.map((insight) => (
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
                        {insight.suggestedActions.map((action: string) => (
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
            ))
          )}
        </TabsContent>

        <TabsContent value="new" className="mt-4 space-y-4">
          {insights.filter(i => i.status === "NEW").length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No hay datos disponibles</p>
            </div>
          ) : (
            insights.filter(i => i.status === "NEW").map((insight) => (
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
                        {insight.suggestedActions.map((action: string) => (
                          <Button key={action} variant="outline" size="sm">{action}</Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
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
