"use client";

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, Package, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const typeLabels: Record<string, string> = {
  DROP_IN: "Pase Individual",
  CLASS_PACK: "Paquete de Clases",
  UNLIMITED: "Ilimitado",
  MEMBERSHIP: "Membresía",
};

export default function PaquetesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // Form state for select (not captured by FormData)
  const [formType, setFormType] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/packages");
      if (res.ok) {
        const json = await res.json();
        setPackages(json);
      }
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
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      type: formType,
      price: Number(formData.get("price")),
      classLimit: formData.get("classLimit") ? Number(formData.get("classLimit")) : null,
      validityDays: Number(formData.get("validityDays")),
    };
    const res = await fetch("/api/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowCreate(false);
      setFormType("");
      fetchData();
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      type: formType || editItem.type,
      price: Number(formData.get("price")),
      classLimit: formData.get("classLimit") ? Number(formData.get("classLimit")) : null,
      validityDays: Number(formData.get("validityDays")),
    };
    const res = await fetch(`/api/packages/${editItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditItem(null);
      setFormType("");
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este paquete?")) return;
    await fetch(`/api/packages/${id}`, { method: "DELETE" });
    fetchData();
  };

  const openEdit = (pkg: any) => {
    setFormType(pkg.type || "");
    setEditItem(pkg);
  };

  const closeDialog = () => {
    setShowCreate(false);
    setEditItem(null);
    setFormType("");
  };

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
          <h1 className="text-2xl font-bold text-neutral-900">Paquetes</h1>
          <p className="text-sm text-neutral-500">Gestiona los paquetes y membresías</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Paquete
        </Button>
      </div>

      {packages.length === 0 && !loading && (
        <div className="text-center py-12 text-neutral-500">
          <p>No hay paquetes aún</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <Card key={pkg.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{pkg.name}</CardTitle>
                    <Badge variant="outline" className="mt-1">{typeLabels[pkg.type] || pkg.type}</Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(pkg)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-accent-rose" onClick={() => handleDelete(pkg.id)}>
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
              <div className="space-y-2 text-sm text-neutral-600">
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

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Paquete" : "Nuevo Paquete"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Modifica los datos del paquete" : "Crea un nuevo paquete o membresía"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={isEditing ? handleEdit : handleCreate}>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" placeholder="Ej: Paquete 10 Clases" defaultValue={editItem?.name || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" placeholder="Describe el paquete..." defaultValue={editItem?.description || ""} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DROP_IN">Pase Individual</SelectItem>
                  <SelectItem value="CLASS_PACK">Paquete de Clases</SelectItem>
                  <SelectItem value="UNLIMITED">Ilimitado</SelectItem>
                  <SelectItem value="MEMBERSHIP">Membresía</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio (MXN)</Label>
                <Input id="price" name="price" type="number" placeholder="0" defaultValue={editItem?.price || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classLimit">Límite de clases</Label>
                <Input id="classLimit" name="classLimit" type="number" placeholder="Ilimitado" defaultValue={editItem?.classLimit || ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="validityDays">Vigencia (días)</Label>
              <Input id="validityDays" name="validityDays" type="number" placeholder="30" defaultValue={editItem?.validityDays || ""} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit">{isEditing ? "Guardar Cambios" : "Crear Paquete"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
