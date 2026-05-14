"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BillingBannerProps {
  daysLeft: number;
}

export function BillingBanner({ daysLeft }: BillingBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (dismissed) return null;

  const openPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="bg-red-600 text-white px-4 py-2 flex items-center gap-3 text-sm shrink-0">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        <strong>Problema con tu pago.</strong> Tu acceso se bloqueará en{" "}
        <strong>{daysLeft} día{daysLeft !== 1 ? "s" : ""}</strong>. Actualiza tu método de pago para evitar interrupciones.
      </span>
      <Button
        size="sm"
        variant="outline"
        className="bg-transparent border-white text-white hover:bg-red-700 hover:text-white h-7 text-xs shrink-0"
        onClick={openPortal}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Actualizar pago"}
      </Button>
      <button onClick={() => setDismissed(true)} className="hover:opacity-70">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
