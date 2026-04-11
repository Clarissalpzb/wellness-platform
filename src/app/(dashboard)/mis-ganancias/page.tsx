"use client";

import { useState, useEffect } from "react";
import {
  DollarSign, Users, Clock, TrendingUp, Gift, Loader2, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface BenefitsData {
  freeClasses: { used: number; total: number; remaining: number };
  referrals: { total: number; rewarded: number; pending: number };
  hourlyRate: number | null;
}

const WORK_HOURS_PER_MONTH = 160; // default assumption: 40 hrs/week

export default function MisGananciasPage() {
  const [data, setData] = useState<BenefitsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/staff/benefits")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d.data ?? d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const hourlyRate = data?.hourlyRate ?? null;
  const estimatedMonthly = hourlyRate ? hourlyRate * WORK_HOURS_PER_MONTH : null;
  const month = new Date().toLocaleString("es-MX", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mis Ganancias</h1>
        <p className="text-sm text-neutral-500 capitalize">{month}</p>
      </div>

      {/* Wage section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            Compensación por trabajo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hourlyRate ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                  <p className="text-xs text-green-700 mb-1">Tarifa por hora</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${hourlyRate.toLocaleString()}
                    <span className="text-sm font-normal text-green-600 ml-1">MXN</span>
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                  <p className="text-xs text-neutral-500 mb-1">Estimado mensual</p>
                  <p className="text-2xl font-bold text-neutral-900">
                    ${estimatedMonthly?.toLocaleString()}
                    <span className="text-sm font-normal text-neutral-400 ml-1">MXN</span>
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">Basado en {WORK_HOURS_PER_MONTH} hrs/mes</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                El estimado es referencial. Tu pago real lo define la administración del estudio.
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
              <p className="text-sm text-neutral-500">Tu tarifa aún no ha sido configurada.</p>
              <p className="text-xs text-neutral-400 mt-1">Habla con el administrador del estudio.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral earnings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-purple-500" />
              Ganancias por referidos
            </CardTitle>
            <Link href="/referidos">
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-neutral-50">
                Ver historial →
              </Badge>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <Users className="h-4 w-4 mx-auto mb-1 text-neutral-500" />
              <p className="text-xl font-bold text-neutral-900">{data?.referrals.total ?? 0}</p>
              <p className="text-xs text-neutral-500">Total referidos</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-green-50 border border-green-100">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <p className="text-xl font-bold text-neutral-900">{data?.referrals.rewarded ?? 0}</p>
              <p className="text-xs text-neutral-500">Completados</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-50 border border-amber-100">
              <Clock className="h-4 w-4 mx-auto mb-1 text-amber-500" />
              <p className="text-xl font-bold text-neutral-900">{data?.referrals.pending ?? 0}</p>
              <p className="text-xs text-neutral-500">Pendientes</p>
            </div>
          </div>
          <p className="text-xs text-neutral-400 text-center mt-3">
            Cada referido completado puede tener un bono según las reglas de tu estudio.
          </p>
        </CardContent>
      </Card>

      {/* Class perk summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary-500" />
            Beneficio de clases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-700">
                Clases gratuitas usadas este mes
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">4 clases/mes incluidas en tu posición</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-neutral-900">
                {data?.freeClasses.used ?? 0}
                <span className="text-base font-normal text-neutral-400">/4</span>
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-400 transition-all"
              style={{ width: `${Math.min(((data?.freeClasses.used ?? 0) / 4) * 100, 100)}%` }}
            />
          </div>
          <div className="mt-3 text-right">
            <Link href="/mis-beneficios">
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-neutral-50">
                Reservar clase →
              </Badge>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
