"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { AuthShell } from "@/components/auth-shell";
import { Button, Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email") })
      });
      toast.success("Si el email existe, se genero un token");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo procesar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Recuperar Acceso" subtitle="Solicita un token de recuperacion">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Email" name="email" type="email" placeholder="admin@authrd.app" required />
        <Button className="w-full py-3 text-base" loading={loading} type="submit">
          Enviar recuperacion
        </Button>
      </form>
      <Link className="mt-6 block text-center text-sm text-primary-light" href="/login">
        Volver a login
      </Link>
    </AuthShell>
  );
}
