"use client";

import { useEffect, useState } from "react";
import { fetchHouses, House } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Home, CheckCircle2, AlertTriangle, Filter } from "lucide-react";
import Link from "next/link";

export default function HousesPage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchHouses();
        setHouses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Derived metrics
  const totalCasas = houses.length;
  const casasAlCorriente = houses.filter(h => h.current_debt <= 0).length;
  const casasMorosas = houses.filter(h => h.current_debt > 0).length;
  
  const pctAlCorriente = totalCasas > 0 ? Math.round((casasAlCorriente / totalCasas) * 100) : 0;
  const pctMorosas = totalCasas > 0 ? Math.round((casasMorosas / totalCasas) * 100) : 0;

  // Search filtering
  const filteredHouses = houses.filter(h => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    // Search by house number (e.g. "12", "012", "casa 12")
    return h.number.toString().includes(term) || `casa ${h.number}`.includes(term);
  });

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-12 space-y-10">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-[2px] w-8 bg-slate-400"></div>
            <p className="text-xs font-semibold text-slate-500 tracking-widest uppercase">Gestión Residencial</p>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Directorio de Casas</h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Administración y estado financiero individual de las unidades residenciales de Residencial 88.
          </p>
        </div>
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por número..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-white border border-slate-200 py-3 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <Card className="rounded-2xl border-slate-200 shadow-lg bg-white/80 backdrop-blur-md overflow-hidden relative group">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-slate-500 tracking-wider mb-2">TOTAL DE CASAS</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-5xl font-black text-slate-900">{totalCasas}</h2>
              <span className="text-sm font-medium text-slate-500">unidades</span>
            </div>
            {/* Fake bottom bar */}
            <div className="absolute bottom-0 left-6 right-6 h-1 bg-slate-900 rounded-t-sm opacity-80"></div>
            {/* Background Icon */}
            <Home size={80} className="absolute -right-4 -bottom-4 text-slate-100 transform group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-lg bg-white/80 backdrop-blur-md overflow-hidden relative group">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-slate-500 tracking-wider mb-2">CASAS AL CORRIENTE</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-5xl font-black text-emerald-600">{casasAlCorriente}</h2>
              <span className="text-sm font-medium text-slate-500">{pctAlCorriente}% del total</span>
            </div>
            {/* Bottom progress bar */}
            <div className="absolute bottom-0 left-6 right-6 h-1 bg-slate-100 rounded-t-sm">
              <div className="h-full bg-emerald-500 rounded-t-sm" style={{ width: `${pctAlCorriente}%` }}></div>
            </div>
            {/* Background Icon */}
            <CheckCircle2 size={80} className="absolute -right-4 -bottom-4 text-emerald-50 transform group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-lg bg-white/80 backdrop-blur-md overflow-hidden relative group">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-slate-500 tracking-wider mb-2">CASAS MOROSAS</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-5xl font-black text-rose-600">{casasMorosas}</h2>
              <span className="text-sm font-medium text-slate-500">{pctMorosas}% del total</span>
            </div>
            {/* Bottom progress bar */}
            <div className="absolute bottom-0 left-6 right-6 h-1 bg-slate-100 rounded-t-sm">
              <div className="h-full bg-rose-500 rounded-t-sm" style={{ width: `${pctMorosas}%` }}></div>
            </div>
            {/* Background Icon */}
            <AlertTriangle size={80} className="absolute -right-4 -bottom-4 text-rose-50 transform group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
          </CardContent>
        </Card>

      </div>

      {/* Listado de Unidades */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-6">
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Listado de Unidades</h2>
          <Button variant="outline" className="text-slate-600 border-slate-300 rounded-xl px-4 gap-2">
            <Filter size={16} />
            Filtrar
          </Button>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-4 gap-4 px-4 pb-4 border-b border-slate-100 text-xs font-bold text-slate-400 tracking-wider uppercase">
          <div>Unidad</div>
          <div>Estado</div>
          <div>Deuda Actual</div>
          <div className="text-right">Acciones</div>
        </div>

        {/* Table Body (List) */}
        <div className="mt-2 space-y-1">
          {filteredHouses.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No se encontraron casas que coincidan con la búsqueda.
            </div>
          ) : (
            filteredHouses.map((h) => (
              <div key={h.id} className="grid grid-cols-4 gap-4 items-center px-4 py-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                
                {/* Column: Unidad */}
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                    {h.number.toString().padStart(2, '0')}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Casa {h.number}</p>
                  </div>
                </div>

                {/* Column: Estado */}
                <div>
                  {h.current_debt <= 0 ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      AL CORRIENTE
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                      CON ADEUDO
                    </div>
                  )}
                </div>

                {/* Column: Deuda */}
                <div className={`font-bold ${h.current_debt > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  ${h.current_debt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>

                {/* Column: Acciones */}
                <div className="text-right">
                  <Link href={`/dashboard/house/${h.id}`}>
                    <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg text-sm font-medium">
                      Ver Detalle
                    </Button>
                  </Link>
                </div>
                
              </div>
            ))
          )}
        </div>
        
      </div>
      
    </div>
  );
}
