"use client";

import { useEffect, useState } from "react";
import { fetchUnidentifiedPayments, fetchHouses, Payment, House, assignPayment } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Landmark, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UnidentifiedPaymentsPage() {
  const [unidentified, setUnidentified] = useState<Payment[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Local state to store selected house before confirmation
  const [selectedHouses, setSelectedHouses] = useState<Record<number, number>>({});
  // Local state for loading state of individual confirmation buttons
  const [isSubmitting, setIsSubmitting] = useState<Record<number, boolean>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsData, housesData] = await Promise.all([
        fetchUnidentifiedPayments(),
        fetchHouses()
      ]);
      setUnidentified(paymentsData);
      setHouses(housesData);
    } catch (err) {
      toast.error("Error al cargar datos: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleHouseSelect = (paymentId: number, houseId: number) => {
    setSelectedHouses(prev => ({ ...prev, [paymentId]: houseId }));
  };

  const handleConfirm = async (paymentId: number) => {
    const houseId = selectedHouses[paymentId];
    if (!houseId) return;

    setIsSubmitting(prev => ({ ...prev, [paymentId]: true }));
    try {
      await assignPayment(paymentId, houseId);
      toast.success("Pago asignado correctamente.");
      // Remove from list locally to feel faster, or just reload data
      setUnidentified(prev => prev.filter(p => p.id !== paymentId));
      setSelectedHouses(prev => {
        const next = { ...prev };
        delete next[paymentId];
        return next;
      });
    } catch (err) {
      console.error(err);
      toast.error("Error asignando el pago");
    } finally {
      setIsSubmitting(prev => ({ ...prev, [paymentId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Calculate KPIs
  const totalPagos = unidentified.length;
  const montoRetenido = unidentified.reduce((acc, p) => acc + p.amount, 0);

  // Group by month
  const groupedPayments = [...unidentified]
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
    .reduce((acc, p) => {
      const date = new Date(p.payment_date);
      // Ensure UTC or parse safely to avoid timezone shifts
      // Since it's ISO date string from DB, we can just use it directly
      const monthYear = date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      const key = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {} as Record<string, Payment[]>);

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-12 space-y-12">
      
      {/* Header & KPIs */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-[2px] w-8 bg-slate-400"></div>
            <p className="text-xs font-semibold text-slate-500 tracking-widest uppercase">Finanzas & Gestión</p>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Conciliación de Pagos</h1>
          <p className="text-slate-500 mt-3 text-lg leading-relaxed">
            Resuelve los depósitos no identificados asignándolos a sus respectivas casas para mantener el flujo de caja actualizado.
          </p>
        </div>

        <div className="flex gap-4 flex-col sm:flex-row w-full lg:w-auto">
          {/* KPI: Pagos por conciliar */}
          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white min-w-[220px]">
            <CardContent className="p-6 relative">
              <div className="absolute top-6 right-6 w-2.5 h-2.5 bg-rose-500 rounded-full"></div>
              <p className="text-xs font-bold text-slate-500 tracking-wider mb-2">PAGOS POR CONCILIAR</p>
              <h2 className="text-4xl font-black text-slate-900">{totalPagos}</h2>
            </CardContent>
          </Card>

          {/* KPI: Monto retenido */}
          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white min-w-[260px]">
            <CardContent className="p-6 relative">
              <div className="absolute top-6 right-6 bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Retenido</div>
              <p className="text-xs font-bold text-slate-500 tracking-wider mb-2">MONTO RETENIDO</p>
              <h2 className="text-4xl font-black text-slate-900">
                ${montoRetenido.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h2>
            </CardContent>
          </Card>
        </div>
      </div>

      {totalPagos === 0 ? (
        <div className="bg-emerald-50/50 rounded-2xl p-12 text-center border border-emerald-100 flex flex-col items-center">
          <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
          <h3 className="text-2xl font-bold text-slate-900">¡Todo al día!</h3>
          <p className="text-slate-500 mt-2">No tienes depósitos pendientes por identificar.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedPayments).map(([month, payments]) => (
            <div key={month}>
              
              {/* Month Divider */}
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-2xl font-semibold text-slate-900">{month}</h3>
                <div className="h-px flex-grow bg-slate-200"></div>
                <span className="text-sm font-medium text-slate-400">{payments.length} transacciones</span>
              </div>

              {/* Transactions List */}
              <div className="space-y-4">
                {payments.map(p => (
                  <Card key={p.id} className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white overflow-visible">
                    <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      
                      {/* Left: Icon, Date, Desc */}
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Landmark size={24} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {new Date(p.payment_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                          </p>
                          <p className="font-semibold text-slate-800 text-lg">
                            {p.description || "TRANSFERENCIA SPEI"}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Amount */}
                      <div className="text-3xl font-black text-slate-900 md:ml-auto">
                        ${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex-grow md:w-56">
                          <Select 
                            value={selectedHouses[p.id]?.toString() || ""}
                            onValueChange={(val) => handleHouseSelect(p.id, parseInt(val))}
                          >
                            <SelectTrigger className="w-full h-[46px] bg-slate-50 border-slate-200 text-slate-700 text-sm font-medium rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm">
                              <SelectValue placeholder="Seleccionar Casa..." />
                            </SelectTrigger>
                            <SelectContent>
                              {houses.map(h => (
                                <SelectItem key={h.id} value={h.id.toString()}>
                                  Casa {h.number.toString().padStart(2, '0')} - Debe ${h.current_debt.toLocaleString('en-US')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          onClick={() => handleConfirm(p.id)}
                          disabled={!selectedHouses[p.id] || isSubmitting[p.id]}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl px-6 py-3 h-auto"
                        >
                          {isSubmitting[p.id] ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <>
                              Confirmar <CheckCircle2 size={16} className="ml-2" />
                            </>
                          )}
                        </Button>
                      </div>

                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
