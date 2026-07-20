"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCcw, Ban, ShieldCheck, ChevronDown, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Badge, Button } from "@/components/ui";
import { apiRequest, getStoredToken } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type PanelUser = {
  _id: string;
  username: string;
  email: string;
  role: "user" | "admin" | "superadmin";
  isBanned: boolean;
  banReason?: string;
  lastLogin?: string;
  createdAt?: string;
  premiumTrialExpiresAt?: string;
};

// ── Definición de roles ───────────────────────────────────────
// user        → nuevo usuario, sin acceso premium
// admin       → premium completo, sin límites
// superadmin  → dueño de la plataforma
// admin+trial → admin con fecha de expiración (vuelve a 'user' al vencer)
const ROLE_OPTIONS = [
  { value: "user",       label: "Usuario",          description: "Acceso básico, límites del plan gratuito" },
  { value: "admin",      label: "Premium",           description: "Acceso completo sin limitaciones" },
  { value: "admin_trial",label: "Premium (Trial)",   description: "Premium por tiempo definido" },
  { value: "superadmin", label: "Super Admin",       description: "Control total de la plataforma" },
] as const;

type RoleOption = typeof ROLE_OPTIONS[number]["value"];

function RoleBadge({ role, trial }: { role: string; trial?: boolean }) {
  if (role === "superadmin") return <Badge tone="danger">Super Admin</Badge>;
  if (role === "admin" && trial) return <Badge tone="warning">Premium Trial</Badge>;
  if (role === "admin") return <Badge tone="success">Premium</Badge>;
  return <Badge>Usuario</Badge>;
}

function BanBadge({ isBanned }: { isBanned: boolean }) {
  if (isBanned) return <span className="text-xs text-danger font-medium">Baneado</span>;
  return <span className="text-xs text-muted-foreground">Activo</span>;
}

export default function AdminPanelPage() {
  const [users, setUsers] = useState<PanelUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Modal de cambio de rol
  const [modalUser, setModalUser] = useState<PanelUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleOption>("user");
  const [trialExpiry, setTrialExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    try {
      const roleParam = roleFilter !== "all" ? `&role=${roleFilter}` : "";
      const data = await apiRequest<any>(
        `/admin/users?limit=200${roleParam}`,
        { token }
      );
      const list: PanelUser[] = Array.isArray(data)
        ? data
        : (data?.users ?? []);
      setUsers(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, [roleFilter]);

  function openRoleModal(user: PanelUser) {
    setModalUser(user);
    const isTrial = user.role === "admin" && !!user.premiumTrialExpiresAt;
    setSelectedRole(isTrial ? "admin_trial" : (user.role as RoleOption));
    // Default trial: 30 días desde hoy
    if (user.premiumTrialExpiresAt) {
      setTrialExpiry(user.premiumTrialExpiresAt.slice(0, 16));
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      const pad = (n: number) => String(n).padStart(2, "0");
      setTrialExpiry(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00`);
    }
  }

  async function saveRole() {
    if (!modalUser) return;
    const token = getStoredToken();
    if (!token) return;
    setSaving(true);
    try {
      const isTrial = selectedRole === "admin_trial";
      await apiRequest(`/admin/users/${modalUser._id}/role`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          role: isTrial ? "admin" : selectedRole,
          premiumTrialExpiresAt: isTrial ? trialExpiry : undefined,
        }),
      });
      toast.success("Rol actualizado");
      setModalUser(null);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error actualizando rol");
    } finally {
      setSaving(false);
    }
  }

  async function toggleBan(user: PanelUser) {
    const token = getStoredToken();
    if (!token) return;
    try {
      await apiRequest(`/admin/users/${user._id}/${user.isBanned ? "unban" : "ban"}`, {
        method: "POST",
        token,
        body: JSON.stringify({ reason: "Baneado desde el panel admin" }),
      });
      toast.success(user.isBanned ? "Usuario desbaneado" : "Usuario baneado");
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function deleteUser(user: PanelUser) {
    if (!window.confirm(`¿Eliminar usuario ${user.username}? Esta acción es irreversible.`)) return;
    const token = getStoredToken();
    if (!token) return;
    try {
      await apiRequest(`/admin/users/${user._id}`, {
        method: "DELETE",
        token,
      });
      toast.success("Usuario eliminado");
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error eliminando usuario");
    }
  }

  return (
    <>
      <PageHeader
        title="Admin Panel"
        description="Gestiona los usuarios de la plataforma y sus roles."
        action={
          <Button variant="secondary" onClick={loadUsers}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        }
      />

      {/* Filtro de roles */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { value: "all",        label: "Todos" },
          { value: "user",       label: "Usuarios" },
          { value: "admin",      label: "Premium" },
          { value: "superadmin", label: "Super Admin" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setRoleFilter(f.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              roleFilter === f.value
                ? "bg-primary/10 text-primary-light border border-primary/20"
                : "text-muted-foreground hover:text-white hover:bg-surface-2"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Leyenda de roles */}
      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ROLE_OPTIONS.map((r) => (
          <div key={r.value} className="rounded-lg border border-border bg-surface-2 px-4 py-3">
            <p className="text-xs font-semibold text-white">{r.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <section className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Usuario</th>
                <th className="px-3 py-3 font-medium">Email</th>
                <th className="px-3 py-3 font-medium">Rol</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium">Trial expira</th>
                <th className="px-3 py-3 font-medium">Último Login</th>
                <th className="px-3 py-3 font-medium">Registro</th>
                <th className="px-3 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Cargando...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No hay usuarios</td>
                </tr>
              ) : (
                users.map((user) => {
                  const isTrial = user.role === "admin" && !!user.premiumTrialExpiresAt;
                  return (
                    <tr key={user._id} className="border-b border-border/50 transition hover:bg-surface-2/50">
                      <td className="px-3 py-4 font-medium text-white">{user.username}</td>
                      <td className="px-3 py-4 text-xs text-muted-foreground">{user.email}</td>
                      <td className="px-3 py-4">
                        <RoleBadge role={user.role} trial={isTrial} />
                      </td>
                      <td className="px-3 py-4">
                        <BanBadge isBanned={user.isBanned} />
                      </td>
                      <td className="px-3 py-4 text-xs text-muted-foreground">
                        {isTrial && user.premiumTrialExpiresAt
                          ? formatDate(user.premiumTrialExpiresAt)
                          : "-"}
                      </td>
                      <td className="px-3 py-4 text-xs text-muted-foreground">{formatDate(user.lastLogin)}</td>
                      <td className="px-3 py-4 text-xs text-muted-foreground">{formatDate(user.createdAt)}</td>
                      <td className="px-3 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Cambiar rol */}
                          <button
                            onClick={() => openRoleModal(user)}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-surface-3 text-white hover:bg-surface-2 border border-border transition-all"
                            title="Cambiar rol"
                          >
                            Rol <ChevronDown className="h-3 w-3" />
                          </button>
                          {/* Ban / Unban */}
                          <button
                            onClick={() => toggleBan(user)}
                            className={cn(
                              "p-1.5 rounded-md transition-all",
                              user.isBanned
                                ? "text-success hover:bg-success/10"
                                : "text-warning hover:bg-warning/10"
                            )}
                            title={user.isBanned ? "Desbanear" : "Banear"}
                          >
                            {user.isBanned
                              ? <ShieldCheck className="h-4 w-4" />
                              : <Ban className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => deleteUser(user)}
                            className="p-1.5 rounded-md text-danger hover:bg-danger/10 transition-all"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal cambio de rol */}
      {modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalUser(null)} />
          <div className="relative w-[440px] max-w-[95%] rounded-xl bg-surface-2 p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-1">Cambiar Rol</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Usuario: <span className="text-white font-medium">{modalUser.username}</span>
            </p>

            <div className="grid gap-3 mb-4">
              {ROLE_OPTIONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                    selectedRole === r.value
                      ? "border-primary/50 bg-primary/10"
                      : "border-border hover:border-border-2 hover:bg-surface-3"
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={selectedRole === r.value}
                    onChange={() => setSelectedRole(r.value as RoleOption)}
                    className="mt-0.5 accent-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Fecha de expiración — solo para trial */}
            {selectedRole === "admin_trial" && (
              <label className="block mb-4">
                <span className="label text-xs uppercase tracking-wider text-muted-foreground">
                  Premium expira el
                </span>
                <input
                  className="input mt-1"
                  type="datetime-local"
                  value={trialExpiry}
                  onChange={(e) => setTrialExpiry(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Al vencer, el usuario volverá al rol "Usuario" automáticamente.
                </p>
              </label>
            )}

            <div className="flex gap-2 mt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setModalUser(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" loading={saving} onClick={saveRole}>
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
