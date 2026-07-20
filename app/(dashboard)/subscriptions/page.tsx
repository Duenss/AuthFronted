"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, RefreshCcw, Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Button } from "@/components/ui";
import { apiRequest, getStoredToken } from "@/lib/api";

type Subscription = {
  _id: string;
  name: string;
  level: number;
  description?: string;
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state (minimal: only name + level shown in modal)
  const [name, setName] = useState("");
  const [level, setLevel] = useState("1");

  function getAppId() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authrd_selected_app");
  }

  async function loadSubs() {
    const appId = getAppId();
    if (!appId) return;
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<Subscription[]>(`/subscriptions?appId=${appId}`, { token });
      setSubs(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error cargando suscripciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSubs(); }, []);

  function resetForm() {
    setName(""); setLevel("1");
    setEditId(null); setShowForm(false);
  }

  function startEdit(sub: Subscription) {
    setName(sub.name);
    setLevel(String(sub.level));
    setEditId(sub._id);
    setShowForm(true);
  }

  async function saveSub() {
    const appId = getAppId();
    if (!appId) { toast.error("Selecciona una aplicación"); return; }
    const token = getStoredToken();
    if (!token) return;
    setSaving(true);
    try {
      const body = {
        appId,
        name,
        level: parseInt(level),
      };
      if (editId) {
        await apiRequest(`/subscriptions/${editId}`, { method: "PUT", token, body: JSON.stringify(body) });
        toast.success("Suscripción actualizada");
      } else {
        await apiRequest("/subscriptions", { method: "POST", token, body: JSON.stringify(body) });
        toast.success("Suscripción creada");
      }
      resetForm();
      loadSubs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSub(id: string) {
    const token = getStoredToken();
    if (!token) return;
    try {
      await apiRequest(`/subscriptions/${id}`, { method: "DELETE", token });
      setSubs((prev) => prev.filter((s) => s._id !== id));
      toast.success("Suscripción eliminada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error eliminando");
    }
  }

  return (
    <>
      <PageHeader
        title="Suscripciones"
        description="Define niveles y precios (opcional) para licencias y usuarios."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadSubs}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button onClick={() => {
              const appId = getAppId();
              if (!appId) { toast.error("Selecciona una aplicación en el selector del sidebar antes de crear una suscripción"); return; }
              resetForm(); setShowForm(true);
            }}>
              <Plus className="h-4 w-4" />
              Crear Suscripción
            </Button>
          </div>
        }
      />

      {/* Modal form: show as overlay with only name + level */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={resetForm} />
          <div className="relative w-[420px] max-w-[95%] rounded-xl bg-surface-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editId ? "Editar" : "Create"} Suscripción</h3>
              <button className="text-muted-foreground" onClick={resetForm}>✕</button>
            </div>
            <div className="grid gap-4">
              <label className="block">
                <span className="label">Nombre</span>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Premium" />
              </label>
              <label className="block">
                <span className="label">Nivel</span>
                <input className="input" type="number" min="1" value={level} onChange={(e) => setLevel(e.target.value)} />
              </label>
              <div className="flex items-center gap-2">
                <Button className="flex-1" loading={saving} onClick={saveSub}>{editId ? "Actualizar" : "Create Subscription"}</Button>
                <Button variant="secondary" onClick={resetForm}>Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <section className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Nombre</th>
                <th className="px-3 py-3 font-medium">Nivel</th>
                <th className="px-3 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">Cargando...</td></tr>
              ) : subs.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">No hay suscripciones</td></tr>
              ) : (
                subs.map((sub) => (
                  <tr key={sub._id} className="border-b border-border/50 transition hover:bg-surface-2/50">
                    <td className="px-3 py-4 font-medium text-white">{sub.name}</td>
                    <td className="px-3 py-4 text-muted-foreground">{sub.level}</td>
                    <td className="px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(sub)}
                          className="p-1.5 rounded-md text-muted hover:text-white hover:bg-surface-3 transition-all"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteSub(sub._id)}
                          className="p-1.5 rounded-md text-danger hover:bg-danger/10 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
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
