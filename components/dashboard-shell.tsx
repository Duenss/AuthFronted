"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, ChevronDown, ChevronLeft, ChevronRight, CodeXml, KeyRound,
  LayoutDashboard, LogOut, Megaphone, ScrollText, Search, Shield,
  Settings, Tag, Users, UsersRound, Variable, Webhook, Zap, X, Plus
} from "lucide-react";
import { clearStoredToken, getStoredToken, apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

const navItems = [
  { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { href: "/licenses",      label: "Licencias",     icon: KeyRound },
  { href: "/users",         label: "Usuarios",      icon: Users },
  { href: "/subscriptions", label: "Suscripciones", icon: Tag },
  { href: "/variables",     label: "Variables",     icon: Variable },
  { href: "/team",          label: "Team",          icon: UsersRound },
  { href: "/hwid",          label: "HWID",          icon: Shield },
  { href: "/logs",          label: "Logs",          icon: ScrollText },
  { href: "/sdk",           label: "SDK",           icon: CodeXml },
];

const devItems = [
  { href: "/broadcast",      label: "BotHub",         icon: Megaphone },
  { href: "/webhook-config", label: "Webhook Config", icon: Webhook },
  { href: "/admin-panel",    label: "Admin Panel",    icon: Shield },
];

type AppRecord = {
  _id: string;
  name: string;
  appId: string;
  status: string;
  version: string;
};

type UserInfo = {
  username: string;
  email: string;
  role?: string;
  avatar?: string;
  isManager?: boolean;
  appIds?: string[];
  allowedSubscriptions?: string[];
  premiumTrialExpiresAt?: string;
  permissions?: {
    createUsers?: boolean;
    createLicenses?: boolean;
    manageVariables?: boolean;
    viewLogs?: boolean;
    viewStats?: boolean;
  };
};

const defaultPermissions = {
  createUsers: false,
  createLicenses: false,
  manageVariables: false,
  viewLogs: false,
  viewStats: false,
};

type BroadcastItem = {
  _id?: string;
  message: string;
  type: string;
  active?: boolean;
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserInfo['permissions']>(defaultPermissions);
  const [userLoaded, setUserLoaded] = useState(false);
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppRecord | null>(null);
  const [appDropdownOpen, setAppDropdownOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAppCreator, setShowAppCreator] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppVersion, setNewAppVersion] = useState("1.0.0");
  const [creatingApp, setCreatingApp] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  function openSettings() {
    setProfileUsername(userInfo?.username || '');
    setProfileEmail(userInfo?.email || '');
    setProfileAvatar(userInfo?.avatar || '');
    setSettingsTab('profile');
    setShowSettingsPanel(true);
  }

  async function saveProfile() {
    const token = getStoredToken();
    if (!token) return;
    setSavingProfile(true);
    try {
      const updated = await apiRequest<UserInfo>("/auth/me/update", {
        method: "PUT",
        token,
        body: JSON.stringify({
          username: profileUsername,
          email: profileEmail,
          avatar: profileAvatar,
        }),
      });
      setUserInfo(updated);
      toast.success("Perfil actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar perfil");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (newPassword !== confirmNewPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    const token = getStoredToken();
    if (!token) return;
    setSavingPassword(true);
    try {
      await apiRequest("/auth/me/password", {
        method: "PUT",
        token,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success("Contraseña actualizada");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cambiar contraseña");
    } finally {
      setSavingPassword(false);
    }
  }
  const [settingsTab, setSettingsTab] = useState<'profile' | 'password' | 'danger'>('profile');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  
  const appDropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push("/login");
      return;
    }

    // Load user info
    apiRequest<UserInfo>("/auth/me", { token })
      .then((data) => {
        setUserInfo(data);
        setUserPermissions(data.permissions || defaultPermissions);
        if (data.role === "superadmin") setIsSuperAdmin(true);
        if (data.role === "manager" || data.isManager) setIsManager(true);
      })
      .catch(() => {
        clearStoredToken();
        router.push("/login");
      })
      .finally(() => setUserLoaded(true));

    // Check superadmin via plan-limits — solo para superadmin real
    apiRequest<{ canBroadcast: boolean; role: string }>("/admin/plan-limits", { token })
      .then((data) => { if (data.role === "superadmin") setIsSuperAdmin(true); })
      .catch(() => {});

    // Load apps
    apiRequest<AppRecord[]>("/applications", { token })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setApps(data);
          const savedId = localStorage.getItem("authrd_selected_app");
          const found = savedId ? data.find((a) => a._id === savedId) : null;
          const app = found || data[0];
          setSelectedApp(app);
          localStorage.setItem("authrd_selected_app", app._id);
        }
      })
      .catch(() => {});

    // Load broadcasts
    apiRequest<BroadcastItem[]>("/admin/broadcast", { token })
      .then((data) => {
        if (Array.isArray(data)) setBroadcasts(data.filter((b) => b.active !== false).slice(0, 5));
      })
      .catch(() => {});
  }, [router]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (appDropdownRef.current && !appDropdownRef.current.contains(e.target as Node)) {
        setAppDropdownOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettingsPanel(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectApp(app: AppRecord) {
    setSelectedApp(app);
    localStorage.setItem("authrd_selected_app", app._id);
    setAppDropdownOpen(false);
    
    // Force full page reload to refresh all data with new app context
    window.location.reload();
  }

  // admin y superadmin no tienen límites
  const isUnlimited = isSuperAdmin || userInfo?.role === "admin" || userInfo?.role === "superadmin";
  const canCreateApp = !isManager && (isUnlimited || apps.length < 3);

  async function createApp() {
    if (!newAppName.trim()) {
      toast.error("Nombre de aplicación requerido");
      return;
    }

    if (!canCreateApp) {
      toast.error("Solo los administradores pueden crear aplicaciones");
      return;
    }

    const token = getStoredToken();
    if (!token) {
      toast.error("No se encontró el token de sesión");
      return;
    }

    setCreatingApp(true);
    try {
      const created = await apiRequest<AppRecord>("/applications", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: newAppName,
          version: newAppVersion,
        }),
      });

      setApps((prev) => [created, ...prev]);
      setSelectedApp(created);
      localStorage.setItem("authrd_selected_app", created._id);
      setShowAppCreator(false);
      setNewAppName("");
      setNewAppVersion("1.0.0");
      toast.success("Aplicación creada exitosamente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error creando la aplicación");
    } finally {
      setCreatingApp(false);
    }
  }

  function logout() {
    clearStoredToken();
    router.push("/login");
  }

  const initial = useMemo(() => userInfo?.username?.[0]?.toUpperCase() || "U", [userInfo?.username]);
  const avatarUrl = useMemo(() => typeof userInfo?.avatar === "string" ? userInfo.avatar.trim() : "", [userInfo?.avatar]);
  const hasAvatarUrl = useMemo(() => /^(https?:\/\/.*\.(?:png|jpe?g|webp|gif)(\?.*)?)$/i.test(avatarUrl), [avatarUrl]);
  const roleLabel = useMemo(() => userInfo?.role
    ? userInfo.role === "superadmin" ? "Super Admin"
      : userInfo.role === "admin" ? "Admin"
      : userInfo.role === "manager" ? "Manager"
      : userInfo.role
    : "Usuario", [userInfo?.role]);

  const enabledManagerModules = useMemo(() => Object.entries(userPermissions || defaultPermissions)
    .filter(([, enabled]) => enabled)
    .map(([key]) => {
      switch (key) {
        case 'createUsers': return 'Usuarios';
        case 'createLicenses': return 'Licencias';
        case 'manageVariables': return 'Variables';
        case 'viewLogs': return 'Logs';
        case 'viewStats': return 'Estadísticas';
        default: return key;
      }
    }), [userPermissions]);

  if (!userLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Cargando panel...</span>
      </div>
    );
  }

  const broadcastTypeColor: Record<string, string> = {
    info:    "text-cyan-300",
    warning: "text-yellow-300",
    success: "text-emerald-300",
    error:   "text-red-300",
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── SIDEBAR ── */}
      <aside
        className={cn(
          "relative flex flex-col h-screen bg-surface border-r border-border overflow-hidden flex-shrink-0 transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border min-h-[65px]">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 shadow-blue-glow-sm">
            <Image src="/logo.png" alt="AuthRD" width={32} height={32} className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <span className="font-bold text-white text-lg whitespace-nowrap">AuthRD</span>
          )}
        </div>

        {/* App Selector */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-border relative" ref={appDropdownRef}>
            <div className="space-y-2">
              <button
                onClick={() => setAppDropdownOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-surface-2 border border-border hover:border-[#333333] transition-all duration-200 text-left"
              >
                <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3 h-3 text-primary-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {selectedApp?.name || "Sin aplicación"}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {selectedApp ? `v${selectedApp.version}` : "Seleccionar app"}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "w-3 h-3 text-muted transition-transform duration-200",
                    appDropdownOpen && "rotate-180"
                  )}
                />
              </button>

              <div className="flex flex-col gap-1">
                {/* Badge Unlock limit */}
                {!isManager && (
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold w-fit",
                    isUnlimited
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-surface-3 text-muted-foreground border border-border"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", isUnlimited ? "bg-success" : "bg-muted-foreground")} />
                    {isUnlimited ? "Unlock limit ON" : `Unlock limit OFF  ${apps.length}/3`}
                  </span>
                )}
                {isManager && (
                  <>
                    <span className="text-[11px] text-muted-foreground">
                      Acceso manager limitado a {userInfo?.appIds?.length ?? 0} app(s)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Módulos habilitados: {enabledManagerModules.length > 0 ? enabledManagerModules.join(', ') : 'Ninguno'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* App Dropdown */}
            {appDropdownOpen && (
              <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-md bg-surface-2 border border-border shadow-2xl overflow-hidden">
                {apps.length > 0 ? (
                  apps.map((app) => (
                    <button
                      key={app._id}
                      onClick={() => selectApp(app)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-3 transition-colors",
                        selectedApp?._id === app._id && "bg-primary/10"
                      )}
                    >
                      <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-2.5 h-2.5 text-primary-light" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{app.name}</p>
                        <p className="text-xs text-muted truncate">v{app.version}</p>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full",
                          app.status === "active"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                        )}
                      >
                        {app.status}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No hay aplicaciones.
                  </div>
                )}

                {!isManager && (
                  <div className="border-t border-border px-3 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAppCreator(true);
                        setAppDropdownOpen(false);
                      }}
                      disabled={!canCreateApp}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2 rounded-full transition-all duration-200",
                        canCreateApp
                          ? "bg-primary text-surface shadow-[0_10px_30px_-22px_rgba(59,130,246,0.9)] hover:bg-primary/90"
                          : "bg-surface-2 text-muted border border-border cursor-not-allowed"
                      )}
                    >
                      <Plus className="h-4 w-4" />
                      Crear aplicación
                    </button>
                    {!canCreateApp && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {isManager ? 'Los managers no pueden crear aplicaciones.' : 'Límite de 3 aplicaciones alcanzado.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            let canAccess = true;

            if (isManager) {
              const permissions = userPermissions || defaultPermissions;
              if (item.href === "/licenses" || item.href === "/subscriptions") canAccess = permissions.createLicenses === true;
              if (item.href === "/users" || item.href === "/hwid") canAccess = permissions.createUsers === true;
              if (item.href === "/variables") canAccess = permissions.manageVariables === true;
              if (item.href === "/logs") canAccess = permissions.viewLogs === true;
              if (item.href === "/team" || item.href === "/sdk") canAccess = false;
            }

            if (!canAccess) return null;

            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
                  collapsed && "justify-center",
                  active
                    ? "bg-primary/15 text-primary-light border border-primary/25 shadow-[0_0_16px_rgba(56,189,248,0.15)]"
                    : "text-muted-foreground hover:text-white hover:bg-surface-2 border border-transparent"
                )}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.55)]" />}
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}

          {/* Dev Panel — superadmin only */}
          {isSuperAdmin && (
            <>
              <div className="my-2 border-t border-border" />
              {!collapsed && (
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
                  Dev Panel
                </p>
              )}
              {devItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
                      collapsed && "justify-center",
                      active
                        ? "bg-primary/10 text-primary-light border border-primary/20"
                        : "text-muted-foreground hover:text-white hover:bg-surface-2 border border-transparent"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span className="text-sm">{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User Profile Card */}
        <div className="border-t border-border p-3">
          {collapsed ? (
            /* Collapsed: solo avatar + logout */
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="text-xs font-bold text-primary-light">{initial}</span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Expanded: card completo con rol y expiración */
            <div className="rounded-[28px] border border-[#16486a] bg-[#09101d] p-4 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.08)]">
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-[28px] bg-[#0c1c32] border border-cyan-500/10 shadow-[0_0_18px_rgba(56,189,248,0.14)] overflow-hidden flex items-center justify-center">
                    {hasAvatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-cyan-300">{initial}</span>
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-[#09101d] shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Badge de rol — arriba */}
                  {(() => {
                    const role = userInfo?.role;
                    const isTrial = role === "admin" && !!userInfo?.premiumTrialExpiresAt;
                    let label = "Normal";
                    let cls   = "bg-surface-3 text-muted-foreground border-border";
                    let dotCls = "bg-gray-400";
                    if (role === "superadmin") { 
                      label = "Super Admin"; 
                      cls = "bg-danger/10 text-danger border-danger/30 shadow-[0_0_8px_rgba(239,68,68,0.25)]"; 
                      dotCls = "bg-danger shadow-[0_0_6px_rgba(239,68,68,0.8)]";
                    }
                    else if (role === "admin" && isTrial) { 
                      label = "Premium Trial"; 
                      cls = "bg-warning/10 text-warning border-warning/20"; 
                      dotCls = "bg-warning shadow-[0_0_6px_rgba(251,191,36,0.6)]";
                    }
                    else if (role === "admin") { 
                      label = "Premium"; 
                      cls = "bg-success/10 text-success border-success/20"; 
                      dotCls = "bg-success shadow-[0_0_6px_rgba(16,185,129,0.6)]";
                    }
                    else if (role === "manager") { 
                      label = "Manager"; 
                      cls = "bg-primary/10 text-primary-light border-primary/20"; 
                      dotCls = "bg-primary-light shadow-[0_0_6px_rgba(56,189,248,0.6)]";
                    }
                    return (
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold mb-1 ${cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
                        {label}
                      </span>
                    );
                  })()}
                  <p className="text-base font-semibold text-white truncate leading-tight">{userInfo?.username || "Usuario"}</p>
                  <p className="text-xs text-muted truncate">{userInfo?.email || ""}</p>
                </div>
                <button
                  onClick={() => openSettings()}
                  className="rounded-full border border-border bg-surface p-2 text-muted hover:text-white hover:border-cyan-400 transition-all duration-200"
                  title="Ajustes"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {/* Trial expiry */}
              {userInfo?.role === "admin" && userInfo?.premiumTrialExpiresAt && (
                <p className="mt-3 text-[10px] text-muted-foreground">
                  Trial expira {new Date(userInfo.premiumTrialExpiresAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-white hover:border-border-2 transition-all duration-200 z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {showAppCreator && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-surface-2/95 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Nueva app</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Crear aplicación</h2>
                <p className="mt-2 text-sm text-muted-foreground">Agrega una aplicación para gestionar licencias, usuarios y configuración.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAppCreator(false)}
                className="rounded-full border border-border bg-surface p-2 text-muted transition hover:text-white hover:bg-surface-3"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <label className="label">Nombre</label>
                <input
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="input w-full"
                  placeholder="Nombre de la aplicación"
                />
              </div>
              <div className="grid gap-2">
                <label className="label">Versión</label>
                <input
                  value={newAppVersion}
                  onChange={(e) => setNewAppVersion(e.target.value)}
                  className="input w-full"
                  placeholder="1.0.0"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {canCreateApp ? "Hasta 3 aplicaciones en el plan gratuito." : "Has alcanzado el límite de aplicaciones."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={createApp}
                  disabled={creatingApp || !canCreateApp}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200",
                    creatingApp
                      ? "bg-primary/20 text-primary-light cursor-wait"
                      : canCreateApp
                      ? "bg-primary text-surface hover:bg-primary/90"
                      : "bg-surface-2 text-muted border border-border cursor-not-allowed"
                  )}
                >
                  <Plus className="h-4 w-4" />
                  {creatingApp ? "Creando..." : "Crear aplicación"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettingsPanel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-4 py-6">
          <div ref={settingsRef} className="w-full max-w-2xl rounded-[32px] border border-cyan-500/10 bg-[#08131f]/95 p-6 shadow-[0_25px_80px_rgba(8,18,29,0.85)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Ajustes</p>
                <h2 className="mt-2 text-3xl font-bold text-white">Configuración rápida</h2>
                <p className="mt-2 text-sm text-muted-foreground">Personaliza tu panel y ajusta el flujo KeyAuth en el dashboard.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-muted hover:text-white hover:bg-danger/10 transition-all duration-200"
                >
                  Cerrar sesión
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsPanel(false)}
                  className="rounded-full border border-border bg-surface p-2 text-muted transition hover:text-white hover:bg-surface-3"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('danger')}
                  className={cn(
                    'ml-auto px-3 py-2 rounded-md text-sm font-medium text-danger',
                    settingsTab === 'danger' ? 'bg-danger/10' : ''
                  )}
                >
                  Danger Zone
                </button>
              </div>
            </div>

            <div className="mt-4">
              {/* Tabs */}
              <div className="flex gap-1 mb-4 border-b border-border pb-3">
                {(['profile', 'password', 'danger'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSettingsTab(tab)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                      settingsTab === tab
                        ? tab === 'danger'
                          ? "bg-danger/10 text-danger border border-danger/30"
                          : "bg-primary/10 text-primary-light border border-primary/20"
                        : "text-muted-foreground hover:text-white"
                    )}
                  >
                    {tab === 'profile' ? 'Perfil' : tab === 'password' ? 'Contraseña' : 'Danger Zone'}
                  </button>
                ))}
              </div>
            {settingsTab === 'profile' && (
                <div className="rounded-2xl border border-border bg-surface-2 p-5">
                  <h3 className="text-lg font-semibold text-white">Perfil</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Edita tu información de perfil.</p>
                  <div className="mt-4 grid gap-3">
                    <label className="block">
                      <span className="label">Username</span>
                      <input className="input" value={profileUsername} onChange={e => setProfileUsername(e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="label">Email</span>
                      <input className="input" type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="label">Avatar URL</span>
                      <input
                        className="input"
                        placeholder="https://example.com/avatar.png"
                        value={profileAvatar}
                        onChange={e => setProfileAvatar(e.target.value)}
                      />
                      {profileAvatar && /^https?:\/\/.+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(profileAvatar) && (
                        <div className="mt-2 flex items-center gap-2">
                          <img src={profileAvatar} alt="Preview" className="h-10 w-10 rounded-full object-cover border border-border" />
                          <span className="text-xs text-success">Vista previa OK</span>
                        </div>
                      )}
                    </label>
                    <div className="flex justify-end">
                      <button
                        onClick={saveProfile}
                        disabled={savingProfile}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 transition hover:bg-primary-hover"
                      >
                        {savingProfile && <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                        {savingProfile ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'password' && (
                <div className="rounded-2xl border border-border bg-surface-2 p-5">
                  <h3 className="text-lg font-semibold text-white">Cambiar Contraseña</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Actualiza la contraseña de tu cuenta.</p>
                  <div className="mt-4 grid gap-3">
                    <label className="block"><span className="label">Contraseña actual</span><input type="password" className="input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label>
                    <label className="block"><span className="label">Nueva contraseña</span><input type="password" className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label>
                    <label className="block"><span className="label">Confirmar nueva contraseña</span><input type="password" className="input" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} /></label>
                    <div className="flex justify-end">
                      <button
                        onClick={savePassword}
                        disabled={savingPassword}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 transition hover:bg-primary-hover"
                      >
                        {savingPassword && <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                        {savingPassword ? "Guardando..." : "Cambiar Contraseña"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'danger' && (
                <div className="rounded-2xl border border-border bg-surface-2 p-5">
                  <h3 className="text-lg font-semibold text-white">Danger Zone</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Delete account or revoke access. No payments or bots here.</p>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border border-danger/20 bg-[#2b0f12] p-4">
                      <p className="text-sm text-white">Delete your account. This action is irreversible.</p>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button className="inline-flex items-center justify-center rounded-full bg-surface-3 px-4 py-2 text-sm font-semibold text-muted">Cancel</button>
                      <button className="inline-flex items-center justify-center rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white">Delete Account</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-surface/50 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0">
          {/* Left: app name + status badge */}
          <div className="flex items-center gap-3">
            {selectedApp ? (
              <>
                <span className="text-sm font-medium text-white">{selectedApp.name}</span>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full border",
                    selectedApp.status === "active"
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-warning/10 text-warning border-warning/20"
                  )}
                >
                  {selectedApp.status}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">AuthRD Panel</span>
            )}
          </div>

          {/* Right: search + bell */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="pl-9 pr-4 py-1.5 text-sm bg-surface-2 border border-border rounded-md text-white placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 w-48 transition-all"
              />
            </div>

            {/* Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative p-2 rounded-md text-muted hover:text-white hover:bg-surface-2 transition-all duration-200"
              >
                <Bell className="w-4 h-4" />
                {broadcasts.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>

              {/* Bell Dropdown */}
              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 z-[100] rounded-lg bg-surface-2 border border-border shadow-[0_20px_80px_rgba(0,0,0,0.6)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-2">
                    <span className="text-sm font-semibold text-white">Notificaciones</span>
                    <button onClick={() => setBellOpen(false)} className="text-muted hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {broadcasts.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground bg-surface-2">
                      Sin notificaciones activas
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto bg-surface-2">
                      {broadcasts.map((b, i) => (
                        <div key={b._id || i} className="px-4 py-3 border-b border-border/50 last:border-0">
                          <p className={cn("text-xs font-medium", broadcastTypeColor[b.type] || "text-blue-300")}>
                            📢 {b.type?.toUpperCase()}
                          </p>
                          <p className="text-sm text-white mt-0.5">{b.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
