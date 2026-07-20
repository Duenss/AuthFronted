"use client";
// v2 - fix usedBy object
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import {
  ChevronLeft, ChevronRight, KeyRound, Plus, RefreshCcw,
  Trash2, CheckCircle2, XCircle, Clock, Ban, MoreHorizontal, Copy, PauseCircle
} from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Badge, Button, StatCard } from "@/components/ui";
import { apiRequest, getStoredToken } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type License = {
  _id: string;
  key: string;
  subscription?: string;
  duration?: number;
  durationUnit?: string;
  status: string;
  usedBy?: string | { _id: string; username: string };
  createdBy?: string | { _id: string; username: string; email: string };
  createdAt?: string;
  expiresAt?: string;
};

type LicenseStats = {
  unused: number;
  active: number;
  expired: number;
  banned: number;
};

const STATUS_FILTERS = ["Todos", "Sin usar", "Activos", "Expirados", "Baneados"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

const STATUS_MAP: Record<StatusFilter, string> = {
  "Todos": "",
  "Sin usar": "unused",
  "Activos": "active",
  "Expirados": "expired",
  "Baneados": "banned"
};

function LicenseStatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "active") return <Badge tone="success">Activo</Badge>;
  if (s === "unused") return <Badge tone="default">Sin usar</Badge>;
  if (s === "expired") return <Badge tone="warning">Expirado</Badge>;
  if (s === "banned") return <Badge tone="danger">Baneado</Badge>;
  return <Badge>{status}</Badge>;
}

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<LicenseStats>({ unused: 0, active: 0, expired: 0, banned: 0 });
  const [filter, setFilter] = useState<StatusFilter>("Todos");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showGeneratedModal, setShowGeneratedModal] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; left: number } | null>(null);
  const actionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Form state
  const [quantity, setQuantity] = useState("1");
  const [mask, setMask] = useState("****-****-****-****");
  const [subscription, setSubscription] = useState("");
  const [duration, setDuration] = useState("1");
  const [durationUnit, setDurationUnit] = useState("days");
  const [useUppercase, setUseUppercase] = useState(true);
  const [useLowercase, setUseLowercase] = useState(true);

  function getAppId() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authrd_selected_app");
  }

  async function loadFirstValidApp() {
    const token = getStoredToken();
    if (!token) return;
    try {
      const apps = await apiRequest<any[]>('/applications', { token });
      if (Array.isArray(apps) && apps.length > 0) {
        const firstApp = apps[0];
        localStorage.setItem('authrd_selected_app', firstApp._id);
        await loadSubsForApp();
        loadLicenses(1);
      }
    } catch {
      // ignore
    }
  }

  async function loadSubsForApp() {
    const appId = getAppId();
    if (!appId) {
      setSubscriptions([]);
      setSubscription("");
      return;
    }
    const token = getStoredToken();
    if (!token) return;
    try {
      const data = await apiRequest(`/subscriptions?appId=${encodeURIComponent(appId)}`, { token });
      setSubscriptions(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setSubscription((prev) => (prev ? prev : data[0]._id));
      } else {
        setSubscription("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : null;
      if (message?.includes("Application not found")) {
        await loadFirstValidApp();
        return;
      }
      setSubscriptions([]);
    }
  }

  // Load mask per-application and listen for app selection changes
  useEffect(() => {
    function loadMaskForApp() {
      const appId = getAppId();
      if (!appId) return;
      const saved = localStorage.getItem(`authrd_mask_${appId}`);
      if (saved) setMask(saved);
    }

    loadMaskForApp();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "authrd_selected_app") {
        loadMaskForApp();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Persist mask automatically per application
  useEffect(() => {
    const appId = getAppId();
    if (!appId) return;
    try {
      localStorage.setItem(`authrd_mask_${appId}`, mask);
    } catch {}
  }, [mask]);

  const [subscriptions, setSubscriptions] = useState<{ _id: string; name: string; level: number }[]>([]);

  // Load subscriptions for current app
  useEffect(() => {
    loadSubsForApp();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "authrd_selected_app") loadSubsForApp();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function loadLicenses(pageNum = 1) {
    const appId = getAppId();
    if (!appId) return;
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    try {
      const statusParam = STATUS_MAP[filter] ? `&status=${STATUS_MAP[filter]}` : "";
      const data = await apiRequest<{ licenses: License[]; total: number; pages: number }>(
        `/licenses?appId=${appId}&page=${pageNum}&limit=20${statusParam}`,
        { token }
      );
      const list = Array.isArray(data) ? data : data.licenses || [];
      setLicenses(list);
      if (!Array.isArray(data)) {
        setTotalPages(data.pages || 1);
      }

      // Compute stats
      const all = await apiRequest<{ licenses: License[] }>(`/licenses?appId=${appId}&limit=9999`, { token });
      const arr = Array.isArray(all) ? all : all.licenses || [];
      setStats({
        unused: arr.filter((l) => l.status === "unused").length,
        active: arr.filter((l) => l.status === "active").length,
        expired: arr.filter((l) => l.status === "expired").length,
        banned: arr.filter((l) => l.status === "banned").length
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error cargando licencias";
      if (message.includes("Application not found")) {
        await loadFirstValidApp();
        return;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLicenses(1);
    setPage(1);
  }, [filter]);

  useEffect(() => {
    loadLicenses(page);
  }, [page]);

  async function generateLicenses() {
    const appId = getAppId();
    if (!appId) { toast.error("Selecciona una aplicación"); return; }
    const token = getStoredToken();
    if (!token) return;
    setGenerating(true);
    try {
      const data = await apiRequest<any>("/licenses/generate", {
        method: "POST",
        token,
        body: JSON.stringify({
          appId,
          count: parseInt(quantity, 10),
          quantity: parseInt(quantity, 10),
          mask,
          subscriptionId: subscription || undefined,
          duration: durationUnit === 'lifetime' ? null : parseInt(duration, 10),
          durationUnit,
          useUppercase,
          useLowercase,
        })
      });
      const created = Array.isArray(data) ? data : data;
      const keys = Array.isArray(created) ? created.map((item) => item.key).filter(Boolean) : [];
      setGeneratedKeys(keys);
      setShowGeneratedModal(true);
      setShowForm(false);
      loadLicenses(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error generando licencias");
    } finally {
      setGenerating(false);
    }
  }

  // Close action menu on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!actionMenuPos) return;
      // if click is on any action button, ignore (they toggle themselves)
      const inButton = Object.values(actionButtonRefs.current).some((btn) => btn && btn.contains(target));
      if (inButton) return;
      setActionMenuOpen(null);
      setActionMenuPos(null);
    }
    window.addEventListener("click", onDocClick);
    return () => window.removeEventListener("click", onDocClick);
  }, [actionMenuPos]);

  async function deleteLicense(key: string) {
    const token = getStoredToken();
    const appId = getAppId();
    if (!token || !appId) return;
    try {
      await apiRequest(`/licenses/${encodeURIComponent(key)}?appId=${appId}`, { method: "DELETE", token });
      setLicenses((prev) => prev.filter((l) => l.key !== key));
      toast.success("Licencia eliminada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error eliminando licencia");
    }
  }

  async function bulkDelete(action: string) {
    const appId = getAppId();
    if (!appId) return;
    const token = getStoredToken();
    if (!token) return;
    const actionMap: Record<string, string> = {
      "Eliminar Todas": "/licenses/bulk/all",
      "Eliminar Usadas": "/licenses/bulk/used",
      "Eliminar No Usadas": "/licenses/bulk/unused",
      "Eliminar Expiradas": "/licenses/bulk/expired"
    };
    const endpoint = actionMap[action];
    if (!endpoint) return;
    try {
      await apiRequest(endpoint, {
        method: "DELETE",
        token,
        body: JSON.stringify({ appId })
      });
      toast.success(`${action} completado`);
      loadLicenses(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error en acción masiva");
    }
  }

  async function copyLicenseKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      toast.success("Clave copiada al portapapeles");
      setActionMenuOpen(null);
    } catch (error) {
      toast.error("No se pudo copiar la clave");
    }
  }

  async function performLicenseAction(key: string, action: string, successMessage: string) {
    const appId = getAppId();
    const token = getStoredToken();
    if (!appId || !token) return;

    try {
      await apiRequest(`/licenses/${encodeURIComponent(key)}/${action}?appId=${appId}`, {
        method: "POST",
        token,
      });
      toast.success(successMessage);
      setActionMenuOpen(null);
      loadLicenses(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Error en acción ${action}`);
    }
  }

  async function resetLicenseHwid(key: string) {
    await performLicenseAction(key, 'reset-hwid', 'HWID reiniciado');
  }

  async function pauseLicense(key: string) {
    await performLicenseAction(key, 'pause', 'Licencia pausada');
  }

  async function banLicense(key: string) {
    await performLicenseAction(key, 'ban', 'Licencia baneada');
  }

  return (
    <>
      <PageHeader
        title="Licencias"
        description="Genera, filtra y administra licencias por suscripción y estado."
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            Generar Licencias
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Sin usar" value={stats.unused} detail="Disponibles" icon={KeyRound} />
        <StatCard title="Activas" value={stats.active} detail="En uso" icon={CheckCircle2} />
        <StatCard title="Expiradas" value={stats.expired} detail="Vencidas" icon={Clock} />
        <StatCard title="Baneadas" value={stats.banned} detail="Bloqueadas" icon={Ban} />
      </div>

      {/* Generate Form is now presented as a modal overlay */}

      {/* Bulk Actions */}
      <section className="card mb-6">
        <p className="text-sm font-medium text-muted-foreground mb-3">Acciones Masivas</p>
        <div className="flex flex-wrap gap-2">
          {["Eliminar Todas", "Eliminar Usadas", "Eliminar No Usadas", "Eliminar Expiradas"].map((action) => (
            <Button key={action} variant="danger" onClick={() => bulkDelete(action)}>
              <Trash2 className="h-3.5 w-3.5" />
              {action}
            </Button>
          ))}
          <Button variant="secondary" onClick={() => loadLicenses(page)}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Actualizar
          </Button>
        </div>

        {/* Floating action menu rendered at fixed position so it's not clipped by overflow */}
        {actionMenuOpen && actionMenuPos && (
          <div
            style={{ top: actionMenuPos.top, left: actionMenuPos.left }}
            className="fixed z-[9999] w-48 rounded-xl border border-border bg-surface-2 p-2 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-3"
              onClick={() => { if (actionMenuOpen) copyLicenseKey(actionMenuOpen); }}
            >
              <Copy className="h-4 w-4" /> Copiar clave
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-3"
              onClick={() => { if (actionMenuOpen) resetLicenseHwid(actionMenuOpen); }}
            >
              <RefreshCcw className="h-4 w-4" /> Reiniciar HWID
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-3"
              onClick={() => { if (actionMenuOpen) pauseLicense(actionMenuOpen); }}
            >
              <PauseCircle className="h-4 w-4" /> Pausar licencia
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-3"
              onClick={() => { if (actionMenuOpen) banLicense(actionMenuOpen); }}
            >
              <Ban className="h-4 w-4" /> Banear licencia
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-surface-3"
              onClick={() => { if (actionMenuOpen) deleteLicense(actionMenuOpen); }}
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
          </div>
        )}

      </section>

        

      {/* Table */}
      <section className="card">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mb-4 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                filter === f
                  ? "bg-primary/10 text-primary-light border border-primary/20"
                  : "text-muted-foreground hover:text-white hover:bg-surface-2"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">License Key</th>
                <th className="px-3 py-3 font-medium">Suscripción</th>
                <th className="px-3 py-3 font-medium">Duración</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium">Generado por</th>
                <th className="px-3 py-3 font-medium">Creado</th>
                <th className="px-3 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : licenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No hay licencias
                  </td>
                </tr>
              ) : (
                licenses.map((license) => (
                  <tr key={license._id} className="border-b border-border/50 transition hover:bg-surface-2/50">
                    <td className="px-3 py-4">
                      <span className="font-mono text-xs text-primary-light">{license.key}</span>
                    </td>
                    <td className="px-3 py-4 text-muted-foreground">
                      {(() => {
                        const sub = license.subscription as any;
                        if (!sub) return "-";
                        if (typeof sub === "object") return `${sub.name}${sub.level ? ` (lvl ${sub.level})` : ""}`;
                        return subscriptions.find(s => s._id === sub)?.name || "-";
                      })()}
                    </td>
                    <td className="px-3 py-4 text-muted-foreground">
                      {license.durationUnit === 'lifetime'
                        ? "Lifetime"
                        : license.duration
                        ? `${license.duration} ${license.durationUnit || "días"}`
                        : "-"}
                    </td>
                    <td className="px-3 py-4">
                      <LicenseStatusBadge status={license.status} />
                    </td>
                    <td className="px-3 py-4 text-muted-foreground">
                      {(() => {
                        const cb = license.createdBy as any;
                        if (!cb) return "-";
                        if (typeof cb === "object") return cb.username || cb.email || "-";
                        return cb;
                      })()}
                    </td>
                    <td className="px-3 py-4 text-muted-foreground text-xs">{formatDate(license.createdAt)}</td>
                    <td className="px-3 py-4 text-right relative">
                      <Button
                        variant="ghost"
                        className="px-2"
                        ref={(el) => { actionButtonRefs.current[license.key] = el; }}
                        onClick={(e) => {
                          const el = actionButtonRefs.current[license.key];
                          if (!el) return;
                          const rect = el.getBoundingClientRect();
                          setActionMenuPos({ top: rect.bottom + 8, left: Math.max(8, rect.right - 200) });
                          setActionMenuOpen((current) => (current === license.key ? null : license.key));
                          e.stopPropagation();
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="px-2 py-1"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                className="px-2 py-1"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Modal for generating licenses */}
        {showForm && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-auto bg-black/60 px-4 py-6">
            <div className="absolute inset-0 bg-black/60 z-[9999]" onClick={() => setShowForm(false)} />
            <div className="relative z-[10001] mx-auto w-full max-w-[480px] max-h-[calc(100vh-4rem)] overflow-y-auto rounded-xl bg-surface-2 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Crear una nueva clave</h3>
                <button className="text-muted-foreground" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <div className="grid gap-4">
                <label className="block">
                  <span className="label">Cantidad</span>
                  <input className="input" type="number" min="1" max="1000" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </label>
                <label className="block">
                  <span className="label">Máscara</span>
                  <input className="input" value={mask} onChange={(e) => setMask(e.target.value)} placeholder="****-****-****-****" />
                </label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useUppercase}
                      onChange={(e) => setUseUppercase(e.target.checked)}
                      className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                    />
                    Mayúsculas
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useLowercase}
                      onChange={(e) => setUseLowercase(e.target.checked)}
                      className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                    />
                    Minúsculas
                  </label>
                </div>
                <label className="block">
                  <span className="label">Suscripción</span>
                  <select className="input" value={subscription} onChange={(e) => setSubscription(e.target.value)}>
                    <option value="">-- Seleccionar --</option>
                    {subscriptions.map((s) => (
                      <option key={s._id} value={s._id}>{s.name} {s.level ? `(lvl ${s.level})` : ''}</option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="label">Duración</span>
                    <input className="input" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} disabled={durationUnit === 'lifetime'} />
                  </label>
                  <label className="block">
                    <span className="label">Unidad</span>
                    <select className="input" value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)}>
                      <option value="seconds">Segundos</option>
                      <option value="minutes">Minutos</option>
                      <option value="hours">Horas</option>
                      <option value="days">Días</option>
                      <option value="weeks">Semanas</option>
                      <option value="months">Meses</option>
                      <option value="years">Años</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </label>
                </div>
                <div className="mt-2">
                  <Button className="w-full" loading={generating} onClick={generateLicenses}>
                    Generate Keys
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showGeneratedModal && (
          <div className="fixed inset-0 z-50 overflow-auto bg-black/60 px-4 py-6">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowGeneratedModal(false)} />
            <div className="relative mx-auto w-full max-w-[520px] rounded-xl bg-surface-2 p-6 shadow-2xl z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-muted">Keys Generated</p>
                  <h3 className="text-xl font-semibold">Keys Generated Successfully</h3>
                </div>
                <button className="text-muted-foreground" onClick={() => setShowGeneratedModal(false)}>✕</button>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                {generatedKeys.length === 1 ? (
                  <div className="grid gap-3">
                    <input
                      readOnly
                      value={generatedKeys[0]}
                      className="input bg-surface text-white"
                    />
                    <Button className="w-full" onClick={async () => {
                      await navigator.clipboard.writeText(generatedKeys[0]);
                      toast.success('License copied to clipboard');
                    }}>
                      <Copy className="h-4 w-4" /> Copy New License
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <textarea
                      readOnly
                      value={generatedKeys.join('\n')}
                      className="input h-40 resize-none bg-surface text-white"
                    />
                    <Button className="w-full" onClick={async () => {
                      await navigator.clipboard.writeText(generatedKeys.join('\n'));
                      toast.success('Licenses copied to clipboard');
                    }}>
                      <Copy className="h-4 w-4" /> Copy All Keys
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      
    </>
  );
}
