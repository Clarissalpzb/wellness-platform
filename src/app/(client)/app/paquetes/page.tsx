"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Package, CheckCircle2, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface UserPackageItem {
  id: string;
  name: string;
  type: string;
  classesUsed: number;
  classesTotal: number | null;
  expiresAt: string;
  classLimit: number | null;
  studioName: string;
}

const TYPE_LABELS: Record<string, string> = {
  CLASS_PACK: "Paquete de clases",
  UNLIMITED: "Ilimitado",
  DROP_IN: "Clase individual",
  MEMBERSHIP: "Membresía",
};

export default function MisPaquetesPage() {
  return (
    <Suspense>
      <MisPaquetesContent />
    </Suspense>
  );
}

function MisPaquetesContent() {
  const searchParams = useSearchParams();
  const purchaseSuccess = searchParams.get("purchase") === "success";
  const [showSuccessBanner, setShowSuccessBanner] = useState(purchaseSuccess);

  const [packages, setPackages] = useState<UserPackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [introEligible, setIntroEligible] = useState(false);
  const [introClaiming, setIntroClaiming] = useState(false);
  const [introClaimed, setIntroClaimed] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, introRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/intro-offer"),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setPackages(data.packages ?? []);
        }
        if (introRes.ok) {
          const data = await introRes.json();
          setIntroEligible(data.eligible);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function claimIntroOffer() {
    setIntroClaiming(true);
    try {
      const res = await fetch("/api/intro-offer", { method: "POST" });
      if (res.ok) {
        setIntroClaimed(true);
        setIntroEligible(false);
        // Reload packages
        const profileRes = await fetch("/api/profile");
        if (profileRes.ok) {
          const data = await profileRes.json();
          setPackages(data.packages ?? []);
        }
      }
    } finally {
      setIntroClaiming(false);
    }
  }

  // Group packages by studio
  const grouped = useMemo(() => {
    const map: Record<string, UserPackageItem[]> = {};
    for (const pkg of packages) {
      const studio = pkg.studioName || "Sin estudio";
      if (!map[studio]) map[studio] = [];
      map[studio].push(pkg);
    }
    return map;
  }, [packages]);

  const studioNames = Object.keys(grouped).sort();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Mis Paquetes</h1>
          <p className="text-sm text-neutral-500">Tus paquetes activos</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          <span className="ml-2 text-sm text-neutral-500">Cargando paquetes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mis Paquetes</h1>
        <p className="text-sm text-neutral-500">Tus paquetes activos</p>
      </div>

      {/* Intro offer banner */}
      {introEligible && !introClaimed && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
          <div className="flex items-center gap-3">
            <Gift className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-900">¡Tu primera clase es gratis!</p>
              <p className="text-xs text-green-700">Reclama ahora — válida por 15 días.</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={claimIntroOffer}
            disabled={introClaiming}
            className="bg-green-600 hover:bg-green-700 text-white shrink-0"
          >
            {introClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reclamar"}
          </Button>
        </div>
      )}

      {introClaimed && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 text-green-800 text-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>¡Clase de bienvenida activada! Tienes 15 días para usarla.</span>
        </div>
      )}

      {showSuccessBanner && (
        <div className="flex items-center justify-between gap-2 text-sm p-4 rounded-xl bg-green-50 text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>Pago completado exitosamente. Tu paquete ya está activo.</span>
          </div>
          <button
            onClick={() => setShowSuccessBanner(false)}
            className="text-green-600 hover:text-green-800 text-xs font-medium shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {packages.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
          <p className="text-neutral-500">No tienes paquetes activos.</p>
          <p className="text-sm text-neutral-400 mt-1">
            Visita un estudio en la sección de Reservar para adquirir un paquete.
          </p>
        </div>
      ) : (
        studioNames.map((studioName) => (
          <div key={studioName} className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-900">{studioName}</h2>
            {grouped[studioName].map((pkg) => {
              const isUnlimited = pkg.classesTotal === null;
              const total = pkg.classesTotal ?? 0;
              const progress = isUnlimited ? 100 : total > 0 ? Math.round((pkg.classesUsed / total) * 100) : 0;
              const remaining = isUnlimited ? null : (pkg.classesTotal ?? 0) - pkg.classesUsed;
              const expiresDate = new Date(pkg.expiresAt);
              const daysLeft = Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / 86400000));

              return (
                <Card key={pkg.id}>
                  <CardContent className="py-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-neutral-900">{pkg.name}</h3>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {TYPE_LABELS[pkg.type] ?? pkg.type}
                        </Badge>
                      </div>
                      <div className="text-right shrink-0">
                        {daysLeft <= 7 ? (
                          <Badge variant="secondary" className="text-amber-700 bg-amber-50">
                            {daysLeft === 0 ? "Vence hoy" : `${daysLeft} día${daysLeft > 1 ? "s" : ""}`}
                          </Badge>
                        ) : (
                          <span className="text-sm text-neutral-500">{daysLeft} días restantes</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">
                          {isUnlimited ? "Clases ilimitadas" : `${pkg.classesUsed} / ${pkg.classesTotal} clases usadas`}
                        </span>
                        {remaining !== null && (
                          <span className="font-medium text-neutral-900">
                            {remaining} restante{remaining !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-primary-500"
                          style={{ width: `${isUnlimited ? 100 : Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-neutral-400">
                      Vence el {expiresDate.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
