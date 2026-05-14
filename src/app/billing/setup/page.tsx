"use client";

import { useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";
import { CreditCard, CheckCircle, Loader2, AlertCircle, Shield, Zap, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

const FEATURES = [
  { icon: Zap, text: "Gestión completa de clases y horarios" },
  { icon: BarChart3, text: "Reportes y analíticas en tiempo real" },
  { icon: CreditCard, text: "Cobros en línea con Stripe Connect" },
  { icon: Shield, text: "CRM, autopilot y herramientas de IA" },
];

function BillingSetupInner() {
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled");
  const error = searchParams.get("error");

  const [loading, setLoading] = useState(false);
  const [isReactivation, setIsReactivation] = useState(false);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "canceled" || data.status === "unpaid" || data.status === "past_due") {
          setIsReactivation(true);
        }
      })
      .catch(() => {});
  }, []);

  const startCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-neutral-900">
            {isReactivation ? "Reactiva tu suscripción" : "Activa tu suscripción"}
          </h1>
          <p className="text-neutral-500 text-sm">
            {isReactivation
              ? "$2,500 MXN/mes. Tu información y datos están intactos."
              : "14 días gratis, luego $2,500 MXN/mes. Cancela cuando quieras."}
          </p>
        </div>

        {(cancelled || error) && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error
              ? "Hubo un error. Intenta de nuevo."
              : "Cancelaste el proceso. Puedes intentarlo de nuevo cuando quieras."}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-5">
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold text-neutral-900">$2,500</span>
            <span className="text-neutral-500 text-sm mb-1.5">MXN / mes</span>
          </div>

          <div className="space-y-2.5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-neutral-700">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                {text}
              </div>
            ))}
          </div>

          {!isReactivation && (
            <div className="pt-1 border-t border-neutral-100">
              <div className="flex items-start gap-2 text-xs text-neutral-500">
                <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0 text-neutral-400" />
                <span>Se requiere tarjeta para el trial. No se te cobrará nada hasta que terminen los 14 días.</span>
              </div>
            </div>
          )}

          <Button onClick={startCheckout} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            {isReactivation ? "Reactivar suscripción" : "Comenzar prueba gratuita"}
          </Button>
        </div>

        <p className="text-center text-xs text-neutral-400">
          Pago seguro procesado por Stripe. Puedes cancelar en cualquier momento.
        </p>
      </div>
    </div>
  );
}

export default function BillingSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    }>
      <BillingSetupInner />
    </Suspense>
  );
}
