"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Studio constants (mirrored from reservar)
// ---------------------------------------------------------------------------
const STUDIO_COLORS: Record<string, string> = {
  Reformee: "#a855f7",
  "Raw Cycling": "#f59e0b",
  Hotflow: "#ef4444",
};

const STUDIO_HERO_GRADIENT: Record<string, string> = {
  Reformee: "from-purple-950 via-purple-900 to-purple-800",
  "Raw Cycling": "from-amber-950 via-amber-900 to-amber-800",
  Hotflow: "from-red-950 via-red-900 to-red-800",
};

const STUDIO_INFO: Record<string, { address: string; description: string }> = {
  Reformee: {
    address: "Av. Paseo de la Reforma 222, CDMX",
    description: "Pilates reformer de alta intensidad para transformar tu cuerpo y mente.",
  },
  "Raw Cycling": {
    address: "Calle Masaryk 101, Polanco, CDMX",
    description: "Cycling inmersivo con música en vivo y experiencia sensorial única.",
  },
  Hotflow: {
    address: "Av. Presidente Masaryk 460, Polanco, CDMX",
    description: "Hot yoga y flow en un espacio diseñado para reconectar contigo.",
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type StudioName = "Reformee" | "Raw Cycling" | "Hotflow";

interface PackageItem {
  id: string;
  name: string;
  price: number;
  sessions: number | "unlimited";
  validDays: number;
  validClasses: string[];
}

// ---------------------------------------------------------------------------
// Mock packages
// ---------------------------------------------------------------------------
const PACKAGES: Record<StudioName, PackageItem[]> = {
  Reformee: [
    {
      id: "ref-1",
      name: "First Reform",
      price: 350,
      sessions: 1,
      validDays: 1,
      validClasses: ["Reformer Básico", "Reformer Intermedio"],
    },
    {
      id: "ref-10",
      name: "Reform Pack 10",
      price: 3000,
      sessions: 10,
      validDays: 30,
      validClasses: ["Reformer Básico", "Reformer Intermedio", "Reformer Avanzado", "Fuerza Total"],
    },
    {
      id: "ref-20",
      name: "Reform Pack 20",
      price: 5200,
      sessions: 20,
      validDays: 45,
      validClasses: ["Reformer Básico", "Reformer Intermedio", "Reformer Avanzado", "Fuerza Total"],
    },
    {
      id: "ref-u",
      name: "Reformee Unlimited",
      price: 4500,
      sessions: "unlimited",
      validDays: 30,
      validClasses: ["Reformer Básico", "Reformer Intermedio", "Reformer Avanzado", "Fuerza Total", "Stretch & Restore"],
    },
  ],
  "Raw Cycling": [
    {
      id: "raw-1",
      name: "First Ride",
      price: 250,
      sessions: 1,
      validDays: 1,
      validClasses: ["Ride Clásico", "Ride Beats"],
    },
    {
      id: "raw-10",
      name: "Ride Pack 10",
      price: 2000,
      sessions: 10,
      validDays: 30,
      validClasses: ["Ride Clásico", "Ride Beats", "Ride Endurance"],
    },
    {
      id: "raw-20",
      name: "Ride Pack 20",
      price: 3500,
      sessions: 20,
      validDays: 45,
      validClasses: ["Ride Clásico", "Ride Beats", "Ride Endurance", "Ride HIIT"],
    },
    {
      id: "raw-u",
      name: "Raw Unlimited",
      price: 3200,
      sessions: "unlimited",
      validDays: 30,
      validClasses: ["Ride Clásico", "Ride Beats", "Ride Endurance", "Ride HIIT"],
    },
  ],
  Hotflow: [
    {
      id: "hot-1",
      name: "Hello Hotties",
      price: 280,
      sessions: 1,
      validDays: 30,
      validClasses: ["Hot Yoga", "Vinyasa Flow"],
    },
    {
      id: "hot-10",
      name: "Hot Pack 10",
      price: 2400,
      sessions: 10,
      validDays: 30,
      validClasses: ["Hot Yoga", "Vinyasa Flow", "Early Flow"],
    },
    {
      id: "hot-20",
      name: "Hot Pack 20",
      price: 4200,
      sessions: 20,
      validDays: 45,
      validClasses: ["Hot Yoga", "Vinyasa Flow", "Early Flow", "Fuerza"],
    },
    {
      id: "hot-u",
      name: "Hotflow Unlimited",
      price: 3800,
      sessions: "unlimited",
      validDays: 30,
      validClasses: ["Hot Yoga", "Vinyasa Flow", "Early Flow", "Fuerza", "Fuerza Total"],
    },
  ],
};

const STUDIOS: StudioName[] = ["Reformee", "Raw Cycling", "Hotflow"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPrice(price: number) {
  const formatted = price.toLocaleString("es-MX");
  return { whole: formatted, cents: "00" };
}

function sessionLabel(sessions: number | "unlimited") {
  if (sessions === "unlimited") return "Ilimitadas";
  return `${sessions} sesión${sessions > 1 ? "es" : ""}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PaquetesPage() {
  const [selectedStudio, setSelectedStudio] = useState<StudioName>("Reformee");
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
  const [purchasedId, setPurchasedId] = useState<string | null>(null);

  const studioColor = STUDIO_COLORS[selectedStudio];
  const gradient = STUDIO_HERO_GRADIENT[selectedStudio];
  const info = STUDIO_INFO[selectedStudio];
  const packages = PACKAGES[selectedStudio];

  function handleBuy(pkgId: string) {
    setPurchasedId(pkgId);
    setTimeout(() => setPurchasedId(null), 3000);
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ---- Studio selector pills ---- */}
      <div className="flex justify-center gap-3 py-4 bg-white border-b">
        {STUDIOS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setSelectedStudio(s);
              setExpandedPackage(null);
              setPurchasedId(null);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              selectedStudio === s
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            )}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: STUDIO_COLORS[s] }}
            />
            {s}
          </button>
        ))}
      </div>

      {/* ---- Hero section ---- */}
      <div
        className={cn(
          "relative bg-gradient-to-br text-white px-6 pt-14 pb-20 text-center",
          gradient
        )}
      >
        <h1 className="text-3xl font-bold tracking-tight">{selectedStudio}</h1>
        <p className="mt-2 text-white/70 text-sm max-w-md mx-auto">
          {info.description}
        </p>
      </div>

      {/* ---- Logo + info ---- */}
      <div className="flex flex-col items-center -mt-10 relative z-10">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-white"
          style={{ backgroundColor: studioColor }}
        >
          {selectedStudio[0]}
        </div>
        <h2 className="mt-3 text-lg font-semibold text-neutral-900">
          {selectedStudio}
        </h2>
        <p className="flex items-center gap-1 text-sm text-neutral-500 mt-1">
          <MapPin className="w-3.5 h-3.5" />
          {info.address}
        </p>
      </div>

      {/* ---- Tabs row ---- */}
      <div className="flex justify-center gap-2 mt-6 px-4">
        <Link href="/app/reservar">
          <Badge
            variant="outline"
            className="px-4 py-1.5 text-sm cursor-pointer hover:bg-neutral-100"
          >
            Sesiones
          </Badge>
        </Link>
        <Badge
          className="px-4 py-1.5 text-sm text-white"
          style={{ backgroundColor: studioColor }}
        >
          Paquetes
        </Badge>
        <Badge
          variant="outline"
          className="px-4 py-1.5 text-sm cursor-pointer opacity-50"
        >
          Ubicación
        </Badge>
      </div>

      {/* ---- Package cards ---- */}
      <div className="max-w-lg mx-auto px-4 mt-8 pb-12 space-y-4">
        {packages.map((pkg) => {
          const { whole, cents } = formatPrice(pkg.price);
          const isExpanded = expandedPackage === pkg.id;
          const isPurchased = purchasedId === pkg.id;

          return (
            <Card key={pkg.id} className="overflow-hidden">
              <CardContent className="p-5">
                {/* Name */}
                <h3 className="text-lg font-bold text-neutral-900">
                  {pkg.name}
                </h3>

                {/* Price */}
                <p className="mt-1 text-3xl font-extrabold text-neutral-900">
                  ${whole}
                  <sup className="text-base font-semibold align-super ml-0.5">
                    {cents}
                  </sup>
                </p>

                {/* Divider */}
                <div className="my-4 border-t border-neutral-200" />

                {/* Checklist */}
                <ul className="space-y-2.5 text-sm text-neutral-700">
                  {/* Sessions */}
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: studioColor }}
                    />
                    {sessionLabel(pkg.sessions)}
                  </li>

                  {/* Valid classes */}
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: studioColor }}
                    />
                    <span>
                      Válido en {pkg.validClasses.slice(0, 2).join(", ")}
                      {pkg.validClasses.length > 2 && (
                        <>
                          {" "}
                          <button
                            onClick={() =>
                              setExpandedPackage(isExpanded ? null : pkg.id)
                            }
                            className="inline-flex items-center gap-0.5 text-xs font-medium underline underline-offset-2"
                            style={{ color: studioColor }}
                          >
                            Ver detalles
                            <ChevronDown
                              className={cn(
                                "w-3 h-3 transition-transform",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </button>
                        </>
                      )}
                    </span>
                  </li>

                  {/* Expanded class list */}
                  {isExpanded && pkg.validClasses.length > 2 && (
                    <li className="ml-6 text-xs text-neutral-500">
                      {pkg.validClasses.join(", ")}
                    </li>
                  )}

                  {/* Validity */}
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: studioColor }}
                    />
                    Vigencia {pkg.validDays} día{pkg.validDays > 1 ? "s" : ""}
                  </li>
                </ul>

                {/* Buy button */}
                <Button
                  className="w-full mt-5 text-white"
                  style={{ backgroundColor: studioColor }}
                  onClick={() => handleBuy(pkg.id)}
                >
                  {isPurchased ? "Próximamente — Pago con Stripe" : "Comprar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
