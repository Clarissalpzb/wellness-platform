"use client";

import { useState, useEffect } from "react";
import { Plus, Building2, MapPin, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

export default function EspaciosPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [editLocation, setEditLocation] = useState<any>(null);
  const [showCreateSpace, setShowCreateSpace] = useState<string | null>(null); // locationId
  const [editSpace, setEditSpace] = useState<any>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const json = await res.json();
        setLocations(json);
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

  // Location handlers
  const handleCreateLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      phone: formData.get("phone") as string,
    };
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowCreateLocation(false);
      fetchData();
    }
  };

  const handleEditLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editLocation) return;
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      phone: formData.get("phone") as string,
    };
    const res = await fetch(`/api/locations/${editLocation.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditLocation(null);
      fetchData();
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta ubicación?")) return;
    await fetch(`/api/locations/${id}`, { method: "DELETE" });
    fetchData();
  };

  // Space handlers
  const handleCreateSpace = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!showCreateSpace) return;
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      capacity: Number(formData.get("capacity")),
      amenities: formData.get("amenities") as string || "",
      locationId: showCreateSpace,
    };
    const res = await fetch("/api/spaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowCreateSpace(null);
      fetchData();
    }
  };

  const handleEditSpace = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editSpace) return;
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      capacity: Number(formData.get("capacity")),
      amenities: formData.get("amenities") as string || "",
    };
    const res = await fetch(`/api/spaces/${editSpace.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditSpace(null);
      fetchData();
    }
  };

  const handleDeleteSpace = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta sala?")) return;
    await fetch(`/api/spaces/${id}`, { method: "DELETE" });
    fetchData();
  };

  const closeLocationDialog = () => {
    setShowCreateLocation(false);
    setEditLocation(null);
  };

  const closeSpaceDialog = () => {
    setShowCreateSpace(null);
    setEditSpace(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const locationDialogOpen = showCreateLocation || editLocation !== null;
  const isEditingLocation = editLocation !== null;
  const spaceDialogOpen = showCreateSpace !== null || editSpace !== null;
  const isEditingSpace = editSpace !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Espacios</h1>
          <p className="text-sm text-neutral-500">Gestiona tus ubicaciones y salas</p>
        </div>
        <Button onClick={() => setShowCreateLocation(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Ubicación
        </Button>
      </div>

      {locations.length === 0 && !loading && (
        <div className="text-center py-12 text-neutral-500">
          <p>No hay ubicaciones aún</p>
        </div>
      )}

      <div className="space-y-6">
        {locations.map((location) => (
          <Card key={location.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent-blue-light text-accent-blue flex items-center justify-center">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{location.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-neutral-500 mt-1">
                      <MapPin className="h-3 w-3" />
                      {location.address}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={location.isActive ? "success" : "secondary"}>
                    {location.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditLocation(location)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-accent-rose" onClick={() => handleDeleteLocation(location.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <h4 className="text-sm font-medium text-neutral-700 mb-3">Salas</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {location.spaces?.map((space: any) => (
                  <div
                    key={space.id}
                    className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">{space.name}</p>
                      <p className="text-xs text-neutral-500">Capacidad: {space.capacity}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditSpace(space)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-accent-rose" onClick={() => handleDeleteSpace(space.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setShowCreateSpace(location.id)}
                  className="flex items-center justify-center p-3 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-500 hover:border-primary-500 hover:text-primary-600 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Sala
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Location Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={(open) => { if (!open) closeLocationDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditingLocation ? "Editar Ubicación" : "Nueva Ubicación"}</DialogTitle>
            <DialogDescription>
              {isEditingLocation ? "Modifica los datos de la ubicación" : "Agrega una nueva sucursal a tu centro"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={isEditingLocation ? handleEditLocation : handleCreateLocation}>
            <div className="space-y-2">
              <Label htmlFor="loc-name">Nombre</Label>
              <Input id="loc-name" name="name" placeholder="Ej: Sucursal Norte" defaultValue={editLocation?.name || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-address">Dirección</Label>
              <Input id="loc-address" name="address" placeholder="Calle, número, colonia, ciudad" defaultValue={editLocation?.address || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-phone">Teléfono</Label>
              <Input id="loc-phone" name="phone" type="tel" placeholder="+52 55 1234 5678" defaultValue={editLocation?.phone || ""} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeLocationDialog}>Cancelar</Button>
              <Button type="submit">{isEditingLocation ? "Guardar Cambios" : "Crear Ubicación"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Space Dialog */}
      <Dialog open={spaceDialogOpen} onOpenChange={(open) => { if (!open) closeSpaceDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditingSpace ? "Editar Sala" : "Nueva Sala"}</DialogTitle>
            <DialogDescription>
              {isEditingSpace ? "Modifica los datos de la sala" : "Agrega una nueva sala a esta ubicación"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={isEditingSpace ? handleEditSpace : handleCreateSpace}>
            <div className="space-y-2">
              <Label htmlFor="space-name">Nombre</Label>
              <Input id="space-name" name="name" placeholder="Ej: Sala Principal" defaultValue={editSpace?.name || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="space-capacity">Capacidad</Label>
              <Input id="space-capacity" name="capacity" type="number" placeholder="20" defaultValue={editSpace?.capacity || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="space-amenities">Amenidades</Label>
              <Input id="space-amenities" name="amenities" placeholder="Ej: Espejos, Barras, Sonido" defaultValue={editSpace?.amenities || ""} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeSpaceDialog}>Cancelar</Button>
              <Button type="submit">{isEditingSpace ? "Guardar Cambios" : "Agregar Sala"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
