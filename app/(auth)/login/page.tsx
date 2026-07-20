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

  // Prellenar el campo si hay usuario guardado
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
          licenseKey: form.get("licenseKey"),
          hwid: form.get("hwid"),
        })
      });

      // Guardar o limpiar el usuario recordado
      if (rememberChecked) {
        localStorage.setItem(REMEMBER_KEY, identifier);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

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
      <div className="absolute inset-0 bg-blue-glow opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10" style={{ animation: "fadeInUp 0.4s ease-out both" }}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-24 h-24 rounded-3xl overflow-hidden mb-4 shadow-[0_0_45px_rgba(14,165,233,0.35)] bg-[#0b1120] border border-[#1e3a5f]">
            <Image src="/logo.png" alt="AuthRD" width={96} height={96} className="w-full h-full object-cover" priority />
            <span className="absolute -bottom-2 right-2 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(34,197,94,0.55)]" />
          </div>
          <h1 className="text-3xl font-bold text-white">AuthRD</h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">Inicia sesión para continuar</p>
        </div>

        {/* Card */}
        <div className="bg-[#0d1420]/95 border border-[#14395a] rounded-[32px] p-8 shadow-[0_30px_80px_rgba(14,165,233,0.18)] backdrop-blur-xl">
          <h2 className="text-2xl font-semibold text-white mb-1">Inicio de sesión</h2>
          <p className="text-sm text-muted-foreground mb-6">Ingrese sus pinshes credenciales mijo.</p>

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="label">Usuario o Email</span>
              <input
                ref={identifierRef}
                className="input"
                name="identifier"
                placeholder="Shinguesumare1234@ejemplo.com"
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
                  placeholder="********"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-white"
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
                  className="h-4 w-4 rounded border-border bg-surface-2 accent-primary"
                />
                <span className="text-sm text-muted-foreground">Guardar sesión</span>
              </label>
              <Link className="text-sm text-primary-light transition hover:text-primary" href="/forgot-password">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button className="px-6 py-3 text-base w-full" loading={loading} type="submit">
              Iniciar Sesión
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link className="font-medium text-primary-light transition hover:text-primary" href="/register">
              Registrarse
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          © 2026 AuthRD By JvampaRD. Todos los derechos reservados.
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}