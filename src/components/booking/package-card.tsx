"use client";

import { useState } from "react";
import {
  Clock, Users, Loader2, CheckCircle2, AlertCircle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/booking/helpers";
import type { PackageItem, CouponResult } from "@/lib/booking/types";

interface PackageCardProps {
  pkg: PackageItem;
  studioId: string;
  stripeRedirectPath: string;
  onFreePurchase: () => void;
}

const typeLabels: Record<string, string> = {
  CLASS_PACK: "Paquete de clases",
  UNLIMITED: "Ilimitado",
  DROP_IN: "Clase individual",
  MEMBERSHIP: "Membresía",
};

export function PackageCard({ pkg, studioId, stripeRedirectPath, onFreePurchase }: PackageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [purchasedId, setPurchasedId] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState("");

  const { whole, cents } = formatPrice(pkg.price);
  const finalPrice = couponResult?.valid ? couponResult.finalPrice : pkg.price;
  const isFree = couponResult?.valid && couponResult.finalPrice === 0;
  const { whole: finalWhole, cents: finalCents } = formatPrice(finalPrice);

  async function handleValidateCoupon() {
    const code = couponInput.trim();
    if (!code) return;

    setCouponLoading(true);
    setCouponError("");
    setCouponResult(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, packageId: pkg.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || "Cupón no válido");
      } else {
        setCouponResult({ ...data, code });
      }
    } catch {
      setCouponError("Error al validar cupón");
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setCouponResult(null);
    setCouponInput("");
    setCouponError("");
  }

  async function handleBuy() {
    setPurchasingId(pkg.id);
    setPurchaseMessage(null);
    try {
      const res = await fetch("/api/packages/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          ...(couponResult?.valid && { couponCode: couponResult.code }),
          successUrl: `${stripeRedirectPath}?purchase=success`,
          cancelUrl: `${stripeRedirectPath}?purchase=cancelled`,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al comprar" }));
        throw new Error(err.error || "Error al comprar");
      }
      const data = await res.json();

      if (data.free) {
        setPurchaseMessage({ type: "success", text: "Paquete adquirido exitosamente" });
        setPurchasedId(pkg.id);
        setTimeout(() => setPurchasedId(null), 3000);
        onFreePurchase();
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (e: unknown) {
      setPurchaseMessage({ type: "error", text: e instanceof Error ? e.message : "Error al comprar" });
    } finally {
      setPurchasingId(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="py-5 space-y-3">
        {purchaseMessage && (
          <div className={`flex items-center gap-2 text-sm p-4 rounded-xl ${purchaseMessage.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {purchaseMessage.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span>{purchaseMessage.text}</span>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-semibold text-neutral-900">{pkg.name}</h4>
            <Badge variant="outline" className="mt-1 text-xs">
              {typeLabels[pkg.type] ?? pkg.type}
            </Badge>
          </div>
          <div className="text-right shrink-0">
            {couponResult?.valid ? (
              <>
                <p className="text-sm text-neutral-400 line-through">
                  ${whole}.{cents}
                </p>
                <p className="text-xl font-bold text-green-700">
                  {isFree ? "Gratis" : `$${finalWhole}.${finalCents}`}
                </p>
              </>
            ) : (
              <p className="text-xl font-bold text-neutral-900">
                ${whole}<span className="text-sm">.{cents}</span>
              </p>
            )}
            <p className="text-xs text-neutral-500">{pkg.currency}</p>
          </div>
        </div>
        {pkg.description && (
          <p className="text-sm text-neutral-600">{pkg.description}</p>
        )}
        <div className="flex flex-wrap gap-3 text-sm text-neutral-500">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {pkg.classLimit === null ? "Clases ilimitadas" : `${pkg.classLimit} clase${pkg.classLimit > 1 ? "s" : ""}`}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {pkg.validityDays} días de vigencia
          </span>
        </div>

        {!expanded ? (
          <Button
            onClick={() => {
              setExpanded(true);
              setPurchaseMessage(null);
            }}
            disabled={purchasedId === pkg.id}
            className="w-full h-10 rounded-xl bg-neutral-900 hover:bg-neutral-800"
          >
            {purchasedId === pkg.id ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Adquirido
              </>
            ) : (
              "Comprar"
            )}
          </Button>
        ) : (
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-1.5 block">
                Código de descuento (opcional)
              </label>
              {couponResult?.valid ? (
                <div className="flex items-center gap-2 bg-green-50 text-green-800 text-sm p-3 rounded-xl">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">
                    Cupón <strong>{couponResult.code}</strong> aplicado
                    {couponResult.discountType === "PERCENTAGE"
                      ? ` (${couponResult.discountValue}% de descuento)`
                      : ` ($${couponResult.discountValue} de descuento)`}
                  </span>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-green-600 hover:text-green-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Ingresa tu código"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleValidateCoupon();
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleValidateCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="shrink-0"
                  >
                    {couponLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Aplicar"
                    )}
                  </Button>
                </div>
              )}
              {couponError && (
                <p className="text-xs text-red-600 mt-1">{couponError}</p>
              )}
            </div>

            <Button
              onClick={handleBuy}
              disabled={purchasingId === pkg.id}
              className="w-full h-10 rounded-xl bg-neutral-900 hover:bg-neutral-800"
            >
              {purchasingId === pkg.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isFree ? "Obtener gratis" : "Pagar con Stripe"}
            </Button>

            <button
              onClick={() => {
                setExpanded(false);
                handleRemoveCoupon();
              }}
              className="w-full text-sm text-neutral-500 hover:text-neutral-700 text-center"
            >
              Cancelar
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
