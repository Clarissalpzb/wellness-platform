"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreHorizontal, Pencil, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function ClasesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState("");

  // Form state for selects (not captured by FormData)
  const [formCategory, setFormCategory] = useState("");
  const [formLevel, setFormLevel] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) {
        const json = await res.json();
        setClasses(json);
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
      duration: Number(formData.get("duration")),
      maxCapacity: Number(formData.get("maxCapacity")),
      category: formCategory,
      level: formLevel,
      color: formData.get("color") as string || "#3b82f6",
      waitlistMax: Number(formData.get("waitlistMax")) || 0,
    };
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowCreate(false);
      setFormCategory("");
      setFormLevel("");
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
      duration: Number(formData.get("duration")),
      maxCapacity: Number(formData.get("maxCapacity")),
      category: formCategory || editItem.category,
      level: formLevel || editItem.level,
      color: formData.get("color") as string || editItem.color,
      waitlistMax: Number(formData.get("waitlistMax")) || 0,
    };
    const res = await fetch(`/api/classes/${editItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditItem(null);
      setFormCategory("");
      setFormLevel("");
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta clase?")) return;
    await fetch(`/api/classes/${id}`, { method: "DELETE" });
    fetchData();
  };

  const openEdit = (cls: any) => {
    setFormCategory(cls.category || "");
    setFormLevel(cls.level || "");
    setEditItem(cls);
  };

  const closeDialog = () => {
    setShowCreate(false);
    setEditItem(null);
    setFormCategory("");
    setFormLevel("");
  };

  const filtered = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-2xl font-bold text-neutral-900">Clases</h1>
          <p className="text-sm text-neutral-500">Gestiona las clases de tu centro</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Clase
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Buscar clases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {classes.length === 0 && !loading && (
        <div className="text-center py-12 text-neutral-500">
          <p>No hay clases aún</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cls) => (
          <Card key={cls.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: cls.color }}
                  >
                    {cls.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{cls.name}</CardTitle>
                    <p className="text-sm text-neutral-500">{cls.category}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(cls)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Calendar className="mr-2 h-4 w-4" /> Horarios
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-accent-rose" onClick={() => handleDelete(cls.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-neutral-600">
                <span>{cls.duration} min</span>
                <span>Cap. {cls.maxCapacity}</span>
                <Badge variant={cls.isActive ? "success" : "secondary"}>
                  {cls.isActive ? "Activa" : "Inactiva"}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline">{cls.level}</Badge>
                <span className="text-xs text-neutral-400">
                  {cls.schedules?.length ?? 0} horarios
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Clase" : "Nueva Clase"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Modifica los datos de la clase" : "Crea una nueva clase para tu centro"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={isEditing ? handleEdit : handleCreate}>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" placeholder="Ej: Yoga Flow" defaultValue={editItem?.name || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" placeholder="Describe la clase..." defaultValue={editItem?.description || ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duración (min)</Label>
                <Input id="duration" name="duration" type="number" placeholder="60" defaultValue={editItem?.duration || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxCapacity">Capacidad</Label>
                <Input id="maxCapacity" name="maxCapacity" type="number" placeholder="20" defaultValue={editItem?.maxCapacity || ""} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yoga">Yoga</SelectItem>
                    <SelectItem value="Cardio">Cardio</SelectItem>
                    <SelectItem value="Pilates">Pilates</SelectItem>
                    <SelectItem value="Fuerza">Fuerza</SelectItem>
                    <SelectItem value="Mindfulness">Mindfulness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nivel</Label>
                <Select value={formLevel} onValueChange={setFormLevel}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Principiante">Principiante</SelectItem>
                    <SelectItem value="Intermedio">Intermedio</SelectItem>
                    <SelectItem value="Avanzado">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input id="color" name="color" type="color" defaultValue={editItem?.color || "#3b82f6"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waitlistMax">Lista de espera</Label>
                <Input id="waitlistMax" name="waitlistMax" type="number" placeholder="0" defaultValue={editItem?.waitlistMax || ""} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit">{isEditing ? "Guardar Cambios" : "Crear Clase"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
