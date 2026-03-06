"use client";

import { useState, useEffect } from "react";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Mail, Check, Copy, Link } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const roleLabels: Record<string, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  HEAD_COACH: "Head Coach",
  FRONT_DESK: "Recepción",
  COACH: "Coach",
};

const roleBadgeVariant: Record<string, "default" | "secondary" | "info" | "warning" | "success"> = {
  OWNER: "default",
  ADMIN: "info",
  HEAD_COACH: "success",
  FRONT_DESK: "warning",
  COACH: "secondary",
};

export default function EquipoPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [invitedId, setInvitedId] = useState<string | null>(null);

  // Form state for select
  const [formRole, setFormRole] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const json = await res.json();
        setStaff(json);
      } else {
        setStaff([]);
      }
    } catch (e) {
      console.error(e);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const body = {
      firstName: formData.get("firstName") as string,
      email: (formData.get("email") as string) || undefined,
      role: formRole,
      phone: formData.get("phone") as string || undefined,
    };
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowCreate(false);
        setFormRole("");
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || "Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem || saving) return;
    setSaving(true);
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const body = {
      firstName: formData.get("firstName") as string,
      email: (formData.get("email") as string) || undefined,
      role: formRole || editItem.role,
      phone: formData.get("phone") as string || undefined,
    };
    try {
      const res = await fetch(`/api/staff/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditItem(null);
        setFormRole("");
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || "Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este miembro?")) return;
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    fetchData();
  };

  const openEdit = (member: any) => {
    setFormRole(member.role || "");
    setEditItem(member);
  };

  const closeDialog = () => {
    setShowCreate(false);
    setEditItem(null);
    setFormRole("");
    setFormError(null);
  };

  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleInvite = async (userId: string, email: string) => {
    if (email.endsWith("@placeholder.local")) {
      alert("Este usuario no tiene un email real. Edita su perfil para agregar un email antes de enviar la invitación.");
      return;
    }
    try {
      const res = await fetch("/api/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sent) {
          setInvitedId(userId);
          setTimeout(() => setInvitedId(null), 2000);
        } else {
          // Email failed but we have the link — show it
          setInviteLink(data.inviteUrl);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Error al enviar invitación");
      }
    } catch {
      alert("Error al enviar invitación");
    }
  };

  const filtered = staff.filter(
    (s) =>
      `${s.firstName} ${s.lastName || ""}`.toLowerCase().includes(search.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const dialogOpen = showCreate || editItem !== null;
  const isEditing = editItem !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Equipo</h1>
          <p className="text-sm text-neutral-500">Gestiona el personal de tu centro</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Miembro
        </Button>
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
      </div>

      {staff.length === 0 && !loading && (
        <div className="text-center py-12 text-neutral-500">
          <p>No hay miembros del equipo aún</p>
        </div>
      )}

      {staff.length > 0 && (
        <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar || ""} />
                        <AvatarFallback className="text-xs">
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.firstName} {member.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-neutral-500">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant[member.role] || "secondary"}>
                      {roleLabels[member.role] || member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.isActive ? "success" : "secondary"}>
                      {member.isActive ? "Activo" : "Inactivo"}
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
                        <DropdownMenuItem onClick={() => openEdit(member)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleInvite(member.id, member.email)}>
                          {invitedId === member.id ? (
                            <Check className="mr-2 h-4 w-4 text-green-500" />
                          ) : (
                            <Mail className="mr-2 h-4 w-4" />
                          )}
                          {invitedId === member.id ? "Enviado" : "Enviar Invitación"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-accent-rose" onClick={() => handleDelete(member.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Invite link fallback dialog */}
      <Dialog open={inviteLink !== null} onOpenChange={(open) => { if (!open) setInviteLink(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Link de Invitación
            </DialogTitle>
            <DialogDescription>
              No se pudo enviar el email. Comparte este link directamente con el miembro del equipo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input value={inviteLink || ""} readOnly className="text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(inviteLink || "");
                setInviteLink(null);
                setInvitedId("copied");
                setTimeout(() => setInvitedId(null), 2000);
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Miembro" : "Agregar Miembro"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Modifica los datos del miembro" : "Invita a un nuevo miembro del equipo"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={isEditing ? handleEdit : handleCreate}>
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" name="firstName" placeholder="Nombre completo" defaultValue={editItem?.firstName || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input id="email" name="email" type="email" placeholder="email@ejemplo.com" defaultValue={editItem?.email?.includes("@placeholder.local") ? "" : editItem?.email || ""} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="HEAD_COACH">Head Coach</SelectItem>
                  <SelectItem value="FRONT_DESK">Recepción</SelectItem>
                  <SelectItem value="COACH">Coach</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+52 55 1234 5678" defaultValue={editItem?.phone || ""} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Agregar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
