import { DollarSign, Calendar, TrendingUp, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/charts/metric-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const compensationHistory = [
  { period: "Enero 2026", classes: 24, totalStudents: 380, earnings: 18500, status: "pending" },
  { period: "Diciembre 2025", classes: 22, totalStudents: 340, earnings: 17000, status: "paid" },
  { period: "Noviembre 2025", classes: 25, totalStudents: 395, earnings: 19200, status: "paid" },
  { period: "Octubre 2025", classes: 20, totalStudents: 310, earnings: 15500, status: "paid" },
];

const classBreakdown = [
  { name: "Yoga Flow (AM)", sessions: 12, avgAttendees: 18, perClass: 500, bonus: 200, total: 8400 },
  { name: "Yoga Flow (PM)", sessions: 8, avgAttendees: 20, perClass: 500, bonus: 300, total: 6400 },
  { name: "Pilates Mat", sessions: 4, avgAttendees: 10, perClass: 450, bonus: 0, total: 1800 },
];

export default function CompensacionPage() {
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
        <MetricCard title="Ganancia Enero" value="$18,500" change={8.8} icon={DollarSign} iconColor="text-primary-600" iconBg="bg-primary-100" />
        <MetricCard title="Clases Impartidas" value="24" icon={Calendar} iconColor="text-accent-blue" iconBg="bg-accent-blue-light" />
        <MetricCard title="Promedio por Clase" value="$771" change={5.2} icon={TrendingUp} iconColor="text-accent-amber" iconBg="bg-accent-amber-light" />
      </div>

      {/* Class breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Desglose por Clase - Enero 2026</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
