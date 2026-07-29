"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, CheckCircle, AlertCircle } from "lucide-react";
import { uploadPdf, generateCharges } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";

export default function PdfUploader({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ message: string, processed: number, identified: number, unidentified: number, ignored: number } | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return format(d, "MMM-yy");
  });

  const periodOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return format(d, "MMM-yy");
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError("");

    try {
      // 1. Subir PDF y generar pagos
      const res = await uploadPdf(file, period);
      // 2. Generar cargos de la mensualidad (billing run) para ese mes
      const chargesRes = await generateCharges(period);
      
      toast.success(chargesRes.message || `Cargos de ${period} validados.`);

      setResult(res);
      onUploadSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setFile(null); setResult(null); setError(""); } }}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2 font-medium">
          <UploadCloud size={18} />
          Subir Estado de Cuenta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Subir Estado de Cuenta</DialogTitle>
          <DialogDescription>
            Selecciona el PDF descargado de BBVA. El sistema identificará los depósitos automáticamente.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="flex flex-col items-center justify-center space-y-6 py-6">
            <div className="flex w-full items-center justify-center">
              <label htmlFor="dropzone-file" className="flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex flex-col items-center justify-center pb-6 pt-5 text-slate-500">
                  <UploadCloud className="mb-4 h-10 w-10 text-slate-400" />
                  <p className="mb-2 text-sm font-semibold">
                    {file ? file.name : "Haz clic para subir un PDF"}
                  </p>
                  <p className="text-xs">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF (Max 10MB)"}</p>
                </div>
                <input id="dropzone-file" type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
              </label>
            </div>

            {!uploading && file && (
              <div className="w-full space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-700">Periodo a procesar</label>
                  <p className="text-xs text-slate-500 mb-2">
                    Se identificarán los depósitos y se generarán automáticamente las cuotas de mantenimiento para el mes seleccionado.
                  </p>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            )}

            {uploading && (
              <div className="w-full space-y-2">
                <Progress value={45} className="h-2" />
                <p className="text-center text-sm text-slate-500">Procesando mágicamente el PDF...</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md w-full text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <Button onClick={handleUpload} disabled={!file || uploading} className="w-full bg-slate-900 text-white hover:bg-slate-800">
              {uploading ? "Procesando..." : "Subir y Procesar"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-6 py-8 text-center">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¡Proceso Completado!</h3>
              <p className="text-slate-500">Se encontraron {result.processed} pagos en el PDF.</p>
              {result.ignored > 0 && (
                <p className="text-amber-600 font-medium mt-2 bg-amber-50 px-3 py-1 rounded-md inline-block text-sm">
                  ⚠️ Se ignoraron {result.ignored} pagos duplicados.
                </p>
              )}
            </div>

            <div className="w-full grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-3xl font-black text-green-600">{result.identified}</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Asignados</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className={`text-3xl font-black ${result.unidentified > 0 ? 'text-orange-500' : 'text-slate-900'}`}>{result.unidentified}</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">No Identificados</div>
              </div>
            </div>

            <Button onClick={() => setOpen(false)} className="w-full mt-4" variant="outline">
              Cerrar y ver resultados
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
