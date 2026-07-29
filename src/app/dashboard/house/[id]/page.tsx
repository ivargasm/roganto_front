"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { fetchHouse, House, unassignPayment } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Loader2, DownloadCloud } from "lucide-react";
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
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !house) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-red-500">
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
  }> = [];

  house.charges.forEach(c => {
    // Convertir "Jun-26" a una fecha real aproximada (día 1 del mes) para ordenar correctamente
    const [monthStr, yearStr] = c.period.split('-');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = monthNames.indexOf(monthStr) !== -1 ? monthNames.indexOf(monthStr) : 5; // Default to June if parsing fails
    const chargeDate = new Date(2000 + parseInt(yearStr || '26'), monthIndex, 1);

    history.push({
      id: `c_${c.id}`,
      type: 'charge',
      date: chargeDate,
      description: `Mensualidad (${c.period})`,
      amount: c.amount
    });
  });

  house.payments.forEach(p => {
    const pDate = new Date(p.payment_date);
    const dateFormatted = pDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    history.push({
      id: `p_${p.id}`,
      type: 'payment',
      date: pDate,
      description: `(${dateFormatted}) ${p.description || 'Pago detectado'}`,
      amount: p.amount
    });
  });

  // Ordenar por fecha 
  history.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Agregar el saldo inicial como primer concepto histórico
  history.unshift({
    id: 'initial',
    type: 'charge',
    date: new Date('2026-05-31'), // Justo antes de Junio
    description: 'Saldo Acumulado Histórico (Hasta May-26)',
    amount: house.initial_balance
  });

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

    const tableBody = history.map(item => [
      item.date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
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

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-12">
      <div className="mx-auto max-w-5xl space-y-8">

        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft size={16} className="mr-2" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold">Casa {house.number.toString().padStart(2, '0')}</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Saldo Inicial (Jun-26)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                ${house.initial_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className={`border-0 shadow-lg backdrop-blur ${house.current_debt > 0 ? 'bg-red-50/80' : 'bg-green-50/80'}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium ${house.current_debt > 0 ? 'text-red-500' : 'text-green-600'}`}>
                Deuda Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${house.current_debt > 0 ? 'text-red-600' : 'text-green-700'}`}>
                ${house.current_debt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              {house.current_debt <= 0 && <p className="text-green-600 text-sm mt-1">¡Al Corriente!</p>}
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Estado de Cuenta</CardTitle>
              <CardDescription>Historial de mensualidades y pagos recibidos.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handlePrintPDF}
            >
              <DownloadCloud size={16} />
              Descargar PDF
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-100/50">
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Cargo</TableHead>
                  <TableHead className="text-right">Abono</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.type === 'charge' ? (
                        <ArrowUpCircle className="text-red-500" size={18} />
                      ) : (
                        <ArrowDownCircle className="text-green-500" size={18} />
                      )}
                    </TableCell>
                    <TableCell
                      className="font-medium text-slate-700 max-w-[200px] md:max-w-[400px] truncate"
                      title={item.description}
                    >
                      {item.description}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {item.type === 'charge' ? `$${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {item.type === 'payment' ? `$${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.type === 'payment' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPaymentToUnassign(Number(item.id.replace('p_', '')));
                          }}
                          className="h-8 text-xs text-slate-400 hover:text-red-600"
                        >
                          Desasignar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>

      <Dialog open={paymentToUnassign !== null} onOpenChange={(open) => { if (!open) setPaymentToUnassign(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desasignar Pago</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas desasignar este pago? Este depósito será removido del estado de cuenta de la Casa {house?.number} y volverá a la lista de &quot;Pagos No Identificados&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPaymentToUnassign(null)} disabled={isUnassigning}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
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
