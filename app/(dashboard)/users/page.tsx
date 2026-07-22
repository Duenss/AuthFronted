"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, RefreshCcw, Trash2, Ban, ShieldCheck, MonitorX, X, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Badge, Button } from "@/components/ui";
import { apiRequest, getStoredToken } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Subscription = { _id: string; name: string; level: number };

type AppUser = {
  _id: string;
  username: string;
  status: string;
  hwid?: string;
  ip?: string;
  lastLogin?: string;
  subscription?: Subscription | null;
  expiresAt?: string;
  createdAt?: string;
  licenseKey?: string;
};

const STATUS_FILTERS = ["Todos", "Activos", "Baneados"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

function UserStatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "active") return <Badge tone="success">Activo</Badge>;
  if (s === "banned") return <Badge tone="danger">Baneado</Badge>;
  return <Badge>{status}</Badge>;
}

/** Quita el prefijo ::ffff: de IPv4 mapeadas */
function normalizeIp(ip?: string | null): string {
  if (!ip) return "-";
  if (ip === "::1" || ip === "::ffff:127.0.0.1") return "127.0.0.1";
  if (ip.startsWith("::ffff:")) return ip.replace("::ffff:", "");
  return ip;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("Todos");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resetUser, setResetUser] = useState<AppUser | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  // Form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newSubscription, setNewSubscription] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  function getAppId() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authrd_selected_app");
  }

  async function loadUsers() {
    const appId = getAppId();
    if (!appId) return;
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    try {
      const statusParam =
        filter === "Activos" ? "&status=active" :
        filter === "Baneados" ? "&status=banned" : "";
      const data = await apiRequest<any>(
        `/users?appId=${appId}${statusParam}&limit=500`,
        { token }
      );
      const list: AppUser[] = Array.isArray(data)
        ? data
        : (data?.users ?? []);
      setUsers(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, [filter]);

  useEffect(() => {
    (async () => {
      const appId = getAppId();
      if (!appId) return setSubscriptions([]);
      const token = getStoredToken();
      if (!token) return;
      try {
        const data = await apiRequest<Subscription[]>(
          `/subscriptions?appId=${encodeURIComponent(appId)}`,
          { token }
        );
        setSubscriptions(Array.isArray(data) ? data : []);
      } catch {
        setSubscriptions([]);
      }
    })();
  }, []);

  function openModal() {
    setNewUsername("");
    setNewPassword("");
    setNewSubscription(subscriptions[0]?._id || "");
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const pad = (n: number) => String(n).padStart(2, "0");
    setNewExpiresAt(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
    setShowModal(true);
  }

  async function createUser() {
    if (!newUsername.trim()) { toast.error("El usuario es requerido"); return; }
    if (!newPassword.trim()) { toast.error("La contraseña es requerida"); return; }
    const appId = getAppId();
    if (!appId) { toast.error("Selecciona una aplicación"); return; }
    const token = getStoredToken();
    if (!token) return;
    setCreating(true);
    try {
      await apiRequest("/users", {
        method: "POST",
        token,
        body: JSON.stringify({
          appId,
          username: newUsername,
          password: newPassword,
          subscriptionId: newSubscription || undefined,
          expiresAt: newExpiresAt || undefined,
        }),
      });
      toast.success("Usuario creado");
      setShowModal(false);
      loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error creando usuario");
    } finally {
      setCreating(false);
    }
  }

  async function banUser(id: string, currentStatus: string) {
    const appId = getAppId();
    const token = getStoredToken();
    if (!token || !appId) return;
    const isBanned = currentStatus === "banned";
    try {
      await apiRequest(`/users/${id}/${isBanned ? "unban" : "ban"}`, {
        method: "POST",
        token,
        body: JSON.stringify({ appId }),
      });
      toast.success(isBanned ? "Usuario desbaneado" : "Usuario baneado");
      loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  }

  async function resetHwid(id: string) {
    const appId = getAppId();
    const token = getStoredToken();
    if (!token || !appId) return;
    try {
      await apiRequest(`/users/${id}/reset-hwid`, {
        method: "POST",
        token,
        body: JSON.stringify({ appId }),
      });
      toast.success("HWID reseteado");
      loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error reseteando HWID");
    }
  }

  async function submitPasswordReset() {
    if (!resetUser) return;
    if (!resetPasswordValue.trim()) {
      toast.error("La contraseña es requerida");
      return;
    }
    const appId = getAppId();
    const token = getStoredToken();
    if (!token || !appId) return;
    setResettingPassword(true);
    try {
      await apiRequest(`/users/${resetUser._id}/reset-password`, {
        method: "POST",
        token,
        body: JSON.stringify({ appId, password: resetPasswordValue }),
      });
      toast.success(`Contraseña de ${resetUser.username} actualizada`);
      setResetUser(null);
      setResetPasswordValue("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error reseteando contraseña");
    } finally {
      setResettingPassword(false);
    }
  }

  async function deleteUser(id: string) {
    const appId = getAppId();
    const token = getStoredToken();
    if (!token || !appId) return;
    try {
      await apiRequest(`/users/${id}?appId=${appId}`, {
        method: "DELETE",
        token,
      });
      setUsers((prev) => prev.filter((u) => u._id !== id));
      toast.success("Usuario eliminado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error eliminando usuario");
    }
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Administra usuarios de la aplicación, bans y resets de HWID."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadUsers}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button onClick={openModal}>
              <Plus className="h-4 w-4" />
              Crear Usuario
            </Button>
          </div>
        }
      />

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative w-[480px] max-w-[95%] rounded-xl bg-surface-2 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Crear Usuario</h3>
              <button className="text-muted-foreground hover:text-white transition-colors" onClick={() => setShowModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4">
              <label className="block">
                <span className="label text-xs uppercase tracking-wider text-muted-foreground">Usuario</span>
                <input className="input mt-1" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Ingresa el usuario" autoComplete="off" />
              </label>
              <label className="block">
                <span className="label text-xs uppercase tracking-wider text-muted-foreground">Contraseña</span>
                <input className="input mt-1" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Ingresa la contraseña" autoComplete="new-password" />
              </label>
              <label className="block">
                <span className="label text-xs uppercase tracking-wider text-muted-foreground">Suscripción</span>
                <select className="input mt-1" value={newSubscription} onChange={(e) => setNewSubscription(e.target.value)}>
                  <option value="">-- Sin suscripción --</option>
                  {subscriptions.map((s) => (
                    <option key={s._id} value={s._id}>{s.level ? `${s.level} (${s.name})` : s.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label text-xs uppercase tracking-wider text-muted-foreground">Fecha de Expiración</span>
                <input className="input mt-1" type="datetime-local" value={newExpiresAt} onChange={(e) => setNewExpiresAt(e.target.value)} />
              </label>
              <div className="mt-2">
                <Button className="w-full" loading={creating} onClick={createUser}>Agregar Usuario</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setResetUser(null); setResetPasswordValue(""); }} />
          <div className="relative w-[420px] max-w-[95%] rounded-xl bg-surface-2 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Resetear contraseña</h3>
              <button className="text-muted-foreground hover:text-white transition-colors" onClick={() => { setResetUser(null); setResetPasswordValue(""); }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Usuario: <span className="text-white font-medium">{resetUser.username}</span>
            </p>
            <label className="block">
              <span className="label text-xs uppercase tracking-wider text-muted-foreground">Nueva contraseña</span>
              <input
                className="input mt-1"
                type="password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="Ej: 1"
                autoComplete="new-password"
              />
            </label>
            <div className="mt-4">
              <Button className="w-full" loading={resettingPassword} onClick={submitPasswordReset}>
                Guardar contraseña
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <section className="card">
        <div className="flex items-center gap-1 mb-4">
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
            >{f}</button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Username</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium">Suscripción</th>
                <th className="px-3 py-3 font-medium">IP</th>
                <th className="px-3 py-3 font-medium">Generado por</th>
                <th className="px-3 py-3 font-medium">Último Login</th>
                <th className="px-3 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Cargando...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No hay usuarios</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="border-b border-border/50 transition hover:bg-surface-2/50">
                    <td className="px-3 py-4 font-medium text-white">{user.username}</td>
                    <td className="px-3 py-4"><UserStatusBadge status={user.status} /></td>
                    <td className="px-3 py-4">
                      {user.subscription ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-light border border-primary/20">
                          {user.subscription.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <span className="font-mono text-xs text-muted-foreground">{normalizeIp(user.ip)}</span>
                    </td>
                    <td className="px-3 py-4">
                      <span className="font-mono text-xs text-muted-foreground">
                        {user.licenseKey || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs text-muted-foreground">{formatDate(user.lastLogin)}</td>
                    <td className="px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => banUser(user._id, user.status)}
                          className={cn(
                            "p-1.5 rounded-md transition-all",
                            user.status === "banned"
                              ? "text-success hover:bg-success/10"
                              : "text-warning hover:bg-warning/10"
                          )}
                          title={user.status === "banned" ? "Desbanear" : "Banear"}
                        >
                          {user.status === "banned" ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => { setResetUser(user); setResetPasswordValue(""); }}
                          className="p-1.5 rounded-md text-primary-light hover:bg-primary/10 transition-all"
                          title="Resetear contraseña"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => resetHwid(user._id)}
                          className="p-1.5 rounded-md text-muted hover:text-white hover:bg-surface-3 transition-all"
                          title="Reset HWID"
                        >
                          <MonitorX className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(user._id)}
                          className="p-1.5 rounded-md text-danger hover:bg-danger/10 transition-all"
                          title="Eliminar"
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
