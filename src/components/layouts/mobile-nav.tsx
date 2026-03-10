"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Calendar, User, BarChart3, Package, Users, Clock, DollarSign, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { name: "Inicio", href: "/dashboard", icon: Home },
  { name: "Clases", href: "/clases", icon: Calendar },
  { name: "Métricas", href: "/dashboard/operaciones", icon: BarChart3 },
  { name: "Perfil", href: "/app/perfil", icon: User },
];

const coachNavItems = [
  { name: "Disponibilidad", href: "/coach/disponibilidad", icon: Clock },
  { name: "Compensación", href: "/coach/compensacion", icon: DollarSign },
  { name: "Referidos", href: "/coach/referidos", icon: Gift },
  { name: "Perfil", href: "/app/perfil", icon: User },
];

const clientNavItems = [
  { name: "Inicio", href: "/app/reservar", icon: Home },
  { name: "Reservas", href: "/app/mis-reservas", icon: Calendar },
  { name: "Paquetes", href: "/app/paquetes", icon: Package },
  { name: "Amigos", href: "/app/amigos", icon: Users },
  { name: "Perfil", href: "/app/perfil", icon: User },
];

const ADMIN_ROLES = ["OWNER", "ADMIN", "HEAD_COACH"];
const COACH_ROLES = ["COACH"];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = (session?.user as any)?.role as string | undefined;

  let mobileNavItems;
  if (role && ADMIN_ROLES.includes(role)) {
    mobileNavItems = adminNavItems;
  } else if (role && COACH_ROLES.includes(role)) {
    mobileNavItems = coachNavItems;
  } else {
    mobileNavItems = clientNavItems;
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 px-2 pb-safe">
      <div className="flex items-center justify-around py-2">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs transition-colors",
                isActive ? "text-primary-600 font-medium" : "text-neutral-500"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary-500")} />
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
