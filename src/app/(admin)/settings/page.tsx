"use client";

import { useState, useEffect } from "react";
import { Building2, Save, ShieldX, Clock, Info, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  settings: Record<string, unknown>;
  monthlyOperatingCost: number;
}

interface CancelFeeSettings {
  enabled: boolean;
  defaultAmount: number;
  windowHours: number;
}

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingFee, setSavingFee] = useState(false);
  const [name, setName] = useState("");
  const [monthlyOperatingCost, setMonthlyOperatingCost] = useState(0);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cancellation fee settings
  const [feeEnabled, setFeeEnabled] = useState(false);
  const [feeAmount, setFeeAmount] = useState(0);
  const [feeWindowHours, setFeeWindowHours] = useState(12);
  const [feeSuccess, setFeeSuccess] = useState(false);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch("/api/organization");
        if (res.ok) {
          const data = await res.json();
          setOrg(data);
          setName(data.name);
          setMonthlyOperatingCost(data.monthlyOperatingCost ?? 0);
          const cf = data.settings?.cancellationFee as CancelFeeSettings | undefined;
          if (cf) {
            setFeeEnabled(cf.enabled ?? false);
            setFeeAmount(cf.defaultAmount ?? 0);
            setFeeWindowHours(cf.windowHours ?? 12);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, monthlyOperatingCost }),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrg(updated);
        setSuccessMsg("Cambios guardados correctamente");
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || "Error al guardar los cambios");
      }
    } catch {
      setErrorMsg("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleFeeSave = async () => {
    setSavingFee(true);
    setFeeSuccess(false);
    try {
      const res = await fetch("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: org?.name ?? name,
          settings: {
            cancellationFee: {
              enabled: feeEnabled,
              defaultAmount: feeAmount,
              windowHours: feeWindowHours,
            },
          },
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrg(updated);
        setFeeSuccess(true);
        setTimeout(() => setFeeSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingFee(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Configuración</h1>
        <p className="text-sm text-neutral-500">Ajustes de tu organización</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Organización</CardTitle>
              <CardDescription>Datos generales de tu centro</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {errorMsg && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                {successMsg}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="orgName">Nombre de la organización</Label>
              <Input
                id="orgName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mi Centro"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgSlug">Slug (URL)</Label>
              <Input
                id="orgSlug"
                value={org?.slug || ""}
                disabled
                className="bg-neutral-50"
              />
              <p className="text-xs text-neutral-400">El slug no puede modificarse</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyOperatingCost">Costo Mensual de Operación ($MXN)</Label>
              <Input
                id="monthlyOperatingCost"
                type="number"
                min="0"
                step="100"
                value={monthlyOperatingCost}
                onChange={(e) => setMonthlyOperatingCost(Number(e.target.value))}
                placeholder="0"
              />
              <p className="text-xs text-neutral-400">Se usa para calcular el punto de equilibrio en el dashboard</p>
            </div>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Cancellation fee card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
              <ShieldX className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Política de Cancelaciones</CardTitle>
              <CardDescription>
                Cobra un fee cuando un cliente cancela tarde. Reduce las sillas vacías y
                los ingresos perdidos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Context callout */}
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>¿Para qué sirve esto?</strong> En muchos estudios el 30-40% de las reservas se
              cancelan, dejando lugares vacíos que ya no se pueden llenar. Un cargo por cancelación
              incentiva a los clientes a ser más responsables o a avisar con tiempo para que otro
              cliente pueda tomar su lugar.
            </p>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
            <div>
              <p className="text-sm font-medium text-neutral-900">Activar cargo por cancelación</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Se aplica cuando un cliente cancela dentro de la ventana de tiempo configurada
              </p>
            </div>
            <Switch checked={feeEnabled} onCheckedChange={setFeeEnabled} />
          </div>

          {feeEnabled && (
            <div className="space-y-4 pl-1">
              {/* Default amount */}
              <div className="space-y-2">
                <Label htmlFor="feeAmount" className="flex items-center gap-1.5">
                  <ShieldX className="h-3.5 w-3.5 text-neutral-500" />
                  Monto del cargo predeterminado
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-500">$</span>
                  <Input
                    id="feeAmount"
                    type="number"
                    min="0"
                    step="10"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(Number(e.target.value))}
                    className="max-w-36"
                    placeholder="50"
                  />
                  <span className="text-sm text-neutral-500">MXN</span>
                </div>
                <p className="text-xs text-neutral-400">
                  Tip: Un cargo de $50–$100 MXN reduce las cancelaciones sin alejar a los clientes.
                  Puedes personalizar el monto por paquete.
                </p>
              </div>

              {/* Window hours */}
              <div className="space-y-2">
                <Label htmlFor="feeWindow" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-neutral-500" />
                  Ventana de cancelación (horas)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="feeWindow"
                    type="number"
                    min="1"
                    max="72"
                    value={feeWindowHours}
                    onChange={(e) => setFeeWindowHours(Number(e.target.value))}
                    className="max-w-24"
                  />
                  <span className="text-sm text-neutral-500">horas antes de la clase</span>
                </div>
                <p className="text-xs text-neutral-400">
                  Si un cliente cancela con menos de {feeWindowHours} hora{feeWindowHours !== 1 ? "s" : ""} de anticipación, se aplica el cargo.
                  Lo más común es 12 o 24 horas.
                </p>
              </div>

              {/* Per-package note */}
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 p-3">
                <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>Paquetes exentos:</strong> Puedes marcar paquetes específicos como "sin cargo de cancelación"
                  desde <span className="font-semibold">Paquetes → Editar paquete</span>. Úsalo como un beneficio exclusivo
                  para tus membresías premium — los clientes pagarán más por esa tranquilidad.
                </p>
              </div>
            </div>
          )}

          {feeSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" />
              Política de cancelación guardada
            </div>
          )}

          <Button onClick={handleFeeSave} disabled={savingFee} variant="outline">
            <Save className="mr-2 h-4 w-4" />
            {savingFee ? "Guardando..." : "Guardar política"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
