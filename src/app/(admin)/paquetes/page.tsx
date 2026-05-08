"use client";

import { useState, useEffect } from "react";
import {
  Plus, MoreHorizontal, Pencil, Trash2, Package, Infinity,
  Star, FolderOpen, GripVertical, ChevronDown, ChevronUp,
  ShieldX, ShieldCheck, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  DROP_IN: "Pase Individual",
  CLASS_PACK: "Paquete de Clases",
  UNLIMITED: "Ilimitado",
  MEMBERSHIP: "Membresía",
};

const GROUP_COLORS = [
  "#4ade80", "#60a5fa", "#f472b6", "#fb923c",
  "#a78bfa", "#facc15", "#34d399", "#f87171",
  "#38bdf8", "#e879f9",
];

interface PackageGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  emoji: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { packages: number };
}

interface Pkg {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  currency: string;
  classLimit: number | null;
  validityDays: number;
  isFeatured: boolean;
  isActive: boolean;
  groupId: string | null;
  group: { id: string; name: string; color: string; emoji: string | null } | null;
  metadata: Record<string, unknown>;
  _count: { userPackages: number };
}

type CancelFeeType = "none" | "inherit" | "custom";

export default function PaquetesPage() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [groups, setGroups] = useState<PackageGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Package dialog state
  const [showCreatePkg, setShowCreatePkg] = useState(false);
  const [editPkg, setEditPkg] = useState<Pkg | null>(null);
  const [formType, setFormType] = useState("");
  const [formGroupId, setFormGroupId] = useState<string>("none");
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formCancelFeeType, setFormCancelFeeType] = useState<CancelFeeType>("inherit");
  const [formCancelFeeAmount, setFormCancelFeeAmount] = useState<string>("");
  const [pkgError, setPkgError] = useState<string | null>(null);

  // Group dialog state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [editGroup, setEditGroup] = useState<PackageGroup | null>(null);
  const [groupColor, setGroupColor] = useState(GROUP_COLORS[0]);
  const [groupError, setGroupError] = useState<string | null>(null);

  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [groupNamePreview, setGroupNamePreview] = useState("");
  const [groupEmojiPreview, setGroupEmojiPreview] = useState("");

  const fetchAll = async () => {
    try {
      const [pkgRes, grpRes] = await Promise.all([
        fetch("/api/packages"),
        fetch("/api/package-groups"),
      ]);
      if (pkgRes.ok) setPackages(await pkgRes.json());
      if (grpRes.ok) setGroups(await grpRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Package CRUD ──

  const handlePkgSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPkgError(null);
    const fd = new FormData(e.currentTarget);
    const cancelFee =
      formCancelFeeType === "none"
        ? { type: "none", amount: null }
        : formCancelFeeType === "custom"
        ? { type: "custom", amount: Number(formCancelFeeAmount) || 0 }
        : { type: "inherit", amount: null };

    const body = {
      name: fd.get("name") as string,
      description: fd.get("description") as string || null,
      type: formType || editPkg?.type,
      price: Number(fd.get("price")),
      classLimit: fd.get("classLimit") ? Number(fd.get("classLimit")) : null,
      validityDays: Number(fd.get("validityDays")),
      groupId: formGroupId === "none" ? null : formGroupId,
      isFeatured: formIsFeatured,
      metadata: { ...(editPkg?.metadata ?? {}), cancellationFee: cancelFee },
    };

    const url = editPkg ? `/api/packages/${editPkg.id}` : "/api/packages";
    const method = editPkg ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      closePkgDialog();
      fetchAll();
    } else {
      const err = await res.json().catch(() => ({}));
      setPkgError(err.error || "Error al guardar");
    }
  };

  const handlePkgDelete = async (id: string) => {
    if (!confirm("¿Eliminar este paquete?")) return;
    await fetch(`/api/packages/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const openEditPkg = (pkg: Pkg) => {
    setFormType(pkg.type);
    setFormGroupId(pkg.groupId ?? "none");
    setFormIsFeatured(pkg.isFeatured);
    const cf = (pkg.metadata?.cancellationFee as { type?: string; amount?: number } | undefined);
    setFormCancelFeeType((cf?.type as CancelFeeType) ?? "inherit");
    setFormCancelFeeAmount(cf?.amount != null ? String(cf.amount) : "");
    setEditPkg(pkg);
  };

  const closePkgDialog = () => {
    setShowCreatePkg(false);
    setEditPkg(null);
    setFormType("");
    setFormGroupId("none");
    setFormIsFeatured(false);
    setFormCancelFeeType("inherit");
    setFormCancelFeeAmount("");
    setPkgError(null);
  };

  // ── Group CRUD ──

  const handleGroupSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGroupError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name") as string,
      description: fd.get("description") as string || null,
      color: groupColor,
      emoji: fd.get("emoji") as string || null,
    };

    const url = editGroup ? `/api/package-groups/${editGroup.id}` : "/api/package-groups";
    const method = editGroup ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      closeGroupDialog();
      fetchAll();
    } else {
      const err = await res.json().catch(() => ({}));
      setGroupError(err.error || "Error al guardar grupo");
    }
  };

  const handleGroupDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el grupo "${name}"? Los paquetes quedarán sin grupo.`)) return;
    await fetch(`/api/package-groups/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const openEditGroup = (grp: PackageGroup) => {
    setGroupColor(grp.color);
    setGroupNamePreview(grp.name);
    setGroupEmojiPreview(grp.emoji || "");
    setEditGroup(grp);
  };

  const closeGroupDialog = () => {
    setShowCreateGroup(false);
    setEditGroup(null);
    setGroupColor(GROUP_COLORS[0]);
    setGroupNamePreview("");
    setGroupEmojiPreview("");
    setGroupError(null);
  };

  const handleGroupToggleActive = async (grp: PackageGroup) => {
    await fetch(`/api/package-groups/${grp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !grp.isActive }),
    });
    fetchAll();
  };

  const handleMoveSortOrder = async (grp: PackageGroup, direction: "up" | "down") => {
    const sorted = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((g) => g.id === grp.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];

    await Promise.all([
      fetch(`/api/package-groups/${grp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: swap.sortOrder }),
      }),
      fetch(`/api/package-groups/${swap.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: grp.sortOrder }),
      }),
    ]);
    fetchAll();
  };

  // ── Filtered packages per tab ──

  const packagesForTab = (tab: string) => {
    if (tab === "all") return packages;
    if (tab === "ungrouped") return packages.filter((p) => !p.groupId);
    return packages.filter((p) => p.groupId === tab);
  };

  const sortedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const pkgDialogOpen = showCreatePkg || editPkg !== null;
  const grpDialogOpen = showCreateGroup || editGroup !== null;
  const isEditingPkg = editPkg !== null;
  const isEditingGroup = editGroup !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Paquetes</h1>
          <p className="text-sm text-neutral-500">Gestiona paquetes y grupos para tus clientes</p>
        </div>
        <Button onClick={() => setShowCreatePkg(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Paquete
        </Button>
      </div>

      {/* Groups Manager */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-neutral-500" />
              <CardTitle className="text-base">Grupos</CardTitle>
              <Badge variant="secondary" className="text-xs">{groups.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setGroupNamePreview(""); setGroupEmojiPreview(""); setShowCreateGroup(true); }}>
                <Plus className="mr-1 h-3 w-3" />
                Nuevo Grupo
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setGroupsExpanded((v) => !v)}
              >
                {groupsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {groupsExpanded && (
          <CardContent>
            {groups.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">
                No hay grupos aún. Crea uno para organizar tus paquetes.
              </p>
            ) : (
              <div className="space-y-2">
                {sortedGroups.map((grp, idx) => (
                  <div
                    key={grp.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-neutral-100 bg-neutral-50 hover:bg-white transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-neutral-300 shrink-0" />
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-base shrink-0"
                      style={{ backgroundColor: grp.color + "33", border: `2px solid ${grp.color}` }}
                    >
                      {grp.emoji || <span style={{ color: grp.color }}>●</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{grp.name}</p>
                      {grp.description && (
                        <p className="text-xs text-neutral-400 truncate">{grp.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {grp._count.packages} paquete{grp._count.packages !== 1 ? "s" : ""}
                    </Badge>
                    <Badge
                      variant={grp.isActive ? "default" : "secondary"}
                      className={cn("text-xs shrink-0 cursor-pointer", grp.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "")}
                      onClick={() => handleGroupToggleActive(grp)}
                    >
                      {grp.isActive ? "Activo" : "Oculto"}
                    </Badge>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        disabled={idx === 0}
                        onClick={() => handleMoveSortOrder(grp, "up")}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        disabled={idx === sortedGroups.length - 1}
                        onClick={() => handleMoveSortOrder(grp, "down")}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditGroup(grp)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleGroupDelete(grp.id, grp.name)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Packages by Tab */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">
            Todos
            <Badge variant="secondary" className="ml-1.5 text-xs">{packages.length}</Badge>
          </TabsTrigger>
          {sortedGroups.map((grp) => {
            const count = packages.filter((p) => p.groupId === grp.id).length;
            return (
              <TabsTrigger key={grp.id} value={grp.id} className="gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: grp.color }}
                />
                {grp.emoji && <span>{grp.emoji}</span>}
                {grp.name}
                <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
              </TabsTrigger>
            );
          })}
          {packages.some((p) => !p.groupId) && (
            <TabsTrigger value="ungrouped">
              Sin grupo
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {packages.filter((p) => !p.groupId).length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {["all", ...sortedGroups.map((g) => g.id), "ungrouped"].map((tabKey) => (
          <TabsContent key={tabKey} value={tabKey} className="mt-4">
            <PackageGrid
              packages={packagesForTab(tabKey)}
              onEdit={openEditPkg}
              onDelete={handlePkgDelete}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Package Dialog */}
      <Dialog open={pkgDialogOpen} onOpenChange={(open) => { if (!open) closePkgDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditingPkg ? "Editar Paquete" : "Nuevo Paquete"}</DialogTitle>
            <DialogDescription>
              {isEditingPkg ? "Modifica los datos del paquete" : "Crea un nuevo paquete o membresía"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handlePkgSave}>
            {pkgError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {pkgError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" placeholder="Ej: Paquete 10 Clases" defaultValue={editPkg?.name || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" placeholder="Describe el paquete..." defaultValue={editPkg?.description || ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DROP_IN">Pase Individual</SelectItem>
                    <SelectItem value="CLASS_PACK">Paquete de Clases</SelectItem>
                    <SelectItem value="UNLIMITED">Ilimitado</SelectItem>
                    <SelectItem value="MEMBERSHIP">Membresía</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select value={formGroupId} onValueChange={setFormGroupId}>
                  <SelectTrigger><SelectValue placeholder="Sin grupo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin grupo</SelectItem>
                    {sortedGroups.map((grp) => (
                      <SelectItem key={grp.id} value={grp.id}>
                        {grp.emoji ? `${grp.emoji} ` : ""}{grp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio (MXN)</Label>
                <Input id="price" name="price" type="number" placeholder="0" defaultValue={editPkg?.price || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classLimit">Límite de clases</Label>
                <Input id="classLimit" name="classLimit" type="number" placeholder="Ilimitado" defaultValue={editPkg?.classLimit || ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="validityDays">Vigencia (días)</Label>
              <Input id="validityDays" name="validityDays" type="number" placeholder="30" defaultValue={editPkg?.validityDays || ""} required />
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-neutral-100 p-3">
              <Star className="h-4 w-4 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-medium">Destacado</p>
                <p className="text-xs text-neutral-500">Se muestra primero en el catálogo</p>
              </div>
              <Switch checked={formIsFeatured} onCheckedChange={setFormIsFeatured} />
            </div>

            {/* Cancellation fee section */}
            <div className="space-y-3 rounded-lg border border-neutral-200 p-4 bg-neutral-50">
              <div className="flex items-center gap-2">
                <ShieldX className="h-4 w-4 text-neutral-500" />
                <p className="text-sm font-semibold text-neutral-800">Cargo por cancelación</p>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Cuando un cliente cancela tarde, ¿qué pasa con ese lugar vacío? Puedes cobrar un fee para reducir las cancelaciones de último minuto.
              </p>

              <div className="space-y-1">
                <Label className="text-xs text-neutral-600">Política de este paquete</Label>
                <div className="space-y-2">
                  {(
                    [
                      {
                        value: "inherit" as CancelFeeType,
                        icon: ShieldCheck,
                        label: "Usar la política del estudio",
                        hint: "El fee se toma de la configuración general",
                        color: "text-blue-600",
                      },
                      {
                        value: "custom" as CancelFeeType,
                        icon: ShieldX,
                        label: "Fee personalizado para este paquete",
                        hint: "Útil para paquetes básicos donde quieres mayor control",
                        color: "text-orange-600",
                      },
                      {
                        value: "none" as CancelFeeType,
                        icon: Star,
                        label: "Sin cargo — beneficio premium",
                        hint: "Ofrece esto en tus membresías más caras para diferenciarte",
                        color: "text-amber-600",
                      },
                    ] as const
                  ).map(({ value, icon: Icon, label, hint, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormCancelFeeType(value)}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                        formCancelFeeType === value
                          ? "border-primary-500 bg-primary-50"
                          : "border-neutral-200 bg-white hover:border-neutral-300"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", formCancelFeeType === value ? color : "text-neutral-400")} />
                      <div className="min-w-0">
                        <p className={cn("text-sm font-medium", formCancelFeeType === value ? "text-neutral-900" : "text-neutral-600")}>
                          {label}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">{hint}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {formCancelFeeType === "custom" && (
                <div className="space-y-1">
                  <Label htmlFor="cancelFeeAmount" className="text-xs text-neutral-600">Monto del cargo (MXN)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-500">$</span>
                    <Input
                      id="cancelFeeAmount"
                      type="number"
                      min="0"
                      step="10"
                      placeholder="Ej: 50"
                      value={formCancelFeeAmount}
                      onChange={(e) => setFormCancelFeeAmount(e.target.value)}
                      className="max-w-32"
                    />
                    <span className="text-sm text-neutral-500">MXN</span>
                  </div>
                </div>
              )}

              {formCancelFeeType === "none" && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Tip: Menciona "cancelaciones sin costo" en la descripción del paquete para que los clientes lo vean como una ventaja.</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closePkgDialog}>Cancelar</Button>
              <Button type="submit">{isEditingPkg ? "Guardar Cambios" : "Crear Paquete"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={grpDialogOpen} onOpenChange={(open) => { if (!open) closeGroupDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isEditingGroup ? "Editar Grupo" : "Nuevo Grupo"}</DialogTitle>
            <DialogDescription>
              Los grupos organizan tus paquetes en el catálogo del cliente
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleGroupSave}>
            {groupError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {groupError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="gname">Nombre del grupo</Label>
              <Input
                id="gname" name="name"
                placeholder="Ej: Membresías, Paquetes de Prueba..."
                value={groupNamePreview}
                onChange={(e) => setGroupNamePreview(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emoji">Emoji (opcional)</Label>
                <Input
                  id="emoji" name="emoji" placeholder="🎂" maxLength={4}
                  value={groupEmojiPreview}
                  onChange={(e) => setGroupEmojiPreview(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {GROUP_COLORS.map((c) => (
                    <button
                      key={c} type="button"
                      className={cn(
                        "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                        groupColor === c ? "border-neutral-700 scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => setGroupColor(c)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gdesc">Descripción (opcional)</Label>
              <Textarea
                id="gdesc" name="description"
                placeholder="Breve descripción del grupo..."
                defaultValue={editGroup?.description || ""}
                rows={2}
              />
            </div>
            {/* Preview */}
            <div className="flex items-center gap-3 rounded-lg border border-neutral-100 p-3 bg-neutral-50">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: groupColor + "33", border: `2px solid ${groupColor}` }}
              >
                {groupEmojiPreview || "📦"}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {groupNamePreview || "Nombre del grupo"}
                </p>
                <p className="text-xs text-neutral-400">Vista previa</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeGroupDialog}>Cancelar</Button>
              <Button type="submit">{isEditingGroup ? "Guardar Cambios" : "Crear Grupo"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PackageGrid({
  packages,
  onEdit,
  onDelete,
}: {
  packages: Pkg[];
  onEdit: (pkg: Pkg) => void;
  onDelete: (id: string) => void;
}) {
  if (packages.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-400">
        <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No hay paquetes en esta categoría</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {packages.map((pkg) => (
        <Card key={pkg.id} className={cn("relative", !pkg.isActive && "opacity-60")}>
          {pkg.isFeatured && (
            <div className="absolute top-3 right-10 z-10">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>
          )}
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 text-lg"
                  style={
                    pkg.group
                      ? { backgroundColor: pkg.group.color + "22", border: `2px solid ${pkg.group.color}` }
                      : { backgroundColor: "#f3f4f6", border: "2px solid #e5e7eb" }
                  }
                >
                  {pkg.group?.emoji || <Package className="h-5 w-5 text-neutral-400" />}
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{pkg.name}</CardTitle>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{typeLabels[pkg.type] || pkg.type}</Badge>
                    {pkg.group && (
                      <Badge
                        className="text-xs border-0"
                        style={{ backgroundColor: pkg.group.color + "22", color: pkg.group.color }}
                      >
                        {pkg.group.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(pkg)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={() => onDelete(pkg.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-bold text-neutral-900">
                ${pkg.price?.toLocaleString() ?? 0}
              </span>
              <span className="text-sm text-neutral-500">{pkg.currency || "MXN"}</span>
            </div>
            <div className="space-y-1.5 text-sm text-neutral-600">
              <div className="flex justify-between">
                <span>Clases</span>
                <span className="font-medium">
                  {pkg.classLimit ? pkg.classLimit : <Infinity className="h-4 w-4 inline" />}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Vigencia</span>
                <span className="font-medium">{pkg.validityDays} días</span>
              </div>
              <div className="flex justify-between">
                <span>Vendidos</span>
                <span className="font-medium">{pkg._count?.userPackages ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
