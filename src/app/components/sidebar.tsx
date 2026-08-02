"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Home, HelpCircle, CircleDollarSign, BarChart3, LogOut, Settings } from "lucide-react";
import { useAuthStore } from "../store/Store";

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Casas", href: "/dashboard/houses", icon: Home },
    { name: "Pagos No Identificados", href: "/dashboard/unidentified", icon: HelpCircle },
    { name: "Egresos", href: "/dashboard/expenses", icon: CircleDollarSign },
    { name: "Reportes", href: "/dashboard/reports", icon: BarChart3 },
    { name: "Configuración", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white transition-transform hidden md:block print:hidden">
      <div className="flex h-full flex-col px-4 py-6">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Home size={18} />
          </div>
          <span className="text-xl font-semibold tracking-tight text-slate-900">Residencia</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={18} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-100 pt-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut size={18} className="text-slate-400" />
            Cerrar Sesión
          </button>
          
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white font-medium">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">Admin Usuario</span>
              <span className="text-xs text-slate-500">Gestor de Propiedad</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
