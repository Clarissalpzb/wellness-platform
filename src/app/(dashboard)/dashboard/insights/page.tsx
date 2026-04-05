"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Lightbulb, TrendingUp, Users, Calendar, DollarSign,
  AlertTriangle, RefreshCw, Sparkles, CheckCircle2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIQueryInput } from "@/components/ai/ai-query-input";

interface Insight {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  impactScore: number;
  confidenceScore: number;
  actionabilityScore: number;
  suggestedActions: string[];
  status: "NEW" | "SEEN" | "ACTIONED" | "DISMISSED";
  createdAt: string;
}

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  revenue:    { label: "Ingresos",    icon: DollarSign,    color: "text-primary-600",   bg: "bg-primary-100" },
  retention:  { label: "Retención",   icon: Users,         color: "text-accent-rose",   bg: "bg-accent-rose-light" },
  schedule:   { label: "Horarios",    icon: Calendar,      color: "text-accent-amber",  bg: "bg-accent-amber-light" },
  coach:      { label: "Coaches",     icon: TrendingUp,    color: "text-accent-blue",   bg: "bg-accent-blue-light" },
  operations: { label: "Operaciones", icon: AlertTriangle, color: "text-neutral-600",   bg: "bg-neutral-100" },
};

function InsightCard({ insight, onDismiss }: { insight: Insight; onDismiss: (id: string) => void }) {
  const cfg = typeConfig[insight.type] ?? typeConfig.operations;
  const Icon = cfg.icon;
  const actions = Array.isArray(insight.suggestedActions) ? insight.suggestedActions : [];

  return (
    <Card className={insight.status === "NEW" ? "border-primary-200" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-sm">{insight.title}</h3>
              {insight.status === "NEW" && <Badge variant="success">Nuevo</Badge>}
            </div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline">{cfg.label}</Badge>
              <span className="text-xs text-neutral-400">
                {new Date(insight.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
              </span>
              <span className="text-xs text-neutral-400">Impacto: {insight.impactScore}/10</span>
              <span className="text-xs text-neutral-400">Confianza: {insight.confidenceScore}/10</span>
            </div>
            <p className="text-sm text-neutral-600 mb-3">{insight.description}</p>
            <div className="flex flex-wrap gap-2">
              {actions.map((action: string) => (
                <Button key={action} variant="outline" size="sm">{action}</Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-neutral-400 hover:text-neutral-600"
                onClick={() => onDismiss(insight.id)}
              >
                Descartar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onGenerate, loading }: { onGenerate: () => void; loading: boolean }) {
  return (
    <div className="text-center py-16 text-neutral-500">
      <Lightbulb className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
      <p className="font-medium mb-1">No hay insights disponibles</p>
      <p className="text-sm mb-4">Genera insights para ver recomendaciones basadas en tus datos reales.</p>
      <Button onClick={onGenerate} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Generar Insights
      </Button>
    </div>
  );
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(0);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/insights");
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/insights", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setGenerated(data.generated ?? 0);
        await fetchInsights();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleDismiss(id: string) {
    setInsights((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/insights/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DISMISSED" }),
    });
  }

  const newInsights = insights.filter((i) => i.status === "NEW");
  const revenueInsights = insights.filter((i) => i.type === "revenue");
  const retentionInsights = insights.filter((i) => i.type === "retention");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Insights IA</h1>
          <p className="text-sm text-neutral-500">Recomendaciones inteligentes para tu negocio</p>
        </div>
        <div className="flex items-center gap-2">
          {generated > 0 && (
            <span className="text-sm text-primary-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              {generated} nuevos generados
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchInsights} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button onClick={handleGenerate} disabled={generating || loading} size="sm">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generar Insights
          </Button>
        </div>
      </div>

      {/* AI Copilot */}
      <AIQueryInput />

      {/* Insights list */}
      {loading ? (
        <div className="text-center py-12 text-neutral-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-neutral-300" />
          <p className="text-sm">Cargando insights...</p>
        </div>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todos ({insights.length})</TabsTrigger>
            <TabsTrigger value="new">
              Nuevos ({newInsights.length})
              {newInsights.length > 0 && (
                <span className="ml-1.5 h-2 w-2 rounded-full bg-primary-500 inline-block" />
              )}
            </TabsTrigger>
            <TabsTrigger value="revenue">Ingresos ({revenueInsights.length})</TabsTrigger>
            <TabsTrigger value="retention">Retención ({retentionInsights.length})</TabsTrigger>
          </TabsList>

          {[
            { value: "all", list: insights },
            { value: "new", list: newInsights },
            { value: "revenue", list: revenueInsights },
            { value: "retention", list: retentionInsights },
          ].map(({ value, list }) => (
            <TabsContent key={value} value={value} className="mt-4 space-y-4">
              {list.length === 0 ? (
                <EmptyState onGenerate={handleGenerate} loading={generating} />
              ) : (
                list.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} onDismiss={handleDismiss} />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
