"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Package,
  Users,
  UserCog,
  Building2,
  Megaphone,
  ShoppingBag,
  Lightbulb,
  Settings,
  TrendingUp,
  Activity,
  DollarSign,
  Clock,
  Gift,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { hasPermission, type Permission } from "@/lib/permissions";
import { type Role } from "@prisma/client";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const allNavGroups: NavGroup[] = [
  {
    label: "Dashboard",
    items: [
      { name: "Resumen", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
      { name: "Insights IA", href: "/dashboard/insights", icon: Lightbulb, permission: "insights:view" },
      { name: "Operaciones", href: "/dashboard/operaciones", icon: Activity, permission: "dashboard:view" },
      { name: "Marketing", href: "/dashboard/marketing", icon: TrendingUp, permission: "dashboard:view" },
    ],
  },
  {
    label: "Administrar",
    items: [
      { name: "Clases", href: "/clases", icon: Calendar, permission: "classes:manage" },
      { name: "Horarios", href: "/horarios", icon: CalendarDays, permission: "classes:manage" },
      { name: "Paquetes", href: "/paquetes", icon: Package, permission: "packages:manage" },
      { name: "Equipo", href: "/equipo", icon: UserCog, permission: "staff:manage" },
      { name: "Compensación", href: "/compensacion", icon: DollarSign, permission: "compensation:view_all" },
      { name: "Sucursales", href: "/espacios", icon: Building2, permission: "locations:manage" },
      { name: "Usuarios", href: "/usuarios", icon: Users, permission: "users:view" },
      { name: "Check-in", href: "/checkin", icon: UserCheck, permission: "users:checkin" },
      { name: "CRM", href: "/crm", icon: Megaphone, permission: "crm:manage" },
      { name: "Punto de Venta", href: "/pos", icon: ShoppingBag, permission: "pos:manage" },
    ],
  },
  {
    label: "Coach",
    items: [
      { name: "Compensación", href: "/coach/compensacion", icon: DollarSign, permission: "compensation:view_own" },
      { name: "Disponibilidad", href: "/coach/disponibilidad", icon: Clock, permission: "availability:manage_own" },
      { name: "Referidos", href: "/coach/referidos", icon: Gift, permission: "referrals:view_own" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = (session?.user as any)?.role as Role | undefined;

  // Filter nav groups based on user's role permissions
  const filteredGroups = allNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || (role && hasPermission(role, item.permission))
      ),
    }))
    .filter((group) => group.items.length > 0);

  // Show settings link only for users with settings:manage
  const showSettings = role && hasPermission(role, "settings:manage");

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
          {filteredGroups.map((group) => (
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

      {showSettings && (
        <div className="p-4 border-t border-neutral-800">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-text hover:bg-white/5 hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4" />
            Configuración
          </Link>
        </div>
      )}
    </aside>
  );
}
