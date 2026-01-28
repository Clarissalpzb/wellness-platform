import { NextResponse } from "next/server";
import { generateInsightSummary } from "@/lib/anthropic";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // In production, you'd fetch real data from the DB for context
    const mockContext = `
Datos del centro (últimos 30 días):
- Ingresos: $115,000 MXN (+12.5% vs mes anterior)
- Clientes activos: 342 (+8.3%)
- Reservas totales: 1,420
- Tasa de retención: 78%
- Clases más populares: Yoga Flow (95% ocupación), HIIT Cardio (93%), Pilates Mat (83%)
- Coach con mejor retención: María García (92%)
- 3 clientes en riesgo de churn: Sofía H., Diego T., Valentina R.
- Paquete más vendido: Membresía Mensual (85 vendidos)
- Horario más demandado: 17:00-19:00 (85% ocupación promedio)
- Día más ocupado: Viernes
- Tasa de no-shows: 4.2%
    `.trim();

    const response = await generateInsightSummary(mockContext, query);

    return NextResponse.json({ response });
  } catch (error) {
    console.error("AI query error:", error);
    return NextResponse.json(
      { error: "Error processing query" },
      { status: 500 }
    );
  }
}
