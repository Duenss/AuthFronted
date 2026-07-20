"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Trash2, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Badge, Button, Field } from "@/components/ui";
import { apiRequest, getStoredToken } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type ManagerRow = {
  _id: string;
  username: string;
  email: string;
  isActive?: boolean;
  appIds?: { _id: string; name: string }[];
  permissions?: Record<string, boolean>;
  createdAt?: string;
  lastLogin?: string;
};

const permissionLabelMap: Record<string, string> = {
  createUsers: "Users",
  createLicenses: "Licenses",
  manageVariables: "Variables",
  viewLogs: "Logs",
  viewStats: "Stats",
};

const defaultPermissions = {
  createUsers: false,
  createLicenses: false,
  manageVariables: false,
  viewLogs: false,
  viewStats: false,
};

const formatPermissions = (permissions?: ManagerRow["permissions"]) => {
  if (!permissions) return "None";
  const enabled = Object.entries(permissions)
    .filter(([, value]) => value)
    .map(([key]) => permissionLabelMap[key] || key);
  return enabled.length > 0 ? enabled.join(", ") : "None";
};

const formatAppNames = (appIds?: ManagerRow["appIds"]) => {
  if (!appIds || appIds.length === 0) return "-";
  return appIds.map((app) => app.name).join(", ");
};

export default function TeamPage() {
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [loading, setLoading] = useState(false);

  const token = getStoredToken();

  const loadManagers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<ManagerRow[]>("/managers", { token });
      setManagers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el equipo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadManagers();
      if (!token) return;
      try {
        const data = await apiRequest<{ _id: string; name: string }[]>('/applications', { token });
        setApps(Array.isArray(data) ? data : []);
      } catch (err) {
        // ignore - apps list is optional
      }
    })();
  }, []);

  // Fetch subscriptions for the first selected app when selection changes
  useEffect(() => {
    // placeholder: moved below after state declarations to avoid TDZ
  }, []);

  const handleDelete = async (row: ManagerRow) => {
    if (!token) return toast.error("No se encontró token de sesión");
    try {
      await apiRequest(`/managers/${row._id}`, {
        method: "DELETE",
        token,
      });
      setManagers((current) => current.filter((manager) => manager._id !== row._id));
      toast.success("Manager eliminado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el manager");
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [apps, setApps] = useState<{ _id: string; name: string }[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [subscriptions, setSubscriptions] = useState<{ _id: string; name: string; level: number; description?: string }[]>([]);
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  // Fetch subscriptions for the first selected app when selection changes
  useEffect(() => {
    (async () => {
      if (!token) return;
      const appId = selectedAppIds[0];
      if (!appId) {
        setSubscriptions([]);
        setSelectedSubscriptionIds([]);
        return;
      }
      try {
        const data = await apiRequest(`/subscriptions?appId=${encodeURIComponent(appId)}`, { token });
        setSubscriptions(Array.isArray(data) ? data : []);
      } catch (err) {
        setSubscriptions([]);
      }
    })();
  }, [selectedAppIds]);

  const filteredManagers = useMemo(
    () => managers.filter((manager) =>
      JSON.stringify(manager).toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [managers, searchQuery]
  );

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setPermissions(defaultPermissions);
    setSelectedAppIds([]);
  };

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return toast.error("No se encontró token de sesión");

    try {
      await apiRequest("/managers", {
        method: "POST",
        token,
        body: JSON.stringify({
          username,
          email,
          password,
          permissions,
          appIds: selectedAppIds,
          description,
          allowedSubscriptions: selectedSubscriptionIds,
        }),
      });
      toast.success("Manager creado");
      resetForm();
      await loadManagers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el manager");
    }
  };

  return (
    <>
      <PageHeader
        title="Team"
        description="Crea managers secundarios, asigna permisos y administra accesos."
      />

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="card space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Create New</p>
            <h2 className="mt-3 text-2xl font-semibold">Create Manager</h2>
            <p className="mt-2 text-sm text-muted-foreground">Agrega un manager con acceso limitado a los módulos asignados.</p>
          </div>

          <form className="space-y-4" onSubmit={submitCreate}>
            <Field label="Usuario" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="manager02" required />
            <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="manager02@authrd.app" required />
            <Field label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="********" required />

            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(permissionLabelMap).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 rounded-md border border-border/60 bg-surface-2 px-3 py-3 text-sm transition hover:border-primary/60">
                  <input
                    type="checkbox"
                    checked={permissions[key as keyof typeof permissions] ?? false}
                    onChange={(event) =>
                      setPermissions((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            {apps.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Aplicaciones asignadas</p>
                <div className="grid gap-2">
                  {apps.map((app) => (
                    <label key={app._id} className="flex items-center gap-2 rounded-md border border-border/60 bg-surface-2 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedAppIds.includes(app._id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedAppIds((s) => [...s, app._id]);
                          else setSelectedAppIds((s) => s.filter((id) => id !== app._id));
                        }}
                      />
                      <span>{app.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <label className="block">
                <span className="label">Descripción (opcional)</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[80px] w-full resize-none" placeholder="Descripción corta del manager" />
              </label>
            </div>

            {subscriptions.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Allowed Subscriptions (Licenses they can generate)</p>
                <div className="grid gap-2">
                  {subscriptions.map((sub) => (
                    <label key={sub._id} className="flex items-center gap-2 rounded-md border border-border/60 bg-surface-2 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedSubscriptionIds.includes(sub._id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedSubscriptionIds((s) => [...s, sub._id]);
                          else setSelectedSubscriptionIds((s) => s.filter((id) => id !== sub._id));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{sub.name}</span>
                        <span className="text-xs text-muted-foreground">Level: {sub.level}{sub.description ? ` — ${sub.description}` : ''}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <Button type="submit" className="w-full">Guardar Manager</Button>
          </form>
        </section>

        <section className="card">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Existing Managers</p>
              <h2 className="mt-2 text-xl font-semibold">Registros</h2>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="input pl-10"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-3 font-medium">Usuario</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Apps</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-3 py-3 font-medium">Creado</th>
                  <th className="px-3 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredManagers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No hay managers para mostrar.
                    </td>
                  </tr>
                ) : (
                  filteredManagers.map((manager) => (
                    <tr key={manager._id} className="border-b border-border/50 transition hover:bg-surface-2/50">
                      <td className="px-3 py-4">{manager.username}</td>
                      <td className="px-3 py-4">{manager.email}</td>
                      <td className="px-3 py-4">{formatAppNames(manager.appIds)}</td>
                      <td className="px-3 py-4">
                        <Badge tone={manager.isActive ? "success" : "default"}>
                          {manager.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-3 py-4">{formatDate(manager.createdAt)}</td>
                      <td className="px-3 py-4 text-right">
                        <Button
                          variant="ghost"
                          className="px-2 text-danger"
                          onClick={async () => await handleDelete(manager)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
