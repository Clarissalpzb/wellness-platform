"use client";

import { useState, useEffect } from "react";
import { Plus, DoorOpen, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function SalonesPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editSpace, setEditSpace] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formLocation, setFormLocation] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const json = await res.json();
        setLocations(json);
      } else {
        setLocations([]);
      }
    } catch (e) {
      console.error(e);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allSpaces = locations.flatMap((loc) =>
    (loc.spaces ?? []).map((sp: any) => ({ ...sp, locationName: loc.name, locationId: loc.id }))
  );

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      capacity: Number(formData.get("capacity")) || 0,
      amenities: (formData.get("amenities") as string) || "",
      locationId: formLocation,
    };
    if (!body.locationId) {
      setFormError("Selecciona una sucursal");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        closeDialog();
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
    if (!editSpace || saving) return;
    setSaving(true);
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      capacity: Number(formData.get("capacity")) || 0,
      amenities: (formData.get("amenities") as string) || "",
    };
    try {
      const res = await fetch(`/api/spaces/${editSpace.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        closeDialog();
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
    if (!confirm("¿Estás seguro de que deseas eliminar este salón?")) return;
    await fetch(`/api/spaces/${id}`, { method: "DELETE" });
    fetchData();
  };

  const closeDialog = () => {
    setShowCreate(false);
    setEditSpace(null);
    setFormLocation("");
    setFormError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const dialogOpen = showCreate || editSpace !== null;
  const isEditing = editSpace !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Salones</h1>
          <p className="text-sm text-neutral-500">Gestiona los salones de tus sucursales</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={locations.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Salón
        </Button>
      </div>

      {locations.length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <p>Primero agrega una sucursal en la sección de Sucursales</p>
        </div>
      )}

      {locations.length > 0 && allSpaces.length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <DoorOpen className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
          <p>No hay salones aún</p>
          <p className="text-sm text-neutral-400 mt-1">Agrega salones como &quot;Salón Barre&quot; o &quot;Salón Pilates Reformer&quot;</p>
        </div>
      )}

      {allSpaces.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allSpaces.map((space) => (
            <div
              key={space.id}
              className="border border-neutral-200 rounded-xl bg-white p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent-blue-light text-accent-blue flex items-center justify-center">
                    <DoorOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{space.name}</p>
                    <p className="text-xs text-neutral-500">{space.locationName}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setFormLocation(space.locationId); setEditSpace(space); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-accent-rose" onClick={() => handleDelete(space.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-500">
                {space.capacity > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Capacidad: {space.capacity}
                  </span>
                )}
                {space.amenities && (
                  <Badge variant="outline" className="text-xs">{space.amenities}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Salón" : "Nuevo Salón"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Modifica los datos del salón" : "Agrega un nuevo salón a una sucursal"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={isEditing ? handleEdit : handleCreate}>
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            {!isEditing && (
              <div className="space-y-2">
                <Label>Sucursal</Label>
                <Select value={formLocation} onValueChange={setFormLocation}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="space-name">Nombre</Label>
              <Input id="space-name" name="name" placeholder="Ej: Salón Barre" defaultValue={editSpace?.name || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="space-capacity">Capacidad</Label>
              <Input id="space-capacity" name="capacity" type="number" placeholder="20" defaultValue={editSpace?.capacity || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="space-amenities">Amenidades</Label>
              <Input id="space-amenities" name="amenities" placeholder="Ej: Espejos, Barras, Sonido" defaultValue={editSpace?.amenities || ""} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Agregar Salón"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
