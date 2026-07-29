"use client";

import { useEffect, useState } from "react";
import { fetchExpenses, createExpense, deleteExpense, Expense } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Mantenimiento");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return format(d, "MMM-yy");
  }); // e.g. Jun-26
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generar últimos 12 meses dinámicamente
  const periodOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return format(d, "MMM-yy");
  });

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await fetchExpenses();
      setExpenses(data);
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
      // Reset form
      setAmount("");
      setDescription("");
      loadExpenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este gasto?")) return;
    try {
      await deleteExpense(id);
      toast.success("Gasto eliminado");
      loadExpenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  const categories = ["Mantenimiento", "Seguridad", "Servicios", "Jardinería", "Otros"];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      
      <div className="grid gap-6 md:grid-cols-[350px_1fr]">
        
        {/* Formulario */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Registrar Gasto</CardTitle>
            <CardDescription>Añade un nuevo egreso de la privada.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Monto ($)</label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  placeholder="Ej. 1500.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descripción</label>
                <Input 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Ej. Pago de CFE"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha del Gasto</label>
                <Input 
                  type="date" 
                  value={expenseDate} 
                  onChange={e => setExpenseDate(e.target.value)} 
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Periodo Asociado</label>
                <select
                  id="period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <PlusCircle size={16} />}
                Registrar Gasto
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Gastos</CardTitle>
            <CardDescription>Listado de todos los egresos registrados en el sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="py-8 text-center text-slate-500">No hay gastos registrados aún.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{new Date(expense.expense_date).toLocaleDateString("es-MX")}</TableCell>
                        <TableCell><span className="font-medium text-slate-700">{expense.category}</span></TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>{expense.period}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          ${expense.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(expense.id)}
                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
