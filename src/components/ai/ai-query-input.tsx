"use client";

import { useState, useRef } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const suggestedQueries = [
  "¿Cuál es mi clase más rentable?",
  "¿Qué clientes están en riesgo de churn?",
  "¿Cuál es el mejor horario para una nueva clase?",
  "Resumen de ingresos de este mes",
];

export function AIQueryInput() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit() {
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResponse(data.response || "No pude procesar tu consulta. Intenta de nuevo.");
    } catch {
      setResponse("Error al procesar la consulta. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-accent-amber" />
          <h3 className="font-semibold">Pregunta a la IA</h3>
        </div>

        <div className="relative">
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Pregunta algo sobre tu negocio..."
            className="w-full min-h-[80px] rounded-lg border border-neutral-200 bg-white px-3 py-2 pr-12 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
          <Button
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8"
            onClick={handleSubmit}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!response && !isLoading && (
          <div className="flex flex-wrap gap-2 mt-3">
            {suggestedQueries.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuery(q);
                  inputRef.current?.focus();
                }}
                className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-3 py-1.5 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {response && (
          <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-accent-amber" />
              <span className="text-xs font-medium text-neutral-500">Respuesta IA</span>
            </div>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{response}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
