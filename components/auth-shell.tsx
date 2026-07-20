"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background bg-grid p-4">
      <div className="pointer-events-none absolute inset-0 bg-blue-glow opacity-30" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} className="mb-8 flex flex-col items-center">
          <div className="mb-4 h-20 w-20 overflow-hidden rounded-2xl shadow-blue-glow">
            <Image src="/logo.png" alt="AuthRD" width={80} height={80} className="h-full w-full object-cover" priority />
          </div>
          <h1 className="text-2xl font-bold">AuthRD</h1>
          <p className="mt-1 text-sm text-muted-foreground">Panel de administracion</p>
        </motion.div>
        <div className="rounded-xl border border-border bg-surface p-8 shadow-2xl">
          <h2 className="mb-1 text-xl font-semibold">{title}</h2>
          <p className="mb-6 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-muted">Copyright 2026 AuthRD by JvampaRD. Todos los derechos reservados.</p>
      </motion.div>
    </main>
  );
}
