"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Gift, Users, Clock, UserPlus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  rewarded: number;
  pending: number;
  referrals: {
    id: string;
    name: string;
    joinedAt: string;
    completed: boolean;
    rewarded: boolean;
  }[];
}

export default function ReferidosPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) setData(d.data ?? d);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleCopy() {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mis Referidos</h1>
        <p className="text-sm text-neutral-500">
          Comparte tu enlace y lleva más clientes al estudio
        </p>
      </div>

      {/* Referral link card */}
      <Card className="border-primary-200 bg-gradient-to-br from-primary-50 to-white">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
              <Gift className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-neutral-900">Tu enlace personal</p>
              <p className="text-sm text-neutral-500">
                Cuando alguien se registre con tu enlace, quedarás registrado como quien los refirió.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-white border border-neutral-200">
            <p className="flex-1 text-sm text-neutral-700 font-mono truncate">
              {data?.referralLink || "Cargando..."}
            </p>
            <Button size="sm" onClick={handleCopy} disabled={!data?.referralLink}>
              {copied ? (
                <><Check className="h-4 w-4 mr-1" /> Copiado</>
              ) : (
                <><Copy className="h-4 w-4 mr-1" /> Copiar</>
              )}
            </Button>
          </div>

          {data?.referralCode && (
            <p className="text-xs text-neutral-400 text-center">
              Código: <span className="font-mono font-medium text-neutral-600">{data.referralCode}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary-500" />
            <p className="text-2xl font-bold text-neutral-900">{data?.totalReferrals ?? 0}</p>
            <p className="text-xs text-neutral-500">Total referidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <Check className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold text-neutral-900">{data?.rewarded ?? 0}</p>
            <p className="text-xs text-neutral-500">Completados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold text-neutral-900">{data?.pending ?? 0}</p>
            <p className="text-xs text-neutral-500">Pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Clientes referidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.referrals?.length ? (
            <p className="text-sm text-neutral-400 text-center py-6">
              Aún no has referido a nadie. ¡Comparte tu enlace!
            </p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {data.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{r.name}</p>
                    <p className="text-xs text-neutral-400">
                      Se unió el {new Date(r.joinedAt).toLocaleDateString("es-MX", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={r.rewarded ? "default" : "secondary"}
                    className={r.rewarded ? "bg-green-100 text-green-700" : ""}
                  >
                    {r.rewarded ? "Completado" : "Pendiente"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
