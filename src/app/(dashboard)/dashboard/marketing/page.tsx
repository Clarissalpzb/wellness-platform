import { Users, UserPlus, TrendingUp, Mail } from "lucide-react";
import { MetricCard } from "@/components/charts/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const recentCampaigns = [
  { name: "Bienvenida Enero", sent: 150, opened: 95, rate: "63%", status: "success" },
  { name: "Recordatorio Paquete", sent: 45, opened: 38, rate: "84%", status: "success" },
  { name: "Promo San Valentín", sent: 0, opened: 0, rate: "-", status: "draft" },
];

const demographics = [
  { label: "18-25 años", percentage: 22 },
  { label: "26-35 años", percentage: 38 },
  { label: "36-45 años", percentage: 25 },
  { label: "46+ años", percentage: 15 },
];

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Marketing</h1>
        <p className="text-sm text-neutral-500">Métricas de adquisición y retención</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Nuevos Registros" value="28" change={15} icon={UserPlus} />
        <MetricCard title="Tasa Conversión" value="12%" change={3.2} icon={TrendingUp} iconColor="text-accent-blue" iconBg="bg-accent-blue-light" />
        <MetricCard title="Emails Enviados" value="195" icon={Mail} iconColor="text-accent-amber" iconBg="bg-accent-amber-light" />
        <MetricCard title="Referidos" value="8" change={25} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campañas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCampaigns.map((campaign) => (
                <div key={campaign.name} className="flex items-center justify-between p-3 rounded-lg border border-neutral-100">
                  <div>
                    <p className="text-sm font-medium">{campaign.name}</p>
                    <p className="text-xs text-neutral-500">{campaign.sent > 0 ? `${campaign.sent} enviados` : "Borrador"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{campaign.rate}</p>
                    <p className="text-xs text-neutral-500">Tasa apertura</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demografía</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demographics.map((demo) => (
                <div key={demo.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-600">{demo.label}</span>
                    <span className="font-medium">{demo.percentage}%</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${demo.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
