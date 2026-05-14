"use client";

import { useState } from "react";
import { CreditCard, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BillingWallProps {
  reason: "canceled" | "past_due" | "unpaid";
}

export function BillingWall({ reason }: BillingWallProps) {
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    setLoading(true);
    try {
      const endpoint = reason === "canceled" ? "/api/billing/subscribe" : "/api/billing/portal";
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-neutral-900">
            {reason === "canceled" ? "Suscripción cancelada" : "Problema con tu pago"}
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed">
            {reason === "canceled"
              ? "Tu suscripción ha sido cancelada. Reactívala para volver a acceder a tu plataforma."
              : "No pudimos procesar tu pago. Actualiza tu método de pago para continuar usando la plataforma."}
          </p>
        </div>

        <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4 text-left space-y-2">
          <p className="text-xs font-medium text-neutral-700">Plan Mensual</p>
          <p className="text-2xl font-bold text-neutral-900">$2,500 <span className="text-sm font-normal text-neutral-500">MXN / mes</span></p>
        </div>

        <Button onClick={openPortal} disabled={loading} className="w-full">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4" />
          )}
          {reason === "canceled" ? "Reactivar suscripción" : "Actualizar método de pago"}
          <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" />
        </Button>

        <p className="text-xs text-neutral-400">
          ¿Necesitas ayuda? Escríbenos a{" "}
          <a href="mailto:soporte@tudominio.com" className="underline">
            soporte@tudominio.com
          </a>
        </p>
      </div>
    </div>
  );
}
