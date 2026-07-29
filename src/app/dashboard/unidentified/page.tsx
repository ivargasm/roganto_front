"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchUnidentifiedPayments, fetchHouses, Payment, House, assignPayment } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function UnidentifiedPaymentsPage() {
  const router = useRouter();
  const [unidentified, setUnidentified] = useState<Payment[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const paymentsData = await fetchUnidentifiedPayments();
      const housesData = await fetchHouses();
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

  const handleAssign = async (paymentId: number, houseId: number) => {
    try {
      await assignPayment(paymentId, houseId);
      toast.success("Pago asignado correctamente.");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error asignando el pago");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-12">
      <div className="mx-auto max-w-5xl space-y-8">
        
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft size={16} className="mr-2" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold">Pagos No Identificados</h1>
        </div>

        {unidentified.length === 0 ? (
          <Card className="border-0 shadow-lg bg-green-50/80 backdrop-blur">
            <CardContent className="pt-6">
              <p className="text-green-700 font-medium text-center text-lg">¡Excelente! No tienes ningún pago sin identificar en este momento.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-orange-800">Acción Requerida</CardTitle>
              <CardDescription className="text-slate-500">
                Estos {unidentified.length} depósitos no traen centavos ni un concepto claro. Por favor, asígnalos manualmente a la casa correspondiente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {unidentified.map(p => (
                  <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between bg-orange-50/30 p-4 rounded-lg shadow-sm border border-orange-100 gap-4">
                    <div>
                      <p className="font-bold text-slate-800 text-lg">${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      <p className="text-sm text-slate-500">{p.description} • {new Date(p.payment_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select 
                        className="bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm"
                        onChange={(e) => {
                          if(e.target.value) handleAssign(p.id, parseInt(e.target.value));
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Asignar a Casa...</option>
                        {houses.map(h => (
                          <option key={h.id} value={h.id}>Casa {h.number.toString().padStart(2, '0')} (Debe ${h.current_debt.toLocaleString('en-US')})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
