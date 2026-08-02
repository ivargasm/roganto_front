"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchCategories, createCategory, deleteCategory, Category } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("charge");
  const [isCreating, setIsCreating] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    setIsCreating(true);
    try {
      await createCategory({ name: newName, type: newType });
      setNewName("");
      loadCategories();
      toast.success("Categoría creada");
    } catch (err) {
      toast.error("Error al crear categoría");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await deleteCategory(id);
      loadCategories();
      toast.success("Categoría eliminada");
    } catch (err) {
      toast.error("Error al eliminar (puede que esté en uso)");
    }
  };

  const chargeCategories = categories.filter(c => c.type === 'charge');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-12 space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configuración</h1>
        <p className="text-slate-500 mt-1">Administración de catálogos y ajustes del sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Form to create */}
        <Card className="rounded-2xl shadow-sm border-slate-200 h-fit">
          <CardHeader>
            <CardTitle>Nueva Categoría</CardTitle>
            <CardDescription>Agrega opciones para cobros o egresos</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Nombre / Concepto</Label>
                <Input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej. Mantenimiento Elevador" className="rounded-xl bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Tipo de Catálogo</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="rounded-xl bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="charge">Cargo a Casa (Multa, Mensualidad)</SelectItem>
                    <SelectItem value="expense">Egreso del Condominio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isCreating} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Agregar Categoría
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lists */}
        <div className="space-y-8">
          <Card className="rounded-2xl shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Cargos a Casas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {chargeCategories.map(c => (
                  <li key={c.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                      <Trash2 size={16} />
                    </Button>
                  </li>
                ))}
                {chargeCategories.length === 0 && <p className="text-sm text-slate-500">No hay categorías de cargos.</p>}
              </ul>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Egresos del Condominio</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {expenseCategories.map(c => (
                  <li key={c.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                      <Trash2 size={16} />
                    </Button>
                  </li>
                ))}
                {expenseCategories.length === 0 && <p className="text-sm text-slate-500">No hay categorías de egresos.</p>}
              </ul>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
