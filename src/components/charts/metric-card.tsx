import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { type LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

export function MetricCard({ title, value, change, icon: Icon, iconColor = "text-primary-600", iconBg = "bg-primary-100" }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">{title}</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1">{value}</p>
            {change !== undefined && (
              <div className={cn("flex items-center gap-1 text-sm mt-1", change >= 0 ? "text-primary-600" : "text-accent-rose")}>
                {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{change >= 0 ? "+" : ""}{change}%</span>
                <span className="text-neutral-400">vs mes anterior</span>
              </div>
            )}
          </div>
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", iconBg)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
