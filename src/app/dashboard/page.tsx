"use client";

import { useEffect, useState } from "react";
import { fetchHouses, House, fetchUnidentifiedPayments, Payment, fetchDelinquency, fetchIncomeVsExpected, fetchExpenses, Expense } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Wallet, AlertTriangle, CheckCircle2, Shield, Zap, Droplet, CircleDollarSign } from "lucide-react";
import Link from "next/link";
import PdfUploader from "./PdfUploader";
import { useRouter } from "next/navigation";
import { formatPeriod } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface IncomeReport {
  period: string;
  expected: number;
  identified_income: number;
  unidentified_income: number;
  total_income: number;
  expenses: number;
  balance: number;
}

interface FlowData {
  month: string;
  Ingresos: number;
  Egresos: number;
  period: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Data states
  const [houses, setHouses] = useState<House[]>([]);
  const [unidentified, setUnidentified] = useState<Payment[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [currentIncome, setCurrentIncome] = useState<IncomeReport | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [flowData, setFlowData] = useState<FlowData[]>([]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Get last 6 months for flow, ending in the previous month (same as reports default)
      const periods = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - 1 - i); // Shift by 1 to make previous month the latest
        return formatPeriod(d);
      }).reverse();

      const [housesData, unidentData, delinqData, expensesData, ...flowPromises] = await Promise.all([
        fetchHouses(),
        fetchUnidentifiedPayments(),
        fetchDelinquency(),
        fetchExpenses(),
        ...periods.map(p => fetchIncomeVsExpected(p))
      ]);

      setHouses(housesData);
      setUnidentified(unidentData);
      setTotalDebt(delinqData.total_debt);
      setExpenses(expensesData);

      const flowResults = flowPromises.map((res, i) => ({
        month: periods[i].split('-')[0].toUpperCase(),
        Ingresos: res.total_income,
        Egresos: res.expenses,
        period: periods[i]
      }));

      setFlowData(flowResults);
      setCurrentIncome(flowPromises[flowPromises.length - 1]); // the latest one (current month)

    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !currentIncome) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  const eficiencia = currentIncome.expected > 0 ? Math.round((currentIncome.total_income / currentIncome.expected) * 100) : 0;
  const casasAlCorriente = houses.filter(h => h.current_debt <= 0).length;

  // Últimos 5 egresos
  const ultimosEgresos = [...expenses].sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()).slice(0, 5);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Luz": return <Zap size={16} className="text-amber-500" />;
      case "Agua": return <Droplet size={16} className="text-blue-500" />;
      case "Seguridad": return <Shield size={16} className="text-slate-700" />;
      default: return <CircleDollarSign size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-12 space-y-8">
      
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Resumen financiero y estado de cuenta global</p>
        </div>
        <div className="flex items-center gap-4">
          <PdfUploader onUploadSuccess={() => loadData(true)} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl border-slate-200 shadow-lg bg-white/80 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
                <Wallet size={24} />
              </div>
              <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                Balance Mes
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 tracking-wider">BALANCE TOTAL</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-1">${currentIncome.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-lg bg-white/80 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="bg-rose-50 text-rose-600 p-3 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div className="bg-rose-50 text-rose-700 text-xs font-bold px-2 py-1 rounded-full">
                {houses.length - casasAlCorriente} Casas
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 tracking-wider">CARTERA VENCIDA</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-1">${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-lg bg-white/80 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
                <CheckCircle2 size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 tracking-wider">EFICIENCIA</p>
                <h2 className="text-3xl font-bold text-slate-900 mt-1">{eficiencia}%</h2>
              </div>
              {/* Fake circular progress */}
              <div className="h-12 w-12 rounded-full border-4 border-indigo-100 flex items-center justify-center border-t-indigo-600 border-r-indigo-600 transform rotate-45">
                <div className="h-full w-full rounded-full border-4 border-transparent flex items-center justify-center -rotate-45">
                   <CheckCircle2 size={16} className="text-indigo-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-lg bg-white/80 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
                <Shield size={24} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 tracking-wider">CASAS AL CORRIENTE</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-1">{casasAlCorriente} <span className="text-sm font-medium text-slate-500">de {houses.length}</span></h2>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banner */}
      {unidentified.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600/30 p-3 rounded-full text-indigo-300">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Conciliación Pendiente</h3>
              <p className="text-slate-400 text-sm">Existen {unidentified.length} pagos no identificados que requieren tu revisión para aplicarse al historial.</p>
            </div>
          </div>
          <Button onClick={() => router.push('/dashboard/unidentified')} className="mt-4 md:mt-0 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full px-6 transition-colors">
            Conciliar ahora <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      )}

      {/* Main Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Chart */}
        <Card className="lg:col-span-2 rounded-2xl border-slate-200 shadow-lg bg-white/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl">Flujo de Efectivo</CardTitle>
              <CardDescription>ÚLTIMOS 6 MESES • RESIDENCIAL 88</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Ingresos</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-200"></div> Egresos</div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barGap={4} barSize={14}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="Ingresos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Egresos" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Últimos Egresos */}
        <Card className="rounded-2xl border-slate-200 shadow-lg bg-white/80 backdrop-blur-md flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl">Últimos Egresos</CardTitle>
            <Link href="/dashboard/expenses" className="text-sm text-indigo-600 hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-4">
            <div className="space-y-4">
              {ultimosEgresos.map(e => (
                <div key={e.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-full">
                      {getCategoryIcon(e.category)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{e.category}</p>
                      <p className="text-xs text-slate-500">{new Date(e.expense_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-rose-600">-${e.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              ))}
              {ultimosEgresos.length === 0 && <p className="text-sm text-slate-500">No hay egresos recientes.</p>}
            </div>

            <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs font-semibold text-slate-900 italic">Consejo Residencial</p>
              <p className="text-xs text-slate-600 mt-1">Optimiza el gasto energético programando el encendido de áreas comunes.</p>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
