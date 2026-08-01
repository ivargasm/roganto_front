import ProtectedRoute from "@/app/components/ProtectedRoutes";
import Sidebar from "@/app/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Sidebar />
      <div className="md:ml-64 min-h-screen bg-slate-50/50">
        {children}
      </div>
    </ProtectedRoute>
  );
}
