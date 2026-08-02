"use client";

import { useEffect, useState } from "react";
import { fetchExpenses, createExpense, deleteExpense, Expense, fetchCategories, Category } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, PlusCircle, CheckCircle2, Zap, Droplet, Wrench, Shield, Leaf, Wifi, FileText, Info, X, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatPeriod } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Generar opciones de periodos (últimos 12 meses)
  const periodOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return formatPeriod(d);
  });

  // El mes "actual" de cierre contable (mes anterior al calendario)
  const previousMonthPeriod = periodOptions[1] || periodOptions[0];

  // Form State
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Luz");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [period, setPeriod] = useState(previousMonthPeriod);
  
  // Filter State
  const [filterPeriod, setFilterPeriod] = useState(previousMonthPeriod);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        fetchExpenses(),
        fetchCategories('expense')
      ]);
      
      // Sort DESC (newest first)
      data.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
      setExpenses(data);
      setExpenseCategories(cats);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
        period
      });
      toast.success("Gasto registrado exitosamente");
      setAmount("");
      setDescription("");
      loadExpenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      await deleteExpense(expenseToDelete);
      toast.success("Gasto eliminado");
      setExpenseToDelete(null);
      loadExpenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Filter expenses based on selected period
  const filteredExpenses = filterPeriod === "Todos" 
    ? expenses 
    : expenses.filter(e => e.period === filterPeriod);

  // Calculate Total for the selected period
  const totalThisMonth = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Helper for dynamic icons
  const getCategoryDetails = (cat: string) => {
    switch(cat) {
      case 'Luz': return { icon: <Zap size={22} className="text-yellow-600" />, bg: 'bg-yellow-50', border: 'border-yellow-100' };
      case 'Agua': return { icon: <Droplet size={22} className="text-blue-600" />, bg: 'bg-blue-50', border: 'border-blue-100' };
      case 'Mantenimiento': return { icon: <Wrench size={22} className="text-indigo-600" />, bg: 'bg-indigo-50', border: 'border-indigo-100' };
      case 'Seguridad': return { icon: <Shield size={22} className="text-slate-700" />, bg: 'bg-slate-100', border: 'border-slate-200' };
      case 'Jardinería': return { icon: <Leaf size={22} className="text-emerald-600" />, bg: 'bg-emerald-50', border: 'border-emerald-100' };
      case 'Servicios': return { icon: <Wifi size={22} className="text-purple-600" />, bg: 'bg-purple-50', border: 'border-purple-100' };
      default: return { icon: <FileText size={22} className="text-slate-500" />, bg: 'bg-slate-50', border: 'border-slate-200' };
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-12 space-y-10">
      
      {/* Header & KPI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-[2px] w-8 bg-slate-400"></div>
            <p className="text-xs font-semibold text-slate-500 tracking-widest uppercase">Finanzas & Gestión</p>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Egresos</h1>
        </div>
        
        <Card className="rounded-2xl border-slate-200 shadow-sm bg-white min-w-[240px]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={24} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-0.5">
                Total {filterPeriod === "Todos" ? "Histórico" : filterPeriod}
              </p>
              <h2 className="text-3xl font-black text-slate-900">
                ${totalThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h2>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-[380px_1fr] items-start">
        
        {/* Formulario (Columna Izquierda) */}
        <Card className="rounded-3xl border-slate-200 shadow-lg bg-white/90 backdrop-blur-md sticky top-6">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-slate-100 p-2 rounded-full">
                <PlusCircle size={20} className="text-slate-700" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Nuevo Registro</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monto del Gasto</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    placeholder="0.00"
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 pl-8 font-medium text-slate-900 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</label>
                <Input 
                  type="date" 
                  value={expenseDate} 
                  onChange={e => setExpenseDate(e.target.value)} 
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 font-medium text-slate-900 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 font-medium text-slate-900 focus:ring-indigo-500 focus:border-indigo-500">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                      {expenseCategories.length === 0 && <SelectItem value="Cargando" disabled>Cargando opciones...</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Periodo</label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 font-medium text-slate-900 focus:ring-indigo-500 focus:border-indigo-500">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {periodOptions.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Concepto</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Descripción breve del egreso..."
                  className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  required
                />
              </div>

              <Button type="submit" className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md font-bold text-base mt-4" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="animate-spin mr-2" size={20} />
                ) : (
                  <CheckCircle2 className="mr-2" size={20} />
                )}
                Guardar Egreso
              </Button>

              <div className="flex items-start gap-3 mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <Info size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Todos los egresos registrados son auditados semanalmente por la administración central.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Historial Reciente (Columna Derecha) enmarcado en Tarjeta */}
        <Card className="rounded-3xl border-slate-200 shadow-lg bg-white/90 backdrop-blur-md">
          <CardHeader className="pb-4 border-b border-slate-100 mb-4 px-8 pt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-2xl font-bold text-slate-900">Historial Detallado</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-500">Mes:</span>
                <div className="w-[140px]">
                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger className="w-full h-10 bg-slate-50 border-slate-200 text-slate-700 text-sm font-bold rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm">
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos los meses</SelectItem>
                      {periodOptions.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-4">
            {filteredExpenses.length === 0 ? (
               <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <div className="bg-white p-4 rounded-full mb-4 shadow-sm border border-slate-100">
                    <FileText size={32} className="text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Sin Gastos</h3>
                  <p className="text-slate-500 mt-2 max-w-sm">No hay egresos registrados en este periodo. Utiliza el formulario para añadir un nuevo recibo.</p>
               </div>
            ) : (
              filteredExpenses.map((expense) => {
                const style = getCategoryDetails(expense.category);
                return (
                  <div key={expense.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:bg-white hover:border-slate-200 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    
                    {/* Left: Icon & Info */}
                    <div className="flex items-center gap-5">
                      <div className={`h-14 w-14 rounded-2xl ${style.bg} ${style.border} border flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        {style.icon}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-lg mb-0.5">{expense.description}</p>
                        <p className="text-xs font-bold text-slate-500 tracking-wider uppercase flex items-center gap-2">
                          {new Date(expense.expense_date).toLocaleDateString("es-MX", { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                          <span>•</span>
                          <span className="text-indigo-600">{expense.category}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right: Amount & Delete */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-0 border-slate-200 pt-4 sm:pt-0 mt-2 sm:mt-0">
                      <div className="text-left sm:text-right">
                        <div className="text-2xl font-black text-slate-900">
                          ${expense.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] font-black text-emerald-600 tracking-widest uppercase mt-1">
                          Pagado
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => setExpenseToDelete(expense.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-400 shadow-sm"
                        title="Eliminar Gasto"
                      >
                        <X size={16} strokeWidth={2.5} />
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

      </div>

      {/* Modal de Confirmación de Borrado */}
      <Dialog open={expenseToDelete !== null} onOpenChange={(val) => { if (!val) setExpenseToDelete(null) }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Eliminar Gasto</DialogTitle>
            <DialogDescription className="text-base mt-2">
              ¿Estás seguro de que deseas eliminar permanentemente este registro de gasto? 
              <br/><br/>
              Esta acción no se puede deshacer y el egreso desaparecerá del reporte financiero.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3">
            <Button variant="outline" className="rounded-xl flex-1" onClick={() => setExpenseToDelete(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" className="rounded-xl flex-1 bg-rose-600 hover:bg-rose-700" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Sí, Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
