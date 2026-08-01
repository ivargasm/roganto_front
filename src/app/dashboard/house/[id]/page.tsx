"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { fetchHouse, House, unassignPayment } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, DownloadCloud, ArrowUpRight, ArrowDownLeft, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function HouseDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [house, setHouse] = useState<House | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentToUnassign, setPaymentToUnassign] = useState<number | null>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

  useEffect(() => {
    fetchHouse(parseInt(params.id))
      .then(setHouse)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !house) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-rose-500 font-bold text-xl">
        {error || "Casa no encontrada"}
      </div>
    );
  }

  // Combinar pagos y cargos cronológicamente para el estado de cuenta
  const history: Array<{
    id: string;
    type: 'charge' | 'payment';
    date: Date;
    description: string;
    amount: number;
    ref?: string;
  }> = [];

  house.charges.forEach(c => {
    // Convertir "Ene-26" a una fecha real aproximada (día 1 del mes) para ordenar correctamente
    const [monthStr, yearStr] = c.period.split('-');
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthIndex = monthNames.indexOf(monthStr) !== -1 ? monthNames.indexOf(monthStr) : 5; 
    const chargeDate = new Date(2000 + parseInt(yearStr || '26'), monthIndex, 1);

    history.push({
      id: `c_${c.id}`,
      type: 'charge',
      date: chargeDate,
      description: `Mensualidad ${c.period}`,
      amount: c.amount,
      ref: `Ref: CAR-${c.id}`
    });
  });

  house.payments.forEach(p => {
    const pDate = new Date(p.payment_date);
    history.push({
      id: `p_${p.id}`,
      type: 'payment',
      date: pDate,
      description: p.description || 'Transferencia SPEI',
      amount: p.amount,
      ref: `Ref: PAGO-${p.id}`
    });
  });

  // Agregar el saldo inicial como primer concepto histórico
  history.push({
    id: 'initial',
    type: 'charge',
    date: new Date('2025-12-31T12:00:00Z'), // Justo antes de Enero 2026
    description: 'Saldo Histórico Acumulado',
    amount: house.initial_balance,
    ref: 'Ref: INICIAL'
  });

  // Ordenar por fecha DESCENDENTE (más reciente primero)
  history.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Group by Month
  const groupedHistory = history.reduce((acc, item) => {
    const monthYear = item.date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const key = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, typeof history>);

  const handlePrintPDF = () => {
    if (!house) return;

    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(`Estado de Cuenta - Casa ${house.number.toString().padStart(2, '0')}`, 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Deuda Actual: $${house.current_debt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 14, 32);
    doc.text(`Fecha de Impresión: ${new Date().toLocaleDateString('es-MX')}`, 14, 38);

    // Sort ascending for the PDF so it reads like a standard bank statement (oldest to newest)
    const pdfHistory = [...history].reverse();
    
    const tableBody = pdfHistory.map(item => [
      item.date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
      item.description,
      item.type === 'charge' ? `$${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '',
      item.type === 'payment' ? `$${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Fecha', 'Concepto', 'Cargo', 'Abono']],
      body: tableBody,
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { cellPadding: 4, fontSize: 10, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 35, halign: 'right', textColor: [220, 38, 38] }, // red-600
        3: { cellWidth: 35, halign: 'right', textColor: [22, 163, 74] } // green-600
      }
    });

    doc.save(`Estado_Cuenta_Casa_${house.number.toString().padStart(2, '0')}.pdf`);
  };

  const houseNumberFormatted = house.number.toString().padStart(2, '0');

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-12 space-y-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/houses')} className="rounded-full h-8 w-8 bg-slate-100 hover:bg-slate-200">
              <ArrowLeft size={16} className="text-slate-700" />
            </Button>
            <p className="text-xs font-semibold text-slate-500 tracking-widest uppercase">Residencial 88</p>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Casa {houseNumberFormatted} — Estado de Cuenta
          </h1>
        </div>
        <Button 
          onClick={handlePrintPDF}
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 py-5 shadow-md flex items-center gap-2"
        >
          <DownloadCloud size={18} />
          Exportar PDF
        </Button>
      </div>

      {/* Hero Card */}
      <Card className="rounded-3xl border-slate-200 shadow-xl bg-white/90 backdrop-blur-md overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50/50 -z-10"></div>
        <CardContent className="p-10 md:p-16">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <p className="text-sm font-bold text-slate-500 tracking-wider mb-3">SALDO ACTUAL</p>
              <h2 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter">
                ${house.current_debt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="mt-2 md:mt-0">
              {house.current_debt > 0 ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  CON ADEUDO
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  AL CORRIENTE
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <div className="space-y-12 pt-4">
        {Object.entries(groupedHistory).map(([month, items]) => (
          <div key={month}>
            <h3 className="text-2xl font-bold text-slate-900 mb-6">{month}</h3>
            
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                  
                  {/* Left: Icon & Details */}
                  <div className="flex items-center gap-5">
                    {item.type === 'charge' ? (
                      <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                        <ArrowUpRight size={24} className="text-rose-500" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <ArrowDownLeft size={24} className="text-indigo-500" />
                      </div>
                    )}
                    
                    <div>
                      <p className="font-bold text-slate-900 text-lg">{item.description}</p>
                      <p className="text-sm font-medium text-slate-500 mt-0.5">
                        {item.date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })} 
                        {item.ref && <span className="mx-2">•</span>} 
                        {item.ref}
                      </p>
                    </div>
                  </div>

                  {/* Right: Amount & Label */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto">
                    <div className={`text-2xl font-black ${item.type === 'charge' ? 'text-slate-900' : 'text-indigo-600'}`}>
                      {item.type === 'payment' ? '-' : ''}${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-black tracking-widest uppercase ${item.type === 'charge' ? 'text-rose-500' : 'text-indigo-500'}`}>
                        {item.type === 'charge' ? 'Cargo' : 'Abono'}
                      </span>
                      
                      {/* Desasignar action for payments */}
                      {item.type === 'payment' && (
                        <button 
                          onClick={() => setPaymentToUnassign(Number(item.id.replace('p_', '')))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                          title="Desasignar pago"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Unassign Confirmation Modal */}
      <Dialog open={paymentToUnassign !== null} onOpenChange={(open) => { if (!open) setPaymentToUnassign(null) }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Desasignar Pago</DialogTitle>
            <DialogDescription className="text-base mt-2">
              ¿Estás seguro de que deseas desasignar este pago? 
              <br/><br/>
              El depósito será removido del estado de cuenta de la Casa {houseNumberFormatted} y volverá a la bandeja de &quot;Pagos No Identificados&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3">
            <Button variant="outline" className="rounded-xl flex-1" onClick={() => setPaymentToUnassign(null)} disabled={isUnassigning}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl flex-1 bg-rose-600 hover:bg-rose-700"
              disabled={isUnassigning}
              onClick={async () => {
                if (!paymentToUnassign) return;
                setIsUnassigning(true);
                try {
                  await unassignPayment(paymentToUnassign);
                  window.location.reload();
                } catch {
                  alert("Error desasignando pago");
                } finally {
                  setIsUnassigning(false);
                }
              }}
            >
              {isUnassigning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Sí, Desasignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
