"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, DownloadCloud, Wallet, ArrowDownToLine, ArrowUpFromLine, Receipt, CheckCircle2 } from "lucide-react";
import { fetchDelinquency, fetchIncomeVsExpected, fetchExpenses, Expense, DelinquencyReport, IncomeReport } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { formatPeriod } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [delinquency, setDelinquency] = useState<DelinquencyReport | null>(null);
  const [income, setIncome] = useState<IncomeReport | null>(null);
  const [incomeHistory, setIncomeHistory] = useState<IncomeReport[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedService, setSelectedService] = useState("Luz");

  // Generar últimos 12 meses dinámicamente
  const periodOptions = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      return formatPeriod(d);
    });
  }, []);

  // default to previous month period e.g. Jun-26 if current is Jul
  const [currentPeriod, setCurrentPeriod] = useState(periodOptions[1] || periodOptions[0]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const currentIndex = periodOptions.indexOf(currentPeriod);
        const last6Periods = periodOptions.slice(currentIndex, currentIndex + 6).reverse();

        const [delinqData, expensesData, ...historyData] = await Promise.all([
          fetchDelinquency(),
          fetchExpenses(),
          ...last6Periods.map(p => fetchIncomeVsExpected(p).catch(() => null))
        ]);

        const validHistory = historyData.filter(Boolean) as IncomeReport[];
        const currentIncome = validHistory.find(h => h.period === currentPeriod);

        setDelinquency(delinqData);
        setIncomeHistory(validHistory);
        setIncome(currentIncome || null);
        setExpenses(expensesData);
      } catch (err) {
        console.error("Error loading reports", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentPeriod, periodOptions]);

  const serviceChartData = useMemo(() => {
    const summary: Record<string, number> = {};
    expenses
      .filter(e => e.category === selectedService)
      .forEach(e => {
        summary[e.period] = (summary[e.period] || 0) + e.amount;
      });

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return Object.entries(summary)
      .map(([period, amount]) => ({ period, amount }))
      .sort((a, b) => {
        const [m1, y1] = a.period.split('-');
        const [m2, y2] = b.period.split('-');
        const d1 = new Date(2000 + parseInt(y1 || '26'), monthNames.indexOf(m1) !== -1 ? monthNames.indexOf(m1) : 0, 1);
        const d2 = new Date(2000 + parseInt(y2 || '26'), monthNames.indexOf(m2) !== -1 ? monthNames.indexOf(m2) : 0, 1);
        return d1.getTime() - d2.getTime();
      });
  }, [expenses, selectedService]);

  if (loading || !delinquency || !income) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Soft Premium Colors
  const PIE_COLORS = ['#10b981', '#fcd34d', '#f97316', '#ef4444'];
  const distributionData = [
    { name: 'Al corriente', value: delinquency.distribution.al_corriente },
    { name: '1 Mes', value: delinquency.distribution.un_mes },
    { name: '2 Meses', value: delinquency.distribution.dos_meses },
    { name: '3+ Meses', value: delinquency.distribution.tres_o_mas },
  ].filter(d => d.value > 0);

  // Grouped Bar Chart Data (last 6 months)
  const incomeVsExpenseData = incomeHistory.map(h => ({
    name: h.period,
    'Esperado': h.expected,
    'Ingresos Reales': h.total_income,
    'Egresos': h.expenses
  }));

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div id="reports-dashboard" className="mx-auto max-w-7xl p-6 md:p-10 space-y-8">

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-[2px] w-6 bg-slate-400"></div>
            <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Financial Intelligence</p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Centro de Reportes</h1>
        </div>

        <div id="pdf-controls" className="flex items-center gap-3 print:hidden">
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mes:</label>
            <Select value={currentPeriod} onValueChange={setCurrentPeriod}>
              <SelectTrigger className="w-[110px] h-8 border-0 shadow-none focus:ring-0 p-0 text-sm font-bold text-slate-900 bg-transparent">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(p => (
                  <SelectItem key={p} value={p} className="font-medium text-sm">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 h-[44px] shadow-sm flex items-center gap-2"
            onClick={handleDownloadPDF}
          >
            <DownloadCloud size={16} />
            <span className="text-sm font-medium">Exportar PDF</span>
          </Button>
        </div>
      </div>

      {/* KPIs Superiores - Compactos */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

        {/* KPI: Ingresos Totales */}
        <Card className="rounded-2xl border-slate-200 shadow-sm bg-white/90 backdrop-blur-md print:shadow-none print:border-slate-300 print:break-inside-avoid">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ingresos Totales</p>
              <div className="w-8 h-8 flex items-center justify-center bg-indigo-50 rounded-full text-indigo-500">
                <ArrowDownToLine size={16} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              ${income.total_income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
            <div className="w-16 h-1 bg-indigo-500 rounded-full"></div>
          </CardContent>
        </Card>

        {/* KPI: Egresos Totales */}
        <Card className="rounded-2xl border-slate-200 shadow-sm bg-white/90 backdrop-blur-md print:shadow-none print:border-slate-300 print:break-inside-avoid">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Egresos Totales</p>
              <div className="w-8 h-8 flex items-center justify-center bg-rose-50 rounded-full text-rose-500">
                <ArrowUpFromLine size={16} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              ${income.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
            <div className="w-16 h-1 bg-rose-500 rounded-full"></div>
          </CardContent>
        </Card>

        {/* KPI: Cartera Vencida */}
        <Card className="rounded-2xl border-slate-200 shadow-sm bg-white/90 backdrop-blur-md print:shadow-none print:border-slate-300 print:break-inside-avoid">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cartera Vencida</p>
              <div className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500">
                <Wallet size={16} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              ${delinquency.total_debt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
            <div className="w-16 h-1 bg-slate-800 rounded-full"></div>
          </CardContent>
        </Card>

        {/* KPI: Eficiencia de Cobranza */}
        <Card className="rounded-2xl border-slate-200 shadow-sm bg-white/90 backdrop-blur-md print:shadow-none print:border-slate-300 print:break-inside-avoid">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Eficiencia</p>
              <div className="w-8 h-8 flex items-center justify-center bg-emerald-50 rounded-full text-emerald-500">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              {income.expected > 0 ? Math.round((income.total_income / income.expected) * 100) : 0}%
            </h2>
            <div className="w-16 h-1 bg-emerald-500 rounded-full"></div>
          </CardContent>
        </Card>

      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* Flujo de Caja Mensual (Ocupa 2 columnas) */}
        <Card className="lg:col-span-2 rounded-2xl border-slate-200 shadow-sm bg-white/90 backdrop-blur-md print:shadow-none print:border-slate-300 print:break-inside-avoid">
          <CardHeader className="p-6 pb-2 flex flex-col sm:flex-row sm:items-start justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">Flujo de Caja Mensual</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">Comparativa de esperado, ingresos y egresos operativos ({income.period})</CardDescription>
            </div>
            <div className="flex gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-4 sm:mt-0">
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div> Esperado</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div> Ingresos</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Egresos</span>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeVsExpenseData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }} barGap={2}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  formatter={(value) => [`$${Number(value || 0).toLocaleString('en-US')}`, '']}
                />
                <Bar dataKey="Esperado" fill="#cbd5e1" radius={[6, 6, 6, 6]} />
                <Bar dataKey="Ingresos Reales" fill="#6366f1" radius={[6, 6, 6, 6]} />
                <Bar dataKey="Egresos" fill="#f43f5e" radius={[6, 6, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tendencia de Morosidad (Pastel adaptado) */}
        <Card className="rounded-2xl border-slate-200 shadow-sm bg-white/90 backdrop-blur-md print:shadow-none print:border-slate-300 print:break-inside-avoid">
          <CardHeader className="p-6 pb-0">
            <CardTitle className="text-xl font-bold text-slate-900">Estado de Morosidad</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">Distribución actual de deudores.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] p-2 flex flex-col justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* Service Expense Chart */}
        <Card className="lg:col-span-2 rounded-2xl border-slate-200 shadow-sm bg-white/90 backdrop-blur-md print:shadow-none print:border-slate-300 print:break-inside-avoid">
          <CardHeader className="p-6 pb-2 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">Análisis de Servicios</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">Desglose de costos operativos históricos por categoría.</CardDescription>
            </div>

            <div className="w-[180px]">
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="w-full h-9 bg-slate-50 border-slate-200 text-slate-700 text-xs font-bold rounded-lg focus:ring-1 focus:ring-indigo-500">
                  <SelectValue placeholder="Servicio" />
                </SelectTrigger>
                <SelectContent>
                  {["Luz", "Agua", "Mantenimiento", "Seguridad", "Servicios", "Jardinería", "Otros"].map(cat => (
                    <SelectItem key={cat} value={cat} className="text-xs font-medium">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </CardHeader>
          <CardContent className="px-6 pb-6 h-[260px]">
            {serviceChartData.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center text-slate-400">
                <Receipt size={28} className="mb-2 text-slate-300" />
                <p className="text-sm">No hay datos registrados para {selectedService}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceChartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }} barSize={32}>
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    formatter={(value) => [`$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, selectedService]}
                  />
                  <Bar dataKey="amount" fill="#0ea5e9" radius={[6, 6, 6, 6]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Debtors List */}
        <Card className="rounded-2xl border-slate-200 shadow-sm bg-white/90 backdrop-blur-md print:shadow-none print:border-slate-300 print:break-inside-avoid">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-xl font-bold text-slate-900">Top Deudores</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">Ranking de las casas con mayor atraso.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {delinquency.ranking.length === 0 ? (
              <div className="py-8 text-center text-emerald-500 font-bold flex flex-col items-center text-sm">
                <CheckCircle2 size={24} className="mb-2" />
                ¡No hay deudores registrados!
              </div>
            ) : (
              <div className="space-y-3">
                {delinquency.ranking.slice(0, 5).map((h, index: number) => (
                  <div key={h.house_number} className="flex items-center justify-between group py-1 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 group-hover:bg-slate-200 transition-colors">
                        {index + 1}
                      </div>
                      <span className="text-sm font-bold text-slate-700">Casa {String(h.house_number).padStart(2, '0')}</span>
                    </div>
                    <div className="text-sm font-black text-rose-600">
                      ${h.debt.toLocaleString('en-US')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
