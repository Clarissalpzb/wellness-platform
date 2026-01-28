"use client";

import { useState, useEffect } from "react";
import { Search, Filter, MoreHorizontal, Eye, Mail, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusLabels: Record<string, string> = {
  active: "Activo",
  at_risk: "En riesgo",
  churned: "Perdido",
};

const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
  active: "success",
  at_risk: "warning",
  churned: "destructive",
};

function deriveStatus(user: any): string {
  // Has active package
  const hasActivePackage =
    user.userPackages &&
    user.userPackages.length > 0 &&
    user.userPackages.some((up: any) => up.status === "ACTIVE");
  if (hasActivePackage) return "active";

  // No active package but has bookings
  const bookingsCount = user._count?.bookings ?? 0;
  if (bookingsCount > 0) return "at_risk";

  return "churned";
}

function getActivePackageName(user: any): string | null {
  if (user.userPackages && user.userPackages.length > 0) {
    return user.userPackages[0]?.package?.name || null;
  }
  return null;
}

const mockUsers = [
  { id: "1", firstName: "Sofía", lastName: "Hernández", email: "sofia@email.com", phone: "+52 55 1111 2222", avatar: null, isActive: true, userPackages: [{ package: { name: "Membresía Mensual" }, status: "ACTIVE" }], _count: { bookings: 24 } },
  { id: "2", firstName: "Diego", lastName: "Torres", email: "diego@email.com", phone: "+52 55 3333 4444", avatar: null, isActive: true, userPackages: [{ package: { name: "Paquete 10" }, status: "ACTIVE" }], _count: { bookings: 8 } },
  { id: "3", firstName: "Valentina", lastName: "Ruiz", email: "vale@email.com", phone: "+52 55 5555 6666", avatar: null, isActive: true, userPackages: [], _count: { bookings: 15 } },
  { id: "4", firstName: "Mateo", lastName: "Flores", email: "mateo@email.com", phone: "+52 55 7777 8888", avatar: null, isActive: true, userPackages: [{ package: { name: "Membresía Trimestral" }, status: "ACTIVE" }], _count: { bookings: 42 } },
  { id: "5", firstName: "Isabella", lastName: "Morales", email: "isa@email.com", phone: "+52 55 9999 0000", avatar: null, isActive: false, userPackages: [], _count: { bookings: 3 } },
];

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const json = await res.json();
        setUsers(json.length > 0 ? json : mockUsers);
      } else {
        setUsers(mockUsers);
      }
    } catch (e) {
      console.error(e);
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = users.filter(
    (u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Usuarios</h1>
          <p className="text-sm text-neutral-500">{users.length} clientes registrados</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {users.length === 0 && !loading && (
        <div className="text-center py-12 text-neutral-500">
          <p>No hay usuarios aún</p>
        </div>
      )}

      {users.length > 0 && (
        <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Paquete Activo</TableHead>
                <TableHead>Reservas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const status = deriveStatus(user);
                const activePackage = getActivePackageName(user);
                const bookingsCount = user._count?.bookings ?? 0;

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || ""} />
                          <AvatarFallback className="text-xs">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-neutral-500">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {activePackage ? (
                        <span className="text-sm">{activePackage}</span>
                      ) : (
                        <span className="text-sm text-neutral-400">Sin paquete</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{bookingsCount}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[status]}>
                        {statusLabels[status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" /> Ver Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Package className="mr-2 h-4 w-4" /> Asignar Paquete
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" /> Enviar Mensaje
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
