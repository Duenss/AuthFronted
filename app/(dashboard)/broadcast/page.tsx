"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Megaphone, Plus, Trash2, Send, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Button } from "@/components/ui";
import { apiRequest, getStoredToken } from "@/lib/api";
import toast from "react-hot-toast";

type BroadcastType = "info" | "warning" | "success" | "error";

interface Broadcast {
  _id: string;
  message: string;
  type: BroadcastType;
  active: boolean;
  createdAt: string;
}

const TYPE_STYLES: Record<BroadcastType, string> = {
  info:    "bg-blue-500/10 text-blue-300 border-blue-500/30",
  warning: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  error:   "bg-red-500/10 text-red-300 border-red-500/30",
};

const TYPE_EMOJI: Record<BroadcastType, string> = {
  info: "ℹ️", warning: "⚠️", success: "✅", error: "❌",
};

export default function BotHubPage() {
  const token = getStoredToken();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<BroadcastType>("info");
  const [sending, setSending] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<Broadcast[]>("/admin/broadcast/all", { token });
      setBroadcasts(Array.isArray(data) ? data : []);
    } catch {
      // fallback: try public endpoint
      try {
        const data = await apiRequest<Broadcast[]>("/admin/broadcast", { token });
        setBroadcasts(Array.isArray(data) ? data : []);
      } catch { setBroadcasts([]); }
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    load();
    apiRequest<{ role: string }>("/admin/plan-limits", { token })
      .then(d => { if (d.role === "superadmin") setIsSuperAdmin(true); })
      .catch(() => {});
  }, [load, token]);

  const send = useCallback(async () => {
    if (!message.trim()) { toast.error("Escribe un mensaje"); return; }
    setSending(true);
    try {
      await apiRequest("/admin/broadcast", {
        method: "POST", token,
        body: JSON.stringify({ message: message.trim(), type }),
      });
      toast.success("Broadcast enviado");
      setMessage("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al enviar");
    } finally { setSending(false); }
  }, [message, type, token, load]);

  const remove = useCallback(async (id: string) => {
    try {
      await apiRequest(`/admin/broadcast/${id}`, { method: "DELETE", token });
      toast.success("Broadcast eliminado");
      setBroadcasts(prev => prev.filter(b => b._id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  }, [token]);

  const activeBroadcasts = useMemo(() => broadcasts.filter(b => b.active !== false), [broadcasts]);
  const allBroadcasts    = useMemo(() => broadcasts, [broadcasts]);

  return (
    <>
      <PageHeader
        title="BotHub"
        description="Gestiona mensajes broadcast que aparecen en el panel y en la DLL."
        action={
          <Button variant="secondary" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      {/* ── Crear broadcast ── */}
      {isSuperAdmin && (
        <section className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="h-5 w-5 text-primary-light" />
            <h2 className="text-lg font-semibold text-white">Nuevo Broadcast</h2>
          </div>
          <div className="grid gap-4">
            <div className="grid grid-cols-4 gap-2">
              {(["info","warning","success","error"] as BroadcastType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition ${
                    type === t ? TYPE_STYLES[t] : "border-border bg-surface-2 text-muted-foreground hover:border-border"
                  }`}
                >
                  {TYPE_EMOJI[t]} {t}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Escribe el mensaje del broadcast..."
              className="input min-h-[90px] resize-none"
            />
            <div className="flex justify-end">
              <Button onClick={send} loading={sending}>
                <Send className="h-4 w-4" />
                Enviar Broadcast
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── Broadcasts activos ── */}
      <section className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary-light" />
            <h2 className="text-lg font-semibold text-white">Broadcasts Activos</h2>
          </div>
          <span className="text-xs text-muted-foreground">{activeBroadcasts.length} activos</span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
        ) : activeBroadcasts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No hay broadcasts activos.</p>
        ) : (
          <div className="grid gap-3">
            {activeBroadcasts.map(b => (
              <div key={b._id} className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${TYPE_STYLES[b.type as BroadcastType] || TYPE_STYLES.info}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">{TYPE_EMOJI[b.type as BroadcastType]} {b.type}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-white">{b.message}</p>
                </div>
                {isSuperAdmin && (
                  <button onClick={() => remove(b._id)} className="text-red-400 hover:text-red-300 transition flex-shrink-0 mt-0.5">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Historial completo (solo superadmin) ── */}
      {isSuperAdmin && allBroadcasts.length > activeBroadcasts.length && (
        <section className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Historial</h2>
          <div className="grid gap-2">
            {allBroadcasts.filter(b => b.active === false).map(b => (
              <div key={b._id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 opacity-50">
                <p className="text-sm text-muted-foreground truncate">{TYPE_EMOJI[b.type as BroadcastType]} {b.message}</p>
                <span className="text-[10px] text-muted shrink-0">{new Date(b.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
