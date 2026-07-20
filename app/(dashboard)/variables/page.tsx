"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, RefreshCcw, Trash2, Pencil, Check, X } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Button, Field, Textarea } from "@/components/ui";
import { apiRequest, getStoredToken } from "@/lib/api";

type Variable = {
  _id: string;
  name: string;
  value: string;
};

export default function VariablesPage() {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  // modal overlay form state
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Form state
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  function getAppId() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authrd_selected_app");
  }

  async function loadVariables() {
    const appId = getAppId();
    if (!appId) return;
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<Variable[]>(`/variables?appId=${appId}`, { token });
      setVariables(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error cargando variables");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadVariables(); }, []);

  async function createVariable() {
    const appId = getAppId();
    if (!appId) { toast.error("Selecciona una aplicación"); return; }
    if (!newName.trim()) { toast.error("El nombre es requerido"); return; }
    const token = getStoredToken();
    if (!token) return;
    setSaving(true);
    try {
      await apiRequest("/variables", {
        method: "POST",
        token,
        body: JSON.stringify({ appId, name: newName, value: newValue, isSecret: authenticated })
      });
      toast.success("Variable creada");
      setNewName(""); setNewValue(""); setAuthenticated(false); setShowForm(false);
      loadVariables();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error creando variable");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id: string) {
    const token = getStoredToken();
    if (!token) return;
    try {
      await apiRequest(`/variables/${id}`, {
        method: "PUT",
        token,
        body: JSON.stringify({ value: editValue })
      });
      setVariables((prev) => prev.map((v) => v._id === id ? { ...v, value: editValue } : v));
      setEditId(null);
      toast.success("Variable actualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error actualizando");
    }
  }

  async function deleteVariable(id: string) {
    const token = getStoredToken();
    if (!token) return;
    try {
      await apiRequest(`/variables/${id}`, { method: "DELETE", token });
      setVariables((prev) => prev.filter((v) => v._id !== id));
      toast.success("Variable eliminada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error eliminando");
    }
  }

  return (
    <>
      <PageHeader
        title="Variables"
        description="Variables remotas consumibles desde el SDK con Auth::GetVariable."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadVariables}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Crear Variable
            </Button>
          </div>
        }
      />

      {/* Create Form */}
      {showForm && (
          // variable modal overlay
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="relative w-[460px] max-w-[95%] rounded-2xl bg-surface-2 p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Add Variable</p>
                <h2 className="mt-3 text-2xl font-semibold">Nueva Variable</h2>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:bg-surface-3"
                onClick={() => setShowForm(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <Field
                label="Variable Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter variable name"
              />
              <Textarea
                label="Variable Data"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter variable data"
              />
              <label className="flex items-center gap-3 rounded-md border border-border/60 bg-surface-3 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={authenticated}
                  onChange={(e) => setAuthenticated(e.target.checked)}
                />
                <span>Authenticated</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button loading={saving} onClick={createVariable}>Add Variable</Button>
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
                <th className="px-3 py-3 font-medium">Valor</th>
                <th className="px-3 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">Cargando...</td></tr>
              ) : variables.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">No hay variables</td></tr>
              ) : (
                variables.map((variable) => (
                  <tr key={variable._id} className="border-b border-border/50 transition hover:bg-surface-2/50">
                    <td className="px-3 py-4">
                      <span className="font-mono text-sm text-primary-light">{variable.name}</span>
                    </td>
                    <td className="px-3 py-4">
                      {editId === variable._id ? (
                        <input
                          className="input py-1 text-sm"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">{variable.value}</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editId === variable._id ? (
                          <>
                            <button
                              onClick={() => saveEdit(variable._id)}
                              className="p-1.5 rounded-md text-success hover:bg-success/10 transition-all"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="p-1.5 rounded-md text-muted hover:text-white hover:bg-surface-3 transition-all"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditId(variable._id); setEditValue(variable.value); }}
                              className="p-1.5 rounded-md text-muted hover:text-white hover:bg-surface-3 transition-all"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteVariable(variable._id)}
                              className="p-1.5 rounded-md text-danger hover:bg-danger/10 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
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
