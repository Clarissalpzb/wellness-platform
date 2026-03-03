"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreHorizontal, Pencil, Trash2, Calendar, Clock, X } from "lucide-react";
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

  const [formError, setFormError] = useState<string | null>(null);

  // Form state for selects (not captured by FormData)
  const [formCategory, setFormCategory] = useState("");
  const [formLevel, setFormLevel] = useState("");

  // Schedule management state
  const [scheduleClass, setScheduleClass] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [scheduleDay, setScheduleDay] = useState("");
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [scheduleLocation, setScheduleLocation] = useState("");
  const [scheduleSpace, setScheduleSpace] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) {
        const json = await res.json();
        setClasses(json);
      } else {
        setClasses([]);
      }
    } catch (e) {
      console.error(e);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetch("/api/locations")
      .then((r) => (r.ok ? r.json() : []))
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
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
    } else {
      const err = await res.json().catch(() => ({}));
      setFormError(err.error || "Error al guardar");
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;
    setFormError(null);
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
    } else {
      const err = await res.json().catch(() => ({}));
      setFormError(err.error || "Error al guardar");
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
    setFormError(null);
  };

  const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  const resetScheduleForm = () => {
    setScheduleDay("");
    setScheduleStart("");
    setScheduleEnd("");
    setScheduleLocation("");
    setScheduleSpace("");
    setScheduleError(null);
  };

  const openScheduleDialog = (cls: any) => {
    resetScheduleForm();
    setScheduleClass(cls);
  };

  const closeScheduleDialog = () => {
    setScheduleClass(null);
    resetScheduleForm();
  };

  const handleAddSchedule = async () => {
    setScheduleError(null);
    if (!scheduleClass) return;

    const body = {
      classId: scheduleClass.id,
      dayOfWeek: Number(scheduleDay),
      startTime: scheduleStart,
      endTime: scheduleEnd,
      locationId: scheduleLocation,
      spaceId: scheduleSpace || undefined,
      isRecurring: true,
    };

    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      resetScheduleForm();
      await fetchData();
      // Update the scheduleClass with fresh data
      const updated = (await fetch("/api/classes").then((r) => r.json())) as any[];
      const fresh = updated.find((c: any) => c.id === scheduleClass.id);
      if (fresh) setScheduleClass(fresh);
    } else {
      const err = await res.json().catch(() => ({}));
      setScheduleError(err.error || "Error al agregar horario");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    const res = await fetch(`/api/schedule/${scheduleId}`, { method: "DELETE" });
    if (res.ok) {
      await fetchData();
      const updated = (await fetch("/api/classes").then((r) => r.json())) as any[];
      const fresh = updated.find((c: any) => c.id === scheduleClass?.id);
      if (fresh) setScheduleClass(fresh);
    }
  };

  const selectedLocation = locations.find((l: any) => l.id === scheduleLocation);
  const filteredSpaces = selectedLocation?.spaces ?? [];

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
                    <DropdownMenuItem onClick={() => openScheduleDialog(cls)}>
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
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
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

      {/* Schedule management dialog */}
      <Dialog open={scheduleClass !== null} onOpenChange={(open) => { if (!open) closeScheduleDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Horarios — {scheduleClass?.name}</DialogTitle>
            <DialogDescription>
              Gestiona los horarios recurrentes de esta clase
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Existing schedules */}
            {scheduleClass?.schedules?.length > 0 ? (
              <div className="space-y-2">
                {scheduleClass.schedules.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-neutral-400" />
                      <span className="font-medium">{DAY_NAMES[s.dayOfWeek]}</span>
                      <span className="text-neutral-500">
                        {s.startTime} – {s.endTime}
                      </span>
                      {s.location && (
                        <Badge variant="outline">{s.location.name}</Badge>
                      )}
                      {s.space && (
                        <span className="text-xs text-neutral-400">{s.space.name}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-neutral-400 hover:text-red-500"
                      onClick={() => handleDeleteSchedule(s.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 text-center py-3">
                No hay horarios configurados
              </p>
            )}

            {/* Add schedule form */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium">Agregar Horario</h4>
              {scheduleError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {scheduleError}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Día</Label>
                  <Select value={scheduleDay} onValueChange={setScheduleDay}>
                    <SelectTrigger><SelectValue placeholder="Día" /></SelectTrigger>
                    <SelectContent>
                      {DAY_NAMES.map((name, i) => (
                        <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Inicio</Label>
                  <Input
                    type="time"
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fin</Label>
                  <Input
                    type="time"
                    value={scheduleEnd}
                    onChange={(e) => setScheduleEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ubicación</Label>
                  <Select value={scheduleLocation} onValueChange={(v) => { setScheduleLocation(v); setScheduleSpace(""); }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {locations.map((loc: any) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Espacio (opcional)</Label>
                  <Select value={scheduleSpace} onValueChange={setScheduleSpace} disabled={filteredSpaces.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {filteredSpaces.map((sp: any) => (
                        <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleAddSchedule}
                disabled={!scheduleDay || !scheduleStart || !scheduleEnd || !scheduleLocation}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Horario
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
