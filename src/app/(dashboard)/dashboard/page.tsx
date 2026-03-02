import { DollarSign, Users, Calendar, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/charts/metric-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { BookingsPieChart } from "@/components/charts/bookings-pie-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const topPackages: any[] = [];

const newCustomers: any[] = [];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">Resumen general de tu centro</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Ingresos del Mes" value="$0" icon={DollarSign} />
        <MetricCard title="Clientes Activos" value="0" icon={Users} iconColor="text-accent-blue" iconBg="bg-accent-blue-light" />
        <MetricCard title="Reservas Hoy" value="0" icon={Calendar} iconColor="text-accent-amber" iconBg="bg-accent-amber-light" />
        <MetricCard title="Tasa Retención" value="0%" icon={TrendingUp} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <BookingsPieChart />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Paquetes</CardTitle>
          </CardHeader>
          <CardContent>
            {topPackages.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <p>No hay datos disponibles</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topPackages.map((pkg, i) => (
                  <div key={pkg.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-neutral-400 w-6">{i + 1}</span>
                      <span className="text-sm font-medium">{pkg.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">${pkg.revenue.toLocaleString()}</p>
                      <p className="text-xs text-neutral-500">{pkg.sold} vendidos</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nuevos Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {newCustomers.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <p>No hay datos disponibles</p>
              </div>
            ) : (
              <div className="space-y-4">
                {newCustomers.map((customer) => (
                  <div key={customer.name} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-neutral-500">{customer.date}</p>
                    </div>
                    <Badge variant="outline">{customer.package}</Badge>
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
