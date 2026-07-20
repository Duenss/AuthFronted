"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui";
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
          password
        })
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
      {/* Glow overlay */}
      <div className="absolute inset-0 bg-blue-glow opacity-30 pointer-events-none" />
      {/* Blur circle */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div
        className="w-full max-w-md relative z-10"
        style={{ animation: "fadeInUp 0.4s ease-out both" }}
      >
        {/* Logo + title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 shadow-blue-glow">
            <Image src="/logo.png" alt="AuthRD" width={80} height={80} className="w-full h-full object-cover" priority />
          </div>
          <h1 className="text-2xl font-bold text-white">AuthRD</h1>
          <p className="mt-1 text-sm text-muted-foreground">Panel de administración</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-1">Crear Cuenta</h2>
          <p className="text-sm text-muted-foreground mb-6">Registra tu cuenta administradora</p>

          <form className="space-y-4" onSubmit={onSubmit}>
            {/* Username */}
            <label className="block">
              <span className="label">Usuario</span>
              <input
                className="input w-full"
                name="username"
                placeholder="jvampard"
                autoComplete="username"
                required
              />
            </label>

            {/* Email */}
            <label className="block">
              <span className="label">Email</span>
              <input
                className="input w-full"
                name="email"
                type="email"
                placeholder="admin@authrd.app"
                autoComplete="email"
                required
              />
            </label>

            {/* Password */}
            <label className="block">
              <span className="label">Contraseña</span>
              <div className="relative">
                <input
                  className="input w-full pr-10"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  required
                  minLength={8}
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

            {/* Confirm Password */}
            <label className="block">
              <span className="label">Confirmar Contraseña</span>
              <div className="relative">
                <input
                  className="input w-full pr-10"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-white"
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <Button className="px-6 py-3 text-base w-full" loading={loading} type="submit">
              Registrarse
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link className="font-medium text-primary-light transition hover:text-primary" href="/login">
              Iniciar sesión
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted">
          © 2026 AuthRD by JvampaRD. Todos los derechos reservados.
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
