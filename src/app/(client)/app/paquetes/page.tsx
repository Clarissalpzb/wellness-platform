"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Package, CheckCircle2, Gift, Infinity, Star, ShoppingBag, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

interface CatalogPackage {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  currency: string;
  classLimit: number | null;
  validityDays: number;
  isFeatured: boolean;
}

interface CatalogGroup {
  id: string;
  name: string;
  color: string;
  emoji: string | null;
  packages: CatalogPackage[];
}

interface Studio {
  id: string;
  name: string;
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
  const [mainTab, setMainTab] = useState("mis-paquetes");

  // My packages state
  const [myPackages, setMyPackages] = useState<UserPackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [introEligible, setIntroEligible] = useState(false);
  const [introClaiming, setIntroClaiming] = useState(false);
  const [introClaimed, setIntroClaimed] = useState(false);

  // Catalog state
  const [studios, setStudios] = useState<Studio[]>([]);
  const [selectedStudioId, setSelectedStudioId] = useState<string>("");
  const [catalogGroups, setCatalogGroups] = useState<CatalogGroup[]>([]);
  const [catalogUngrouped, setCatalogUngrouped] = useState<CatalogPackage[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, introRes, studiosRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/intro-offer"),
          fetch("/api/studios"),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setMyPackages(data.packages ?? []);
        }
        if (introRes.ok) {
          const data = await introRes.json();
          setIntroEligible(data.eligible);
        }
        if (studiosRes.ok) {
          const data = await studiosRes.json();
          const list: Studio[] = data.data ?? data;
          setStudios(list);
          if (list.length > 0) setSelectedStudioId(list[0].id);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedStudioId) return;
    setCatalogLoading(true);
    fetch(`/api/packages/public?organizationId=${selectedStudioId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          const payload = data.data ?? data;
          setCatalogGroups(payload.groups ?? []);
          setCatalogUngrouped(payload.ungrouped ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setCatalogLoading(false));
  }, [selectedStudioId]);

  async function claimIntroOffer() {
    setIntroClaiming(true);
    try {
      const res = await fetch("/api/intro-offer", { method: "POST" });
      if (res.ok) {
        setIntroClaimed(true);
        setIntroEligible(false);
        const profileRes = await fetch("/api/profile");
        if (profileRes.ok) {
          const data = await profileRes.json();
          setMyPackages(data.packages ?? []);
        }
      }
    } finally {
      setIntroClaiming(false);
    }
  }

  async function handlePurchase(pkgId: string) {
    setPurchasing(pkgId);
    try {
      const res = await fetch("/api/packages/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkgId }),
      });
      if (res.ok) {
        const data = await res.json();
        const payload = data.data ?? data;
        if (payload.checkoutUrl) {
          window.location.href = payload.checkoutUrl;
        } else {
          // Direct purchase (no payment needed)
          setMainTab("mis-paquetes");
          setShowSuccessBanner(true);
          const profileRes = await fetch("/api/profile");
          if (profileRes.ok) {
            const d = await profileRes.json();
            setMyPackages(d.packages ?? []);
          }
        }
      }
    } catch {
      // silently fail
    } finally {
      setPurchasing(null);
    }
  }

  const grouped = useMemo(() => {
    const map: Record<string, UserPackageItem[]> = {};
    for (const pkg of myPackages) {
      const studio = pkg.studioName || "Sin estudio";
      if (!map[studio]) map[studio] = [];
      map[studio].push(pkg);
    }
    return map;
  }, [myPackages]);

  const studioNames = Object.keys(grouped).sort();
  const totalCatalogPackages = catalogGroups.reduce((s, g) => s + g.packages.length, 0) + catalogUngrouped.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-neutral-900">Paquetes</h1>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Paquetes</h1>
        <p className="text-sm text-neutral-500">Tus paquetes activos y los disponibles para comprar</p>
      </div>

      {/* Intro offer banner */}
      {introEligible && !introClaimed && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
          <div className="flex items-center gap-3">
            <Gift className="h-5 w-5 text-green-600 shrink-0" />
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
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>¡Clase de bienvenida activada! Tienes 15 días para usarla.</span>
        </div>
      )}

      {showSuccessBanner && (
        <div className="flex items-center justify-between gap-2 text-sm p-4 rounded-xl bg-green-50 text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Pago completado exitosamente. Tu paquete ya está activo.</span>
          </div>
          <button onClick={() => setShowSuccessBanner(false)} className="text-green-600 hover:text-green-800 text-xs font-medium shrink-0">
            Cerrar
          </button>
        </div>
      )}

      {/* Main tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="mis-paquetes" className="gap-1.5">
            <Package className="h-4 w-4" />
            Mis Paquetes
            {myPackages.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{myPackages.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="disponibles" className="gap-1.5">
            <ShoppingBag className="h-4 w-4" />
            Disponibles
            {totalCatalogPackages > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{totalCatalogPackages}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── My Packages Tab ── */}
        <TabsContent value="mis-paquetes" className="mt-4 space-y-4">
          {myPackages.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-neutral-500">No tienes paquetes activos.</p>
              <p className="text-sm text-neutral-400 mt-1">Explora los disponibles y adquiere uno.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setMainTab("disponibles")}
              >
                Ver paquetes disponibles
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          ) : (
            studioNames.map((studioName) => (
              <div key={studioName} className="space-y-3">
                <h2 className="text-base font-semibold text-neutral-900">{studioName}</h2>
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
        </TabsContent>

        {/* ── Available Packages Catalog Tab ── */}
        <TabsContent value="disponibles" className="mt-4 space-y-5">
          {/* Studio selector */}
          {studios.length > 1 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-600 shrink-0">Estudio:</span>
              <Select value={selectedStudioId} onValueChange={setSelectedStudioId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Seleccionar estudio" />
                </SelectTrigger>
                <SelectContent>
                  {studios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {catalogLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : totalCatalogPackages === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-neutral-500">No hay paquetes disponibles en este estudio.</p>
            </div>
          ) : (
            <>
              {/* Groups */}
              {catalogGroups.map((group) => (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-sm"
                      style={{ backgroundColor: group.color + "22", border: `2px solid ${group.color}` }}
                    >
                      {group.emoji || "📦"}
                    </div>
                    <h2 className="text-base font-semibold text-neutral-900">{group.name}</h2>
                    <div className="h-px flex-1" style={{ backgroundColor: group.color + "44" }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.packages.map((pkg) => (
                      <CatalogCard
                        key={pkg.id}
                        pkg={pkg}
                        groupColor={group.color}
                        purchasing={purchasing}
                        onPurchase={handlePurchase}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Ungrouped */}
              {catalogUngrouped.length > 0 && (
                <div className="space-y-3">
                  {catalogGroups.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-neutral-400" />
                      <h2 className="text-base font-semibold text-neutral-900">Más paquetes</h2>
                      <div className="h-px flex-1 bg-neutral-100" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {catalogUngrouped.map((pkg) => (
                      <CatalogCard
                        key={pkg.id}
                        pkg={pkg}
                        groupColor={null}
                        purchasing={purchasing}
                        onPurchase={handlePurchase}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CatalogCard({
  pkg,
  groupColor,
  purchasing,
  onPurchase,
}: {
  pkg: CatalogPackage;
  groupColor: string | null;
  purchasing: string | null;
  onPurchase: (id: string) => void;
}) {
  return (
    <Card className={cn("relative overflow-hidden", pkg.isFeatured && "ring-2 ring-amber-400")}>
      {pkg.isFeatured && (
        <div className="absolute top-0 right-0">
          <div className="bg-amber-400 text-white text-xs font-medium px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
            <Star className="h-3 w-3 fill-white" />
            Destacado
          </div>
        </div>
      )}
      {groupColor && (
        <div className="h-1 w-full" style={{ backgroundColor: groupColor }} />
      )}
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-neutral-900 text-sm leading-snug pr-16">{pkg.name}</h3>
          <Badge variant="outline" className="mt-1 text-xs">{TYPE_LABELS[pkg.type] ?? pkg.type}</Badge>
        </div>

        {pkg.description && (
          <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">{pkg.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            {pkg.classLimit ? (
              <>{pkg.classLimit} clase{pkg.classLimit !== 1 ? "s" : ""}</>
            ) : (
              <><Infinity className="h-3.5 w-3.5" /> Ilimitado</>
            )}
          </span>
          <span>·</span>
          <span>{pkg.validityDays} días</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-neutral-900">
              ${pkg.price.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-400">{pkg.currency || "MXN"}</span>
          </div>
          <Button
            size="sm"
            onClick={() => onPurchase(pkg.id)}
            disabled={purchasing === pkg.id}
            className="shrink-0"
          >
            {purchasing === pkg.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Comprar"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
