"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingDown, TrendingUp, BarChart3, PieChart as PieChartIcon, DownloadCloud } from "lucide-react";
import { fetchDelinquency, fetchIncomeVsExpected } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface DelinquencyReport {
  total_debt: number;
  ranking: { house_number: number; debt: number }[];
  distribution: {
    al_corriente: number;
    un_mes: number;
    dos_meses: number;
    tres_o_mas: number;
  };
}

interface IncomeReport {
  period: string;
  expected: number;
  identified_income: number;
  unidentified_income: number;
  total_income: number;
  expenses: number;
  balance: number;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [delinquency, setDelinquency] = useState<DelinquencyReport | null>(null);
  const [income, setIncome] = useState<IncomeReport | null>(null);

  // default to previous month period e.g. Jun-26 if current is Jul
  const [currentPeriod, setCurrentPeriod] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return format(d, "MMM-yy");
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [delinqData, incomeData] = await Promise.all([
          fetchDelinquency(),
          fetchIncomeVsExpected(currentPeriod)
        ]);
        setDelinquency(delinqData);
        setIncome(incomeData);
      } catch (err) {
        console.error("Error loading reports", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentPeriod]);

  if (loading || !delinquency || !income) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  const PIE_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
  const distributionData = [
    { name: 'Al corriente', value: delinquency.distribution.al_corriente },
    { name: '1 Mes', value: delinquency.distribution.un_mes },
    { name: '2 Meses', value: delinquency.distribution.dos_meses },
    { name: '3+ Meses', value: delinquency.distribution.tres_o_mas },
  ].filter(d => d.value > 0);

  const incomeVsExpenseData = [
    { name: 'Esperado (Cuotas)', amount: income.expected },
    { name: 'Ingresos Reales', amount: income.total_income },
    { name: 'Egresos', amount: income.expenses }
  ];

  const handleDownloadPDF = () => {
    window.print();
  };

  // Generar últimos 12 meses dinámicamente
  const periodOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return format(d, "MMM-yy");
  });

  return (
    <div id="reports-dashboard" className="mx-auto max-w-7xl space-y-8 bg-white p-4 rounded-xl">

      {/* Selector de periodo y Botón PDF */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Panel de Reportes</h2>
          <p className="text-muted-foreground">Resumen financiero y de morosidad de la privada.</p>
        </div>
        <div id="pdf-controls" className="flex items-center gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Periodo:</label>
            <select
              className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={currentPeriod}
              onChange={(e) => setCurrentPeriod(e.target.value)}
            >
              {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <Button
            variant="default"
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={handleDownloadPDF}
          >
            <DownloadCloud size={16} />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="print:break-inside-avoid print:shadow-none print:border-slate-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance del Mes ({income.period})</CardTitle>
            {income.balance >= 0 ? <TrendingUp className="text-green-500" size={20} /> : <TrendingDown className="text-red-500" size={20} />}
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${income.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${income.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ingresos (${income.total_income}) - Egresos (${income.expenses})
            </p>
          </CardContent>
        </Card>

        <Card className="print:break-inside-avoid print:shadow-none print:border-slate-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cartera Vencida Global</CardTitle>
            <BarChart3 className="text-red-500" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              ${delinquency.total_debt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Deuda total acumulada de todas las casas
            </p>
          </CardContent>
        </Card>

        <Card className="print:break-inside-avoid print:shadow-none print:border-slate-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia de Cobranza</CardTitle>
            <PieChartIcon className="text-blue-500" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {income.expected > 0 ? Math.round((income.total_income / income.expected) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ingresos vs Lo esperado en el mes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Income vs Expenses Chart */}
        <Card className="print:break-inside-avoid print:shadow-none print:border-slate-300">
          <CardHeader>
            <CardTitle>Ingresos vs Egresos ({income.period})</CardTitle>
            <CardDescription>Comparativa de lo esperado, recaudado y gastado.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeVsExpenseData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" />
                <YAxis />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip formatter={(value: any) => `$${Number(value || 0).toLocaleString()}`} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Delinquency Pie Chart */}
        <Card className="print:break-inside-avoid print:shadow-none print:border-slate-300">
          <CardHeader>
            <CardTitle>Estado de Morosidad</CardTitle>
            <CardDescription>Distribución de casas según su atraso.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Debtors Table */}
      <Card className="print:break-inside-avoid print:shadow-none print:border-slate-300">
        <CardHeader>
          <CardTitle>Top Deudores (Ranking)</CardTitle>
          <CardDescription>Las 10 casas con mayor rezago histórico acumulado.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-16 text-center">Top</TableHead>
                  <TableHead>Casa</TableHead>
                  <TableHead className="text-right">Deuda Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delinquency.ranking.map((h, index: number) => (
                  <TableRow key={h.house_number}>
                    <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                    <TableCell className="font-bold">Casa {String(h.house_number).padStart(2, '0')}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      ${h.debt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
