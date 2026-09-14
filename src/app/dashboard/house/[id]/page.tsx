"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchHouse, House, unassignPayment, createManualPayment, createManualCharge, fetchCategories, Category } from "@/lib/api";
import { formatPeriod } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, DownloadCloud, ArrowUpRight, ArrowDownLeft, X, Plus } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export default function HouseDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [house, setHouse] = useState<House | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentToUnassign, setPaymentToUnassign] = useState<number | null>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

  // Manual payment state
  const [isManualPaymentOpen, setIsManualPaymentOpen] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [paymentPeriod, setPaymentPeriod] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");

  // Manual charge state
  const [isManualChargeOpen, setIsManualChargeOpen] = useState(false);
  const [isCreatingCharge, setIsCreatingCharge] = useState(false);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDescription, setChargeDescription] = useState("");
  const [chargePeriod, setChargePeriod] = useState("");
  const [chargeType, setChargeType] = useState("");
  
  const [periodOptions, setPeriodOptions] = useState<string[]>([]);
  const [chargeCategories, setChargeCategories] = useState<Category[]>([]);

  const loadHouse = useCallback(() => {
    fetchHouse(parseInt(params.id))
      .then(setHouse)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    loadHouse();
  }, [loadHouse]);

  useEffect(() => {
    const options = [];
    for (let i = -12; i <= 12; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() + i);
      options.push(formatPeriod(d));
    }
    setPeriodOptions(options);
  }, []);

  useEffect(() => {
    fetchCategories('charge')
      .then(setChargeCategories)
      .catch(console.error);
  }, []);

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
      description: c.description || (c.charge_type ? `${c.charge_type} ${c.period}` : `Mensualidad ${c.period}`),
      amount: c.amount,
      ref: c.charge_type ? `Tipo: ${c.charge_type}` : `Ref: CAR-${c.id}`
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

  const handleCreateManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || !paymentDate || !paymentDescription || !paymentPeriod) {
      toast.error("Por favor llena todos los campos");
      return;
    }
    
    setIsCreatingPayment(true);
    try {
      await createManualPayment({
        house_id: house.id,
        amount: parseFloat(paymentAmount),
        payment_date: new Date(paymentDate).toISOString(),
        description: paymentDescription,
        period: paymentPeriod,
        payment_method: paymentMethod
      });
      setIsManualPaymentOpen(false);
      
      setPaymentAmount("");
      setPaymentDate("");
      setPaymentDescription("");
      setPaymentPeriod("");
      setPaymentMethod("Efectivo");
      
      loadHouse();
      toast.success("Abono registrado exitosamente");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error creando el pago");
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleCreateManualCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeAmount || !chargeType || !chargePeriod) {
      toast.error("Por favor llena los campos requeridos (Monto, Tipo, Periodo)");
      return;
    }
    
    setIsCreatingCharge(true);
    try {
      await createManualCharge(house.id, {
        amount: parseFloat(chargeAmount),
        period: chargePeriod,
        charge_type: chargeType,
        description: chargeDescription || undefined
      });
      setIsManualChargeOpen(false);
      
      setChargeAmount("");
      setChargeType("");
      setChargeDescription("");
      setChargePeriod("");
      
      loadHouse();
      toast.success("Cargo aplicado exitosamente");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error creando el cargo");
    } finally {
      setIsCreatingCharge(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/houses')} className="rounded-full h-8 w-8 bg-slate-100 hover:bg-slate-200">
              <ArrowLeft size={16} className="text-slate-700" />
            </Button>
            <p className="text-[10px] font-semibold text-slate-500 tracking-widest uppercase">Residencial 88</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Casa {houseNumberFormatted} — Estado de Cuenta
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline"
            onClick={() => setIsManualChargeOpen(true)}
            className="rounded-xl px-4 py-2 border-rose-200 text-rose-600 hover:bg-rose-50 shadow-sm flex items-center gap-2 font-semibold"
          >
            <Plus size={16} />
            Aplicar Cargo
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsManualPaymentOpen(true)}
            className="rounded-xl px-4 py-2 border-slate-200 shadow-sm flex items-center gap-2 font-semibold"
          >
            <Plus size={16} className="text-indigo-600" />
            Abonar Manual
          </Button>
          <Button 
            onClick={handlePrintPDF}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 shadow-sm flex items-center gap-2"
          >
            <DownloadCloud size={16} />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Hero Card */}
      <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50/50 -z-10"></div>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-4">
            <div className="text-center md:text-left">
              <p className="text-xs font-bold text-slate-500 tracking-wider mb-1">SALDO ACTUAL</p>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">
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
      <div className="space-y-8 pt-2">
        {Object.entries(groupedHistory).map(([month, items]) => (
          <div key={month}>
            <h3 className="text-xl font-bold text-slate-900 mb-4">{month}</h3>
            
            <div className="space-y-3">
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
                  toast.error("Error desasignando pago");
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

      {/* Manual Charge Modal */}
      <Dialog open={isManualChargeOpen} onOpenChange={setIsManualChargeOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleCreateManualCharge}>
            <DialogHeader>
              <DialogTitle className="text-2xl">Aplicar Cargo</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Aplica una multa, mensualidad o recargo a la Casa {houseNumberFormatted}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="chargeType" className="text-xs font-bold text-slate-500">Tipo de Cargo</Label>
                <Select value={chargeType} onValueChange={setChargeType} required>
                  <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {chargeCategories.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                    {chargeCategories.length === 0 && <SelectItem value="Mensualidad" disabled>Cargando opciones...</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chargeAmount" className="text-xs font-bold text-slate-500">Monto ($)</Label>
                <Input id="chargeAmount" type="number" step="0.01" required value={chargeAmount} onChange={e => setChargeAmount(e.target.value)} placeholder="0.00" className="rounded-xl bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chargePeriod" className="text-xs font-bold text-slate-500">Periodo (ej. Jun-26)</Label>
                <Select value={chargePeriod} onValueChange={setChargePeriod} required>
                  <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecciona el periodo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chargeDescription" className="text-xs font-bold text-slate-500">Descripción (Opcional)</Label>
                <Input id="chargeDescription" value={chargeDescription} onChange={e => setChargeDescription(e.target.value)} placeholder="Ej. Retraso de 3 días..." className="rounded-xl bg-slate-50 border-slate-200" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsManualChargeOpen(false)} disabled={isCreatingCharge} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white" disabled={isCreatingCharge}>
                {isCreatingCharge ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Guardar Cargo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual Payment Modal */}
      <Dialog open={isManualPaymentOpen} onOpenChange={setIsManualPaymentOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleCreateManualPayment}>
            <DialogHeader>
              <DialogTitle className="text-2xl">Abonar Manual</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Ingresa los detalles del abono para la Casa {houseNumberFormatted}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="paymentAmount" className="text-xs font-bold text-slate-500">Monto ($)</Label>
                <Input id="paymentAmount" type="number" step="0.01" required value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" className="rounded-xl bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paymentDate" className="text-xs font-bold text-slate-500">Fecha del Depósito</Label>
                <Input id="paymentDate" type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="rounded-xl bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paymentPeriod" className="text-xs font-bold text-slate-500">Periodo Contable</Label>
                <Select value={paymentPeriod} onValueChange={setPaymentPeriod} required>
                  <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecciona el periodo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paymentMethod" className="text-xs font-bold text-slate-500">Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                  <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo (Caja Chica)</SelectItem>
                    <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paymentDescription" className="text-xs font-bold text-slate-500">Descripción / Referencia</Label>
                <Input id="paymentDescription" required value={paymentDescription} onChange={e => setPaymentDescription(e.target.value)} placeholder="Transferencia banco..." className="rounded-xl bg-slate-50 border-slate-200" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsManualPaymentOpen(false)} disabled={isCreatingPayment} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isCreatingPayment}>
                {isCreatingPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Guardar Abono
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
