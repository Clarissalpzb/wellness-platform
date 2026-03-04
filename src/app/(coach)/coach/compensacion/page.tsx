"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DollarSign, Calendar, TrendingUp, Download, Users, Copy, Check, Share2, Gift, UserPlus, Award, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/charts/metric-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReferralData {
  referralCode: string | null;
  referrals: {
    id: string;
    name: string;
    signupDate: string;
    classesAttended: number;
    status: string;
    bonusEarned: number;
    completedAt: string | null;
  }[];
  totalReferrals: number;
  activeReferrals: number;
  totalBonus: number;
}

const compensationHistory: any[] = [];
const classBreakdown: any[] = [];
const coachCompensation: any[] = [];

export default function CompensacionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <CompensacionContent />
    </Suspense>
  );
}

function CompensacionContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "referidos" ? "referidos" : "mi-compensacion";

  const [copied, setCopied] = useState(false);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);

  const fetchReferrals = useCallback(async () => {
    try {
      const res = await fetch("/api/coach/referrals");
      if (res.ok) {
        const data = await res.json();
        setReferralData(data);
      }
    } finally {
      setLoadingReferrals(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await fetch("/api/coach/referral-code", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setReferralData((prev) =>
          prev ? { ...prev, referralCode: data.referralCode } : prev
        );
      }
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopy = () => {
    if (referralData?.referralCode) {
      navigator.clipboard.writeText(referralData.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sortedCoaches = [...coachCompensation].sort((a, b) => b.totalEarnings - a.totalEarnings);

  const totalReferrals = referralData?.totalReferrals ?? 0;
  const activeReferrals = referralData?.activeReferrals ?? 0;
  const totalReferralBonus = referralData?.totalBonus ?? 0;
  const referralHistory = referralData?.referrals ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Compensación</h1>
          <p className="text-sm text-neutral-500">Detalle de tus ganancias</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard title="Ganancia Mes" value="$0" icon={DollarSign} iconColor="text-primary-600" iconBg="bg-primary-100" />
        <MetricCard title="Clases Impartidas" value="0" icon={Calendar} iconColor="text-accent-blue" iconBg="bg-accent-blue-light" />
        <MetricCard title="Promedio por Clase" value="$0" icon={TrendingUp} iconColor="text-accent-amber" iconBg="bg-accent-amber-light" />
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="mi-compensacion">Mi Compensación</TabsTrigger>
          <TabsTrigger value="por-coach">Por Coach</TabsTrigger>
          <TabsTrigger value="referidos">Referidos</TabsTrigger>
        </TabsList>

        {/* Tab: Mi Compensación */}
        <TabsContent value="mi-compensacion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Desglose por Clase</CardTitle>
            </CardHeader>
            <CardContent>
              {classBreakdown.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <p>No hay datos disponibles</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clase</TableHead>
                      <TableHead>Sesiones</TableHead>
                      <TableHead>Prom. Alumnos</TableHead>
                      <TableHead>Base/Clase</TableHead>
                      <TableHead>Bonus</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classBreakdown.map((cls) => (
                      <TableRow key={cls.name}>
                        <TableCell className="font-medium">{cls.name}</TableCell>
                        <TableCell>{cls.sessions}</TableCell>
                        <TableCell>{cls.avgAttendees}</TableCell>
                        <TableCell>${cls.perClass}</TableCell>
                        <TableCell>{cls.bonus > 0 ? `+$${cls.bonus}` : "-"}</TableCell>
                        <TableCell className="text-right font-bold">${cls.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              {compensationHistory.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <p>No hay datos disponibles</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Clases</TableHead>
                      <TableHead>Alumnos</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compensationHistory.map((period) => (
                      <TableRow key={period.period}>
                        <TableCell className="font-medium">{period.period}</TableCell>
                        <TableCell>{period.classes}</TableCell>
                        <TableCell>{period.totalStudents}</TableCell>
                        <TableCell className="font-bold">${period.earnings.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={period.status === "paid" ? "success" : "warning"}>
                            {period.status === "paid" ? "Pagado" : "Pendiente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Por Coach */}
        <TabsContent value="por-coach" className="space-y-6">
          {sortedCoaches.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No hay datos disponibles</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedCoaches.map((coach) => (
                  <Card key={coach.name} className={coach.isCurrentCoach ? "ring-2 ring-primary-500" : ""}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="text-base">{coach.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-neutral-900">{coach.name}</p>
                            {coach.isCurrentCoach && (
                              <Badge variant="default" className="text-xs">Tú</Badge>
                            )}
                          </div>
                          <Badge variant="secondary" className="mt-1">{coach.specialty}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-neutral-100">
                        <div className="text-center">
                          <p className="text-lg font-bold text-neutral-900">${coach.totalEarnings.toLocaleString()}</p>
                          <p className="text-xs text-neutral-500">Total</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-neutral-900">{coach.totalClasses}</p>
                          <p className="text-xs text-neutral-500">Clases</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-neutral-900">${coach.avgPerClass}</p>
                          <p className="text-xs text-neutral-500">Prom/Clase</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Comparación Detallada</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Coach</TableHead>
                        <TableHead>Especialidad</TableHead>
                        <TableHead>Clases</TableHead>
                        <TableHead>Alumnos</TableHead>
                        <TableHead>Prom/Clase</TableHead>
                        <TableHead>Bonus</TableHead>
                        <TableHead>Referidos</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedCoaches.map((coach) => (
                        <TableRow key={coach.name} className={coach.isCurrentCoach ? "bg-primary-50" : ""}>
                          <TableCell className="font-medium">{coach.name}</TableCell>
                          <TableCell>{coach.specialty}</TableCell>
                          <TableCell>{coach.totalClasses}</TableCell>
                          <TableCell>{coach.totalStudents}</TableCell>
                          <TableCell>${coach.avgPerClass}</TableCell>
                          <TableCell>${coach.bonus}</TableCell>
                          <TableCell>{coach.referrals}</TableCell>
                          <TableCell className="text-right font-bold">${coach.totalEarnings.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab: Referidos */}
        <TabsContent value="referidos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary-600" />
                Tu Código de Referido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500 mb-4">
                Comparte tu código con nuevos usuarios. Recibirás un bonus por cada referido que se registre y tome clases.
              </p>
              {loadingReferrals ? (
                <div className="flex items-center gap-2 text-neutral-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando...
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={referralData?.referralCode || ""}
                    className="font-mono text-base font-semibold max-w-xs"
                    placeholder="Sin código asignado"
                  />
                  {referralData?.referralCode ? (
                    <>
                      <Button variant="outline" onClick={handleCopy}>
                        {copied ? (
                          <>
                            <Check className="mr-2 h-4 w-4 text-primary-600" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar
                          </>
                        )}
                      </Button>
                      <Button variant="outline">
                        <Share2 className="mr-2 h-4 w-4" />
                        Compartir
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleGenerateCode} disabled={generatingCode}>
                      {generatingCode ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Gift className="mr-2 h-4 w-4" />
                      )}
                      Generar Código
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard title="Total Referidos" value={String(totalReferrals)} icon={UserPlus} iconColor="text-primary-600" iconBg="bg-primary-100" />
            <MetricCard title="Referidos Activos" value={String(activeReferrals)} icon={Users} iconColor="text-accent-blue" iconBg="bg-accent-blue-light" />
            <MetricCard title="Bonus por Referidos" value={`$${totalReferralBonus}`} icon={Award} iconColor="text-accent-amber" iconBg="bg-accent-amber-light" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Referidos</CardTitle>
            </CardHeader>
            <CardContent>
              {referralHistory.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <p>No hay referidos aún</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Fecha Registro</TableHead>
                      <TableHead>Clases Tomadas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Bonus Ganado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referralHistory.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell className="font-medium">{referral.name}</TableCell>
                        <TableCell>{new Date(referral.signupDate).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                        <TableCell>{referral.classesAttended}</TableCell>
                        <TableCell>
                          <Badge
                            variant={referral.status === "active" ? "success" : "warning"}
                          >
                            {referral.status === "active" ? "Activo" : "Pendiente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">${referral.bonusEarned}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
