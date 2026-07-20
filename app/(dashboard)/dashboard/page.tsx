"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle2, Copy, Edit3, Eye, EyeOff, KeyRound, Pause,
  Plus, RefreshCcw, Trash2, Users, XCircle, Activity, Clock, X
} from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Badge, Button, StatCard } from "@/components/ui";
import { apiRequest, getStoredToken } from "@/lib/api";
import { formatDate, maskSecret } from "@/lib/utils";
import { cn } from "@/lib/utils";

type AppRecord = {
  _id: string;
  name: string;
  appId: string;
  appSecret?: string;
  status: string;
  version: string;
  userCount?: number;
  licenseCount?: number;
};

type StatsData = {
  totalLicenses: number;
  activeLicenses: number;
  expiredLicenses: number;
  totalUsers: number;
};

type LogEntry = {
  _id?: string;
  event: string;
  description?: string;
  ip?: string;
  createdAt?: string;
  username?: string;
  type?: string;
};

const CODE_TABS = ["C++", "C#", "PHP"] as const;

function getCodeExample(lang: string, appId: string, appSecret: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "https://auchrd.netlify.app/api";

  if (lang === "C++") {
    return `// AuthPlatform C++ SDK
#include "Auth.h"

int main() {
    AuthPlatform::Auth auth;
    // APP_ID and APP_SECRET are embedded in Auth.cpp
    // Generated from: Dashboard > Generate SDK

    if (auth.LoginWithLicense("YOUR-LICENSE-KEY")) {
        std::string version = auth.GetVariable("Version");
        // Access granted
    } else {
        std::cerr << auth.GetLastError() << std::endl;
    }
    return 0;
}

// Credentials (embedded in Auth.cpp):
// APP_ID:     ${appId}
// APP_SECRET: ${appSecret || "YOUR_APP_SECRET"}
// API_URL:    ${apiUrl}`;
  }

  if (lang === "C#") {
    return `// AuthPlatform C# SDK
using AuthPlatform;

var auth = new Auth();
// APP_ID and APP_SECRET are embedded in Auth.cs
// API_URL: ${apiUrl}

if (await auth.LoginWithLicenseAsync("YOUR-LICENSE-KEY")) {
    string version = await auth.GetVariableAsync("Version");
    // Access granted
} else {
    Console.WriteLine(auth.GetLastError());
}

// Credentials:
// APP_ID:     ${appId}
// APP_SECRET: ${appSecret || "YOUR_APP_SECRET"}`;
  }

  return `<?php
// AuthPlatform PHP SDK
// API_URL: ${apiUrl}

$auth = new AuthPlatform\\Auth();
// APP_ID and APP_SECRET are embedded in Auth.php

if ($auth->loginWithLicense("YOUR-LICENSE-KEY")) {
    $version = $auth->getVariable("Version");
    // Access granted
} else {
    echo $auth->getLastError();
}

// Credentials:
// APP_ID:     ${appId}
// APP_SECRET: ${appSecret ?? "YOUR_APP_SECRET"}
?>`;
}

export default function DashboardPage() {
  const [app, setApp] = useState<AppRecord | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showSecret, setShowSecret] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppVersion, setNewAppVersion] = useState("1.0.0");
  const [renameName, setRenameName] = useState("");
  const [renameVersion, setRenameVersion] = useState("1.0.0");
  const [busyAction, setBusyAction] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("C++");
  const [loadingStats, setLoadingStats] = useState(false);

  function getSelectedApp(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authrd_selected_app");
  }

  async function loadFirstValidApp() {
    const token = getStoredToken();
    if (!token) return;
    try {
      const apps = await apiRequest<AppRecord[]>('/applications', { token });
      if (Array.isArray(apps) && apps.length > 0) {
        const firstApp = apps[0];
        localStorage.setItem('authrd_selected_app', firstApp._id);
        await loadAppData(firstApp._id);
      } else {
        setApp(null);
      }
    } catch {
      setApp(null);
    }
  }

  async function loadAppData(appId: string) {
    const token = getStoredToken();
    if (!token) return;
    setLoadingStats(true);
    try {
      // Load app details
      const appData = await apiRequest<AppRecord>(`/applications/${appId}`, { token });
      setApp(appData);

      // Load stats
      try {
        const statsData = await apiRequest<StatsData>(`/applications/${appId}/stats`, { token });
        setStats(statsData);
      } catch {
        // Fallback: compute from app data
        setStats({
          totalLicenses: appData.licenseCount || 0,
          activeLicenses: 0,
          expiredLicenses: 0,
          totalUsers: appData.userCount || 0
        });
      }

      // Load recent logs
      try {
        const logsResp = await apiRequest<{ logs: LogEntry[] }>(`/logs?appId=${appId}&limit=5`, { token });
        const arr = Array.isArray((logsResp as any)) ? (logsResp as any) : (logsResp && (logsResp as any).logs) || [];
        setLogs(arr.slice(0, 5));
      } catch {
        setLogs([]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error cargando datos";
      if (message.includes("Application not found")) {
        await loadFirstValidApp();
      } else {
        toast.error(message);
      }
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    const appId = getSelectedApp();
    if (appId) {
      loadAppData(appId);
    } else {
      loadFirstValidApp();
    }
  }, []);

  // Listen for app changes via storage event
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === "authrd_selected_app" && e.newValue) {
        loadAppData(e.newValue);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  async function regenerateSecret() {
    if (!app) return;
    setRegenerating(true);
    try {
      const token = getStoredToken();
      const updated = await apiRequest<AppRecord>(`/applications/${app._id}/regenerate-secret`, {
        method: "POST",
        token
      });
      setApp((prev) => prev ? { ...prev, appSecret: updated.appSecret } : prev);
      toast.success("Secret regenerado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error regenerando secret");
    } finally {
      setRegenerating(false);
    }
  }

  async function createApp() {
    if (!newAppName.trim()) {
      toast.error("Nombre de aplicación requerido");
      return;
    }

    setBusyAction(true);
    try {
      const token = getStoredToken();
      if (!token) throw new Error("Sesión inválida");

      const created = await apiRequest<AppRecord>("/applications", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: newAppName,
          version: newAppVersion,
        }),
      });

      localStorage.setItem("authrd_selected_app", created._id);
      setApp(created);
      setShowCreateModal(false);
      setNewAppName("");
      setNewAppVersion("1.0.0");
      toast.success("Aplicación creada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error creando aplicación");
    } finally {
      setBusyAction(false);
    }
  }

  async function renameApp() {
    if (!app) return;
    if (!renameName.trim()) {
      toast.error("Nombre de aplicación requerido");
      return;
    }

    setBusyAction(true);
    try {
      const token = getStoredToken();
      if (!token) throw new Error("Sesión inválida");

      const updated = await apiRequest<AppRecord>(`/applications/${app._id}`, {
        method: "PUT",
        token,
        body: JSON.stringify({
          name: renameName,
          version: renameVersion,
        }),
      });

      setApp(updated);
      setShowRenameModal(false);
      toast.success("Aplicación renombrada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error renombrando aplicación");
    } finally {
      setBusyAction(false);
    }
  }

  async function togglePause() {
    if (!app) return;
    setBusyAction(true);
    try {
      const token = getStoredToken();
      if (!token) throw new Error("Sesión inválida");

      const updated = await apiRequest<AppRecord>(`/applications/${app._id}/pause`, {
        method: "POST",
        token,
      });

      setApp((prev) => prev ? { ...prev, status: updated.status } : prev);
      toast.success(`Aplicación ${updated.status === "paused" ? "pausada" : "reactivada"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error cambiando estado");
    } finally {
      setBusyAction(false);
    }
  }

  async function deleteApp() {
    if (!app) return;
    if (!confirm(`¿Eliminar ${app.name}? Esta acción no se puede deshacer.`)) return;

    setBusyAction(true);
    try {
      const token = getStoredToken();
      if (!token) throw new Error("Sesión inválida");

      await apiRequest(`/applications/${app._id}`, {
        method: "DELETE",
        token,
      });

      localStorage.removeItem("authrd_selected_app");
      setApp(null);
      setStats(null);
      setLogs([]);
      toast.success("Aplicación eliminada");
      // try load another app
      const nextApps = await apiRequest<AppRecord[]>("/applications", { token });
      if (nextApps.length > 0) {
        localStorage.setItem("authrd_selected_app", nextApps[0]._id);
        loadAppData(nextApps[0]._id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error eliminando aplicación");
    } finally {
      setBusyAction(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copiado`));
  }

  const logEventColor = (event: string) => {
    const e = event?.toLowerCase() || "";
    if (e.includes("success") || e.includes("exitoso") || e.includes("activ")) return "text-success";
    if (e.includes("fail") || e.includes("error") || e.includes("ban") || e.includes("invalid")) return "text-danger";
    if (e.includes("warn") || e.includes("hwid") || e.includes("expir")) return "text-warning";
    return "text-primary-light";
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Resumen operacional, credenciales API y actividad reciente."
        action={
          <Button variant="secondary" onClick={() => { const id = getSelectedApp(); if (id) loadAppData(id); }}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          className="bg-white text-surface hover:bg-slate-100 text-sm"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4" />
          Create App
        </Button>
        <Button
          variant="secondary"
          className="bg-surface-2 text-white hover:bg-surface-3 text-sm"
          onClick={() => {
            if (!app) return;
            setRenameName(app.name);
            setRenameVersion(app.version);
            setShowRenameModal(true);
          }}
          disabled={!app}
        >
          <Edit3 className="h-4 w-4" />
          Rename
        </Button>
        <Button
          variant="secondary"
          className="bg-surface-2 text-white hover:bg-surface-3 text-sm"
          onClick={togglePause}
          disabled={!app || busyAction}
        >
          <Pause className="h-4 w-4" />
          {app?.status === "paused" ? "Resume" : "Pause"}
        </Button>
        <Button
          variant="danger"
          className="text-sm"
          onClick={deleteApp}
          disabled={!app || busyAction}
        >
          <Trash2 className="h-4 w-4" />
          Delete App
        </Button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-surface-2/95 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Create App</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Nueva aplicación</h2>
                <p className="mt-2 text-sm text-muted-foreground">Crea una aplicación nueva para comenzar a gestionar licencias y usuarios.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full border border-border bg-surface p-2 text-muted transition hover:text-white hover:bg-surface-3"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-4">
              <label className="label">Nombre</label>
              <input
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                className="input w-full"
                placeholder="Nombre de la aplicación"
              />
              <label className="label">Versión</label>
              <input
                value={newAppVersion}
                onChange={(e) => setNewAppVersion(e.target.value)}
                className="input w-full"
                placeholder="1.0.0"
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full border border-border bg-surface py-2 px-4 text-sm text-muted hover:bg-surface-3"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={createApp}
                  disabled={busyAction}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Crear aplicación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-surface-2/95 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Rename App</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Renombrar aplicación</h2>
                <p className="mt-2 text-sm text-muted-foreground">Actualiza el nombre y la versión de la aplicación seleccionada.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="rounded-full border border-border bg-surface p-2 text-muted transition hover:text-white hover:bg-surface-3"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-4">
              <label className="label">Nombre</label>
              <input
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                className="input w-full"
                placeholder="Nuevo nombre de la aplicación"
              />
              <label className="label">Versión</label>
              <input
                value={renameVersion}
                onChange={(e) => setRenameVersion(e.target.value)}
                className="input w-full"
                placeholder="1.0.0"
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="rounded-full border border-border bg-surface py-2 px-4 text-sm text-muted hover:bg-surface-3"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={renameApp}
                  disabled={busyAction}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  <Edit3 className="h-4 w-4" />
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Licencias"
          value={loadingStats ? "..." : (stats?.totalLicenses ?? 0)}
          detail="Generadas en esta app"
          icon={KeyRound}
        />
        <StatCard
          title="Licencias Activas"
          value={loadingStats ? "..." : (stats?.activeLicenses ?? 0)}
          detail="En uso actualmente"
          icon={CheckCircle2}
        />
        <StatCard
          title="Licencias Expiradas"
          value={loadingStats ? "..." : (stats?.expiredLicenses ?? 0)}
          detail="Vencidas o inactivas"
          icon={XCircle}
        />
        <StatCard
          title="Total Usuarios"
          value={loadingStats ? "..." : (stats?.totalUsers ?? 0)}
          detail="Registrados en la app"
          icon={Users}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* API Credentials */}
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Credenciales API</h2>
            {app && (
              <Badge tone={app.status === "active" ? "success" : "warning"}>
                {app.status}
              </Badge>
            )}
          </div>

          {app ? (
            <div className="space-y-4">
              {/* APP ID */}
              <div className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted uppercase tracking-wider">APP ID</p>
                  <button
                    onClick={() => copyToClipboard(app.appId, "APP ID")}
                    className="text-muted hover:text-white transition p-1 rounded"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="font-mono text-sm text-primary-light break-all">{app.appId}</p>
              </div>

              {/* APP SECRET */}
              <div className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted uppercase tracking-wider">APP SECRET</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => app.appSecret && copyToClipboard(app.appSecret, "APP SECRET")}
                      className="text-muted hover:text-white transition p-1 rounded"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowSecret((v) => !v)}
                      className="text-muted hover:text-white transition p-1 rounded"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="font-mono text-sm break-all">
                  {showSecret ? (app.appSecret || "No disponible") : maskSecret(app.appSecret)}
                </p>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                loading={regenerating}
                onClick={regenerateSecret}
              >
                <RefreshCcw className="h-4 w-4" />
                Regenerar Secret
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {loadingStats ? "Cargando..." : "Selecciona una aplicación en el sidebar"}
            </p>
          )}
        </section>

        {/* Recent Activity */}
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Actividad Reciente</h2>
            <Activity className="h-4 w-4 text-muted" />
          </div>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {loadingStats ? "Cargando..." : "Sin actividad reciente"}
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log, i) => (
                <div key={log._id || i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-primary/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", logEventColor(log.event))}>
                      {log.event}
                    </p>
                    {log.description && (
                      <p className="text-xs text-muted-foreground truncate">{log.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      {log.ip && <span className="text-xs text-muted font-mono">{log.ip}</span>}
                      {log.createdAt && (
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Code Examples */}
      <section className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Integración SDK</h2>
          <div className="flex gap-1">
            {CODE_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  activeTab === tab
                    ? "bg-primary/10 text-primary-light border border-primary/20"
                    : "text-muted-foreground hover:text-white hover:bg-surface-2"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => {
              const code = getCodeExample(activeTab, app?.appId || "APP_ID", app?.appSecret || "APP_SECRET");
              copyToClipboard(code, "Código");
            }}
            className="absolute top-3 right-3 text-muted hover:text-white transition p-1.5 rounded bg-surface-3 border border-border"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <pre className="rounded-lg border border-border bg-surface-2 p-4 font-mono text-xs leading-relaxed text-muted-foreground overflow-x-auto">
            {getCodeExample(activeTab, app?.appId || "APP_ID", app?.appSecret || "APP_SECRET")}
          </pre>
        </div>
      </section>
    </>
  );
}
