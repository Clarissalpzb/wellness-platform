import { DollarSign, Users, Calendar, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/charts/metric-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { BookingsPieChart } from "@/components/charts/bookings-pie-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const topPackages = [
  { name: "Membresía Mensual", sold: 85, revenue: 127500 },
  { name: "Paquete 10 Clases", sold: 62, revenue: 124000 },
  { name: "Paquete 20 Clases", sold: 34, revenue: 119000 },
  { name: "Pase Individual", sold: 120, revenue: 30000 },
];

const newCustomers = [
  { name: "Sofía Hernández", date: "Hoy", package: "Membresía Mensual" },
  { name: "Diego Torres", date: "Hoy", package: "Paquete 10" },
  { name: "Valentina Ruiz", date: "Ayer", package: "Pase Individual" },
  { name: "Mateo Flores", date: "Ayer", package: "Membresía Trimestral" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">Resumen general de tu centro</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Ingresos del Mes" value="$115,000" change={12.5} icon={DollarSign} />
        <MetricCard title="Clientes Activos" value="342" change={8.3} icon={Users} iconColor="text-accent-blue" iconBg="bg-accent-blue-light" />
        <MetricCard title="Reservas Hoy" value="47" change={-3.2} icon={Calendar} iconColor="text-accent-amber" iconBg="bg-accent-amber-light" />
        <MetricCard title="Tasa Retención" value="78%" change={2.1} icon={TrendingUp} />
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nuevos Clientes</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
