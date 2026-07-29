"use client";

import { useEffect, useState } from "react";
import { fetchHouses, House } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, AlertCircle, HelpCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import PdfUploader from "./PdfUploader";
import { fetchUnidentifiedPayments, Payment } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unidentified, setUnidentified] = useState<Payment[]>([]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchHouses();
      setHouses(data);
      const unident = await fetchUnidentifiedPayments();
      setUnidentified(unident);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalDebt = houses.reduce((acc, h) => acc + (h.current_debt > 0 ? h.current_debt : 0), 0);
  const totalInDebt = houses.filter(h => h.current_debt > 0).length;

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-12">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header section with Glassmorphism */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl bg-white/60 p-6 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/40">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Estado de Cuenta Global</h1>
            <p className="text-slate-500 mt-2">Gestión financiera de la privada Roganto</p>
          </div>
          <div className="flex gap-4">
            <PdfUploader onUploadSuccess={() => loadData(true)} />
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Cartera Vencida Total</CardTitle>
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <DollarSign size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Casas con Adeudo</CardTitle>
              <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                <AlertCircle size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{totalInDebt} / {houses.length}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Pagos No Identificados</CardTitle>
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <HelpCircle size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{unidentified.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Unidentified Payments Section Summary */}
        {unidentified.length > 0 && (
          <Card className="border-0 shadow-xl bg-orange-50/80 backdrop-blur border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-orange-800">Acción Requerida: Pagos No Identificados</CardTitle>
                <CardDescription className="text-orange-700 mt-1">Tienes {unidentified.length} depósito(s) pendiente(s) por asignar manualmente.</CardDescription>
              </div>
              <Button onClick={() => router.push('/dashboard/unidentified')} className="bg-orange-600 hover:bg-orange-700 text-white font-medium">
                Ver Pagos <ArrowRight size={16} className="ml-2" />
              </Button>
            </CardHeader>
          </Card>
        )}

        {/* Houses Table */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur overflow-hidden">
          <CardHeader className="bg-slate-100/50">
            <CardTitle>Detalle por Casa</CardTitle>
            <CardDescription>Resumen del estado de cuenta de cada casa.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">Casa</TableHead>
                  <TableHead className="font-semibold text-slate-600">Estatus</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">Deuda Actual</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {houses.map((h) => (
                  <TableRow key={h.id} className="hover:bg-blue-50/50 transition-colors">
                    <TableCell className="font-medium text-slate-900">
                      Casa {h.number.toString().padStart(2, '0')}
                    </TableCell>
                    <TableCell>
                      {h.current_debt <= 0 ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200 border-0">
                          Al Corriente
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200 border-0">
                          Con Adeudo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-700">
                      ${h.current_debt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/house/${h.id}`}>
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          Ver Detalle
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
