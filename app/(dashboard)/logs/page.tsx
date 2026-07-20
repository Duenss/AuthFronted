"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCcw, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Button } from "@/components/ui";
import { apiRequest, getStoredToken } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type LogEntry = {
  _id: string;
  event: string;
  description?: string;
  ip?: string;
  createdAt?: string;
  username?: string;
  type?: string;
};

const EVENT_FILTERS = ["Todos", "Login", "Licencia", "HWID", "Error", "Ban"] as const;
type EventFilter = typeof EVENT_FILTERS[number];

function getEventTone(event: string): "success" | "danger" | "warning" | "default" {
  const e = event?.toLowerCase() || "";
  if (e.includes("success") || e.includes("exitoso") || e.includes("activ") || e.includes("generat")) return "success";
  if (e.includes("fail") || e.includes("error") || e.includes("invalid") || e.includes("ban")) return "danger";
  if (e.includes("warn") || e.includes("hwid") || e.includes("expir") || e.includes("mismatch")) return "warning";
  return "default";
}

function EventBadge({ event }: { event: string }) {
  const tone = getEventTone(event);
  const colors = {
    success: "bg-success/10 text-success border-success/20",
    danger: "bg-danger/10 text-danger border-danger/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    default: "bg-surface-3 text-muted-foreground border-border"
  };
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", colors[tone])}>
      {event}
    </span>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<EventFilter>("Todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  function getAppId() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authrd_selected_app");
  }

  async function loadLogs() {
    const appId = getAppId();
    if (!appId) return;
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    try {
      // backend returns { logs, pagination }
      const filterParam = filter !== "Todos" ? `&event=${encodeURIComponent(filter.toLowerCase())}` : "";
      const data = await apiRequest<{ logs: LogEntry[] }>(`/logs?appId=${appId}&limit=100${filterParam}`, { token });
      const arr = Array.isArray((data as any)) ? (data as any) : (data && (data as any).logs) || [];
      setLogs(arr as LogEntry[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error cargando logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLogs(); }, [filter]);

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.event?.toLowerCase().includes(q) ||
      log.description?.toLowerCase().includes(q) ||
      log.username?.toLowerCase().includes(q) ||
      log.ip?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <PageHeader
        title="Logs"
        description="Auditoría de logins, licencias, HWID, baneos y acciones de managers."
        action={
          <Button variant="secondary" onClick={loadLogs}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      <section className="card">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-1 flex-wrap">
            {EVENT_FILTERS.map((f) => (
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
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              className="input pl-10"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Evento</th>
                <th className="px-3 py-3 font-medium">Usuario</th>
                <th className="px-3 py-3 font-medium">Descripción</th>
                <th className="px-3 py-3 font-medium">IP</th>
                <th className="px-3 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Cargando...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No hay logs</td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log._id} className="border-b border-border/50 transition hover:bg-surface-2/50">
                    <td className="px-3 py-4">
                      <EventBadge event={log.event} />
                    </td>
                    <td className="px-3 py-4 text-muted-foreground">{log.username || "-"}</td>
                    <td className="px-3 py-4 text-muted-foreground max-w-xs truncate">{log.description || "-"}</td>
                    <td className="px-3 py-4">
                      <span className="font-mono text-xs text-muted-foreground">{log.ip || "-"}</span>
                    </td>
                    <td className="px-3 py-4 text-xs text-muted-foreground">{formatDate(log.createdAt)}</td>
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
