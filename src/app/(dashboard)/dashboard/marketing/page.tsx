import { Users, UserPlus, TrendingUp, Mail } from "lucide-react";
import { MetricCard } from "@/components/charts/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const recentCampaigns: any[] = [];

const demographics: any[] = [];

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Marketing</h1>
        <p className="text-sm text-neutral-500">Métricas de adquisición y retención</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Nuevos Registros" value="0" icon={UserPlus} />
        <MetricCard title="Tasa Conversión" value="0%" icon={TrendingUp} iconColor="text-accent-blue" iconBg="bg-accent-blue-light" />
        <MetricCard title="Emails Enviados" value="0" icon={Mail} iconColor="text-accent-amber" iconBg="bg-accent-amber-light" />
        <MetricCard title="Referidos" value="0" icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campañas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <p>No hay datos disponibles</p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demografía</CardTitle>
          </CardHeader>
          <CardContent>
            {demographics.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <p>No hay datos disponibles</p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
