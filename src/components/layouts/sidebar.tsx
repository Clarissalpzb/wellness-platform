"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Package,
  Users,
  UserCog,
  Building2,
  BarChart3,
  Megaphone,
  ShoppingBag,
  Lightbulb,
  Settings,
  TrendingUp,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const ownerNav = [
  {
    label: "Dashboard",
    items: [
      { name: "Resumen", href: "/dashboard", icon: LayoutDashboard },
      { name: "Insights IA", href: "/dashboard/insights", icon: Lightbulb },
      { name: "Operaciones", href: "/dashboard/operaciones", icon: Activity },
      { name: "Marketing", href: "/dashboard/marketing", icon: TrendingUp },
    ],
  },
  {
    label: "Administrar",
    items: [
      { name: "Clases", href: "/clases", icon: Calendar },
      { name: "Paquetes", href: "/paquetes", icon: Package },
      { name: "Equipo", href: "/equipo", icon: UserCog },
      { name: "Espacios", href: "/espacios", icon: Building2 },
      { name: "Usuarios", href: "/usuarios", icon: Users },
      { name: "CRM", href: "/crm", icon: Megaphone },
      { name: "Punto de Venta", href: "/pos", icon: ShoppingBag },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-sidebar-bg text-sidebar-text border-r border-neutral-800">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-neutral-800">
        <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <span className="text-white font-semibold text-lg">Athletica</span>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-6 px-3">
          {ownerNav.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          isActive
                            ? "bg-primary-500/10 text-sidebar-active font-medium"
                            : "text-sidebar-text hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-neutral-800">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-text hover:bg-white/5 hover:text-white transition-colors"
        >
          <Settings className="h-4 w-4" />
          Configuración
        </Link>
      </div>
    </aside>
  );
}
