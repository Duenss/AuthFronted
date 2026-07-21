"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui";
import { apiRequest, setStoredToken } from "@/lib/api";

const REMEMBER_KEY = "authrd_remember_identifier";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const identifierRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved && identifierRef.current) {
      identifierRef.current.value = saved;
      setRemember(true);
    }
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const identifier = form.get("identifier") as string;
    const rememberChecked = form.get("remember") === "on";

    setLoading(true);
    try {
      const data = await apiRequest<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier,
          password: form.get("password"),
        }),
      });
      if (rememberChecked) localStorage.setItem(REMEMBER_KEY, identifier);
      else localStorage.removeItem(REMEMBER_KEY);
      setStoredToken(data.token, rememberChecked);
      toast.success("Sesión iniciada");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background bg-grid flex items-center justify-center p-4 relative overflow-hidden">

      {/* ── Ambient glows ── */}
      <div className="pointer-events-none absolute inset-0">
        {/* top center radial */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[#0095ff]/10 blur-[120px]" />
        {/* bottom subtle */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-[#0050c8]/08 blur-[100px]" />
        {/* grid overlay */}
        <div className="absolute inset-0 bg-grid opacity-60" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fadein-up">

        {/* ── Logo ── */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            {/* outer glow ring */}
            <div className="absolute -inset-3 rounded-[36px] bg-[#0095ff]/15 blur-xl glow-pulse" />
            <div className="relative w-24 h-24 rounded-[28px] overflow-hidden border border-[#0095ff]/30 bg-[#040d18] shadow-electric-glow">
              <Image src="/logo.png" alt="AuthRD" width={96} height={96} className="w-full h-full object-cover" priority />
            </div>
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-[#020c18] shadow-[0_0_12px_rgba(34,197,94,0.7)]" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AuthRD</h1>
          <p className="mt-1.5 text-sm text-[#4a8ab0]">Panel de administración</p>
        </div>

        {/* ── Card ── */}
        <div className="auth-card p-8">

          {/* card inner glow top */}
          <div className="pointer-events-none absolute -top-px left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[#0095ff]/60 to-transparent" />

          <h2 className="text-2xl font-semibold text-white mb-1">Inicio de sesión</h2>
          <p className="text-sm text-[#4a8ab0] mb-7">Ingresa tus credenciales para continuar.</p>

          <form className="space-y-5" onSubmit={onSubmit}>

            <label className="block">
              <span className="label">Usuario o Email</span>
              <input
                ref={identifierRef}
                className="input"
                name="identifier"
                placeholder="admin@authrd.app"
                autoComplete="username"
                required
              />
            </label>

            <label className="block">
              <span className="label">Contraseña</span>
              <div className="relative">
                <input
                  className="input pr-10"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2a5070] transition hover:text-[#0095ff]"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  name="remember"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-[#0f2a42] bg-[#040d16] accent-[#0095ff]"
                />
                <span className="text-sm text-[#4a8ab0]">Guardar sesión</span>
              </label>
              <Link
                className="text-sm text-[#38b6ff] transition hover:text-[#0095ff] hover:underline underline-offset-4"
                href="/forgot-password"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Electric button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #0070d8 0%, #0095ff 50%, #00c3ff 100%)",
                boxShadow: "0 0 20px rgba(0,149,255,0.45), 0 4px 24px rgba(0,149,255,0.25)",
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading && <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </span>
              {/* shimmer */}
              <span className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 hover:translate-x-[100%]" />
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#4a8ab0]">
            ¿No tienes cuenta?{" "}
            <Link className="font-medium text-[#38b6ff] transition hover:text-[#0095ff]" href="/register">
              Registrarse
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#1a3a55]">
          © 2026 AuthRD By JvampaRD. Todos los derechos reservados.
        </p>
      </div>
    </main>
  );
}
