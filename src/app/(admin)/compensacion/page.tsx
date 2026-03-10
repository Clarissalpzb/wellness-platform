"use client";

import { useState, useEffect } from "react";
import { Plus, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const typeLabels: Record<string, string> = {
  FIXED_PER_CLASS: "Fijo/clase",
  PER_ATTENDEE: "Por alumno",
  PERCENTAGE_REVENUE: "% Ingreso",
  HOURLY: "Por hora",
};

const typeBadgeVariant: Record<string, "default" | "secondary" | "info" | "warning" | "success"> = {
  FIXED_PER_CLASS: "default",
  PER_ATTENDEE: "info",
  PERCENTAGE_REVENUE: "warning",
  HOURLY: "secondary",
};

function formatAmount(type: string, amount: number) {
  if (type === "PERCENTAGE_REVENUE") return `${amount}%`;
  return `$${amount.toLocaleString("es-MX")}`;
}

export default function CompensacionPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for selects
  const [formCoach, setFormCoach] = useState("");
  const [formType, setFormType] = useState("");
  const [formClass, setFormClass] = useState("");

  const fetchData = async () => {
    try {
      const [rulesRes, staffRes, classesRes] = await Promise.all([
        fetch("/api/compensation"),
        fetch("/api/staff"),
        fetch("/api/classes"),
      ]);
      if (rulesRes.ok) setRules(await rulesRes.json());
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setCoaches(staffData.filter((s: any) => s.coachProfile));
      }
      if (classesRes.ok) setClasses(await classesRes.json());
    } catch (e) {
      console.error(e);
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
      coachProfileId: formCoach,
      type: formType,
      amount: Number(formData.get("amount")),
      classId: formClass && formClass !== "ALL" ? formClass : undefined,
    };
    try {
      const res = await fetch("/api/compensation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowCreate(false);
        resetForm();
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
      coachProfileId: formCoach || editItem.coachProfileId,
      type: formType || editItem.type,
      amount: Number(formData.get("amount")),
      classId: formClass && formClass !== "ALL" ? formClass : undefined,
    };
    try {
      const res = await fetch(`/api/compensation/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditItem(null);
        resetForm();
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
    if (!confirm("¿Estás seguro de que deseas eliminar esta regla?")) return;
    await fetch(`/api/compensation/${id}`, { method: "DELETE" });
    fetchData();
  };

  const openEdit = (rule: any) => {
    setFormCoach(rule.coachProfileId || "");
    setFormType(rule.type || "");
    setFormClass(rule.classId || "");
    setEditItem(rule);
  };

  const resetForm = () => {
    setFormCoach("");
    setFormType("");
    setFormClass("");
    setFormError(null);
  };

  const closeDialog = () => {
    setShowCreate(false);
    setEditItem(null);
    resetForm();
  };

  const getCoachName = (rule: any) => {
    const u = rule.coachProfile?.user;
    if (!u) return "—";
    return `${u.firstName} ${u.lastName || ""}`.trim();
  };

  const filtered = rules.filter((r) => {
    const coachName = getCoachName(r);
    const className = r.class?.name || "";
    const q = search.toLowerCase();
    return coachName.toLowerCase().includes(q) || className.toLowerCase().includes(q);
  });

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
          <h1 className="text-2xl font-bold text-neutral-900">Compensación de Coaches</h1>
          <p className="text-sm text-neutral-500">Configura las reglas de compensación para cada coach</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Regla
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Buscar por coach o clase..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {rules.length === 0 && !loading && (
        <div className="text-center py-12 text-neutral-500">
          <p>No hay reglas de compensación aún</p>
        </div>
      )}

      {rules.length > 0 && (
        <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coach</TableHead>
                <TableHead>Clase</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{getCoachName(rule)}</TableCell>
                  <TableCell className="text-neutral-500">
                    {rule.class?.name || "Todas las clases"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeBadgeVariant[rule.type] || "secondary"}>
                      {typeLabels[rule.type] || rule.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatAmount(rule.type, rule.amount)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(rule)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-accent-rose" onClick={() => handleDelete(rule.id)}>
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

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Regla" : "Nueva Regla"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Modifica la regla de compensación" : "Asigna una compensación a un coach"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={isEditing ? handleEdit : handleCreate}>
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Coach</Label>
              <Select value={formCoach} onValueChange={setFormCoach}>
                <SelectTrigger><SelectValue placeholder="Seleccionar coach" /></SelectTrigger>
                <SelectContent>
                  {coaches.map((c) => (
                    <SelectItem key={c.coachProfile.id} value={c.coachProfile.id}>
                      {c.firstName} {c.lastName || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED_PER_CLASS">Fijo por clase</SelectItem>
                  <SelectItem value="PER_ATTENDEE">Por alumno</SelectItem>
                  <SelectItem value="PERCENTAGE_REVENUE">% de ingreso</SelectItem>
                  <SelectItem value="HOURLY">Por hora</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder={formType === "PERCENTAGE_REVENUE" ? "Ej: 15" : "Ej: 250"}
                defaultValue={editItem?.amount ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Clase (opcional)</Label>
              <Select value={formClass} onValueChange={setFormClass}>
                <SelectTrigger><SelectValue placeholder="Todas las clases" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las clases</SelectItem>
                  {classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Regla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
