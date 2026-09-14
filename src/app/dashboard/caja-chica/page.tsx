"use client";

import { useEffect, useState, useCallback } from "react";
import { Wallet, ArrowDownRight, ArrowUpRight, Plus, Loader2 } from "lucide-react";
import { getPettyCashSummary, createExpense, fetchCategories, Category } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPeriod } from "@/lib/utils";

interface Movement {
  id: string;
  type: "inflow" | "outflow";
  amount: number;
  date: string;
  description: string;
  category: string;
}

interface PettyCashSummaryType {
  total_inflows: number;
  total_outflows: number;
  balance: number;
  recent_movements: Movement[];
}

export default function CajaChicaPage() {
  const [summary, setSummary] = useState<PettyCashSummaryType | null>(null);
  const [loading, setLoading] = useState(true);
  
  const periodOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return formatPeriod(d);
  });
  const previousMonthPeriod = periodOptions[1] || periodOptions[0];
  const [filterPeriod, setFilterPeriod] = useState(previousMonthPeriod);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Luz");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  
  const loadSummary = useCallback(async () => {
    try {
      const data = await getPettyCashSummary(filterPeriod);
      setSummary(data);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar la caja chica");
    } finally {
      setLoading(false);
    }
  }, [filterPeriod]);

  const loadCategories = async () => {
    try {
      const cats = await fetchCategories("expense");
      setExpenseCategories(cats);
      if (cats.length > 0) setCategory(cats[0].name);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) {
      toast.error("Por favor, ingresa un monto válido");
      return;
    }

    setIsSubmitting(true);
    try {
      await createExpense({
        amount: Number(amount),
        category,
        description,
        expense_date: new Date(expenseDate).toISOString(),
        period: filterPeriod,
        payment_method: "Efectivo"
      });
      toast.success("Gasto registrado exitosamente");
      setIsModalOpen(false);
      setAmount("");
      setDescription("");
      loadSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Caja Chica</h1>
          <p className="text-slate-500 mt-1">Control de dinero en efectivo e ingresos no bancarizados</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-[160px] h-12 rounded-xl bg-slate-50 border-slate-200">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md h-12 px-6 font-semibold flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Registrar Gasto (Efectivo)
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Saldo Disponible</p>
              <h2 className="text-4xl font-black text-slate-900 mt-2">${summary?.balance.toFixed(2)}</h2>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Entradas</p>
              <h2 className="text-3xl font-bold text-emerald-600 mt-2">${summary?.total_inflows.toFixed(2)}</h2>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <ArrowDownRight className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Salidas</p>
              <h2 className="text-3xl font-bold text-rose-600 mt-2">${summary?.total_outflows.toFixed(2)}</h2>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Historial de Movimientos (Efectivo)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Concepto / Referencia</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Categoría</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary?.recent_movements?.map((m: Movement) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                    {format(new Date(m.date), "dd/MM/yyyy")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                    {m.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {m.category}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${m.type === 'inflow' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.type === 'inflow' ? '+' : '-'}${m.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
              {(!summary?.recent_movements || summary.recent_movements.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No hay movimientos registrados en efectivo aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleCreateExpense}>
            <DialogHeader>
              <DialogTitle className="text-2xl">Registrar Gasto (Caja Chica)</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Este gasto se descontará del saldo disponible en efectivo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-bold text-slate-500">Monto ($)</Label>
                <Input id="amount" type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="rounded-xl bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expenseDate" className="text-xs font-bold text-slate-500">Fecha del Gasto</Label>
                <Input id="expenseDate" type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="rounded-xl bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-bold text-slate-500">Categoría</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-bold text-slate-500">Concepto</Label>
                <Input id="description" required value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Focos para el pasillo..." className="rounded-xl bg-slate-50 border-slate-200" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
