"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/Store";
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const loginSchema = z.object({
    email: z.string().email({ message: "Ingresa un correo electrónico válido" }),
    password: z.string().min(1, { message: "La contraseña es requerida" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const { url, loginUser, userValid, userAuth, user } = useAuthStore();

    const [globalError, setGlobalError] = useState("");
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        mode: "onChange",
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    useEffect(() => {
        const validateUser = async () => {
            await userValid();
        };
        validateUser();
    }, [userValid]);

    useEffect(() => {
        if ((userAuth || user)) {
            router.push('/profile');
        }
    }, [user, userAuth, router]);

    const onSubmit = async (data: LoginFormValues) => {
        setGlobalError("");
        setIsSubmitting(true);

        try {
            await loginUser(data.email, data.password, url);
            router.push("/dashboard");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setGlobalError(err.message);
            } else {
                setGlobalError("Ha ocurrido un error inesperado");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-white">
            {/* Left Side: Branding / Visual */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative flex-col justify-between p-12 overflow-hidden">
                {/* Abstract Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 text-white mb-4">
                        <div className="h-8 w-8 bg-white text-slate-900 rounded-lg flex items-center justify-center font-black text-xl">
                            E
                        </div>
                        <span className="font-bold text-xl tracking-wide">Elevated Residency</span>
                    </div>
                </div>

                <div className="relative z-10 max-w-md">
                    <p className="text-indigo-400 font-bold tracking-widest text-sm uppercase mb-3">Financial Intelligence</p>
                    <h1 className="text-4xl font-bold text-white leading-tight mb-6">
                        Administración financiera de primer nivel.
                    </h1>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Controla el flujo de caja, identifica depósitos automáticamente y mantén la morosidad al mínimo.
                    </p>
                </div>

                <div className="relative z-10 text-slate-500 text-sm font-medium">
                    © {new Date().getFullYear()} Elevated Residency.
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
                <div className="w-full max-w-md">
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Bienvenido de nuevo</h2>
                        <p className="text-slate-500 font-medium">Ingresa tus credenciales para acceder a tu panel.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {globalError && (
                            <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-semibold border border-rose-100 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                {globalError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Correo Electrónico
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="ejemplo@correo.com"
                                className={`h-14 rounded-xl bg-slate-50 border-slate-200 font-medium text-slate-900 focus:ring-indigo-500 focus:border-indigo-500 px-4 ${errors.email ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="text-rose-500 text-xs mt-1 font-medium">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Contraseña
                                </Label>
                                <Link href="/auth/forgot-password" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className={`h-14 rounded-xl bg-slate-50 border-slate-200 font-medium text-slate-900 focus:ring-indigo-500 focus:border-indigo-500 px-4 pr-12 ${errors.password ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                                    {...register("password")}
                                />
                                <button
                                    type="button"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-rose-500 text-xs mt-1 font-medium">{errors.password.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md font-bold text-base mt-2"
                        >
                            {isSubmitting ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : null}
                            {isSubmitting ? "Autenticando..." : "Iniciar Sesión"}
                        </Button>
                    </form>

                    <p className="text-center mt-10 text-sm font-medium text-slate-500">
                        ¿No tienes una cuenta?{" "}
                        <Link href="/auth/register" className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
                            Regístrate
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
