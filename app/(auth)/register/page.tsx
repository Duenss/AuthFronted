"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { apiRequest, setStoredToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = form.get("password") as string;
    const confirmPassword = form.get("confirmPassword") as string;
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<{ token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: form.get("username"),
          email: form.get("email"),
          password,
        }),
      });
      setStoredToken(data.token, true);
      toast.success("Cuenta creada exitosamente");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background bg-grid flex items-center justify-center p-4 relative overflow-hidden">

      {/* ── Ambient glows ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[#0095ff]/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-[#0050c8]/08 blur-[100px]" />
        <div className="absolute inset-0 bg-grid opacity-60" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fadein-up">

        {/* ── Logo ── */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="absolute -inset-3 rounded-[36px] bg-[#0095ff]/15 blur-xl glow-pulse" />
            <div className="relative w-20 h-20 rounded-[24px] overflow-hidden border border-[#0095ff]/30 bg-[#040d18] shadow-electric-glow">
              <Image src="/logo.png" alt="AuthRD" width={80} height={80} className="w-full h-full object-cover" priority />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AuthRD</h1>
          <p className="mt-1.5 text-sm text-[#4a8ab0]">Crea tu cuenta de administrador</p>
        </div>

        {/* ── Card ── */}
        <div className="auth-card p-8">
          <div className="pointer-events-none absolute -top-px left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[#0095ff]/60 to-transparent" />

          <h2 className="text-2xl font-semibold text-white mb-1">Crear Cuenta</h2>
          <p className="text-sm text-[#4a8ab0] mb-7">Registra tu cuenta administradora.</p>

          <form className="space-y-4" onSubmit={onSubmit}>

            <label className="block">
              <span className="label">Usuario</span>
              <input className="input" name="username" placeholder="jvampard" autoComplete="username" required />
            </label>

            <label className="block">
              <span className="label">Email</span>
              <input className="input" name="email" type="email" placeholder="admin@authrd.app" autoComplete="email" required />
            </label>

            <label className="block">
              <span className="label">Contraseña</span>
              <div className="relative">
                <input
                  className="input pr-10"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2a5070] transition hover:text-[#0095ff]" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="label">Confirmar Contraseña</span>
              <div className="relative">
                <input
                  className="input pr-10"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2a5070] transition hover:text-[#0095ff]" onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{
                background: "linear-gradient(135deg, #0070d8 0%, #0095ff 50%, #00c3ff 100%)",
                boxShadow: "0 0 20px rgba(0,149,255,0.45), 0 4px 24px rgba(0,149,255,0.25)",
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading && <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                {loading ? "Creando cuenta..." : "Registrarse"}
              </span>
              <span className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 hover:translate-x-[100%]" />
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#4a8ab0]">
            ¿Ya tienes cuenta?{" "}
            <Link className="font-medium text-[#38b6ff] transition hover:text-[#0095ff]" href="/login">
              Iniciar sesión
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#1a3a55]">
          © 2026 AuthRD by JvampaRD. Todos los derechos reservados.
        </p>
      </div>
    </main>
  );
}
