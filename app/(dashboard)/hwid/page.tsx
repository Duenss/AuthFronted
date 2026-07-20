"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MonitorX, RefreshCcw, Search, Ban, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Badge, Button } from "@/components/ui";
import { apiRequest, getStoredToken } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type HwidEntry = {
  _id: string;
  username: string;
  hwid?: string;
  status: string;
  lastLogin?: string;
  ip?: string;
};

const FILTERS = ["Todos", "Con HWID", "Sin HWID"] as const;
type Filter = typeof FILTERS[number];

export default function HwidPage() {
  const [entries, setEntries] = useState<HwidEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("Todos");

  function getAppId() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authrd_selected_app");
  }

  async function loadEntries() {
    const appId = getAppId();
    if (!appId) return;
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<any>(`/users?appId=${appId}&limit=500`, { token });
      const list = Array.isArray(data) ? data : (data?.users ?? []);
      setEntries(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error cargando HWIDs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadEntries(); }, []);

  async function resetHwid(id: string) {
    const token = getStoredToken();
    if (!token) return;
    try {
      await apiRequest(`/users/${id}/reset-hwid`, { method: "POST", token });
      setEntries((prev) => prev.map((e) => e._id === id ? { ...e, hwid: undefined } : e));
      toast.success("HWID reseteado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error reseteando HWID");
    }
  }

  async function resetAllHwids() {
    const appId = getAppId();
    const token = getStoredToken();
    if (!appId || !token) return;
    const withHwid = entries.filter((e) => e.hwid);
    if (withHwid.length === 0) { toast.error("No hay HWIDs para resetear"); return; }
    try {
      await Promise.all(
        withHwid.map((e) =>
          apiRequest(`/users/${e._id}/reset-hwid`, {
            method: "POST",
            token,
            body: JSON.stringify({ appId }),
          })
        )
      );
      setEntries((prev) => prev.map((e) => ({ ...e, hwid: undefined })));
      toast.success(`${withHwid.length} HWIDs reseteados`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error en reset masivo");
    }
  }

  async function banUser(id: string, currentStatus: string) {
    const token = getStoredToken();
    if (!token) return;
    const isBanned = currentStatus === "banned";
    try {
      await apiRequest(`/users/${id}/${isBanned ? "unban" : "ban"}`, { method: "POST", token });
      toast.success(isBanned ? "Usuario desbaneado" : "Usuario baneado");
      loadEntries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  }

  const filtered = entries.filter((e) => {
    // Tab filter
    if (filter === "Con HWID" && !e.hwid) return false;
    if (filter === "Sin HWID" && e.hwid) return false;
    // Search filter
    if (!search) return true;
    const q = search.toLowerCase();
    return e.username?.toLowerCase().includes(q) || e.hwid?.toLowerCase().includes(q) || e.ip?.toLowerCase().includes(q);
  });

  const totalConHwid = entries.filter((e) => e.hwid).length;
  const totalSinHwid = entries.filter((e) => !e.hwid).length;

  return (
    <>
      <PageHeader
        title="HWID"
        description="Gestiona los Hardware IDs vinculados a usuarios de la aplicación."
        action={
          <div className="flex gap-2">
            <Button variant="danger" onClick={resetAllHwids}>
              <MonitorX className="h-4 w-4" />
              Reset All HWIDs
            </Button>
            <Button variant="secondary" onClick={loadEntries}>
              <RefreshCcw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        }
      />

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total usuarios</p>
          <p className="text-2xl font-bold text-white">{entries.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Con HWID</p>
          <p className="text-2xl font-bold text-success">{totalConHwid}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sin HWID</p>
          <p className="text-2xl font-bold text-warning">{totalSinHwid}</p>
        </div>
      </div>

      <section className="card">
        {/* Search + Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              className="input pl-10"
              placeholder="Buscar usuario, HWID o IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1">
            {FILTERS.map((f) => (
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Usuario</th>
                <th className="px-3 py-3 font-medium">HWID</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium">IP</th>
                <th className="px-3 py-3 font-medium">Último Login</th>
                <th className="px-3 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Cargando...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    {entries.length === 0 ? "No hay usuarios registrados" : "No hay resultados"}
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry._id} className="border-b border-border/50 transition hover:bg-surface-2/50">
                    <td className="px-3 py-4 font-medium text-white">{entry.username}</td>
                    <td className="px-3 py-4">
                      {entry.hwid
                        ? <span className="font-mono text-xs text-primary-light">{entry.hwid}</span>
                        : <span className="text-xs text-muted-foreground italic">Sin HWID</span>
                      }
                    </td>
                    <td className="px-3 py-4">
                      {entry.status === "active"
                        ? <Badge tone="success">Activo</Badge>
                        : entry.status === "banned"
                        ? <Badge tone="danger">Baneado</Badge>
                        : <Badge>{entry.status}</Badge>
                      }
                    </td>
                    <td className="px-3 py-4">
                      <span className="font-mono text-xs text-muted-foreground">{entry.ip || "-"}</span>
                    </td>
                    <td className="px-3 py-4 text-xs text-muted-foreground">{formatDate(entry.lastLogin)}</td>
                    <td className="px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => resetHwid(entry._id)}
                          className={cn(
                            "p-1.5 rounded-md transition-all",
                            entry.hwid
                              ? "text-warning hover:bg-warning/10"
                              : "text-muted-foreground opacity-40 cursor-not-allowed"
                          )}
                          title={entry.hwid ? "Reset HWID" : "No tiene HWID"}
                          disabled={!entry.hwid}
                        >
                          <MonitorX className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => banUser(entry._id, entry.status)}
                          className={cn(
                            "p-1.5 rounded-md transition-all",
                            entry.status === "banned"
                              ? "text-success hover:bg-success/10"
                              : "text-danger hover:bg-danger/10"
                          )}
                          title={entry.status === "banned" ? "Desbanear" : "Banear"}
                        >
                          {entry.status === "banned"
                            ? <ShieldCheck className="h-4 w-4" />
                            : <Ban className="h-4 w-4" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
