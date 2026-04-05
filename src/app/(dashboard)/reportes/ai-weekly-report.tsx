"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AIWeeklyReport() {
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/weekly");
      if (!res.ok) throw new Error("Error generando reporte");
      const data = await res.json();
      setNarrative(data.narrative);
      setGeneratedAt(data.generatedAt);
    } catch {
      setError("No se pudo generar el reporte. Verifica que tengas configurada la API key de Claude.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary-200 bg-gradient-to-br from-primary-50/40 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-amber" />
            Análisis Semanal con IA
          </CardTitle>
          <div className="flex items-center gap-2">
            {narrative && (
              <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
            <Button
              size="sm"
              variant={narrative ? "outline" : "default"}
              onClick={generate}
              disabled={loading}
            >
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analizando...</>
                : narrative
                  ? <><RefreshCw className="mr-2 h-4 w-4" />Regenerar</>
                  : <><Sparkles className="mr-2 h-4 w-4" />Generar Análisis</>
              }
            </Button>
          </div>
        </div>
        {generatedAt && (
          <p className="text-xs text-neutral-400">
            Generado {new Date(generatedAt).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </CardHeader>

      {!narrative && !loading && !error && (
        <CardContent>
          <div className="text-center py-6 text-neutral-500">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
            <p className="text-sm font-medium mb-1">Análisis ejecutivo de tu negocio</p>
            <p className="text-xs text-neutral-400">
              Claude analiza todos tus datos y escribe un reporte personalizado con lo más importante de la semana.
            </p>
          </div>
        </CardContent>
      )}

      {error && (
        <CardContent>
          <p className="text-sm text-accent-rose bg-accent-rose-light px-3 py-2 rounded-lg">{error}</p>
        </CardContent>
      )}

      {loading && (
        <CardContent>
          <div className="text-center py-8 text-neutral-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Claude está analizando tus datos...</p>
          </div>
        </CardContent>
      )}

      {narrative && expanded && (
        <CardContent>
          <div className="prose prose-sm max-w-none text-neutral-700">
            {narrative.split("\n").map((line, i) => {
              if (!line.trim()) return <br key={i} />;
              if (line.startsWith("##")) return <h3 key={i} className="font-bold text-neutral-900 mt-4 mb-1">{line.replace(/^#+\s*/, "")}</h3>;
              if (line.startsWith("#")) return <h2 key={i} className="font-bold text-neutral-900 mt-4 mb-2 text-base">{line.replace(/^#+\s*/, "")}</h2>;
              if (line.match(/^\d+\./)) return <p key={i} className="mb-1 pl-4">{line}</p>;
              if (line.startsWith("-") || line.startsWith("•")) return <p key={i} className="mb-1 pl-4">• {line.replace(/^[-•]\s*/, "")}</p>;
              if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-neutral-900">{line.replace(/\*\*/g, "")}</p>;
              return <p key={i} className="mb-2">{line}</p>;
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
