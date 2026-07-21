"use client";

import { useState, useEffect } from "react";
import { Save, Send } from "lucide-react";
import { apiRequest, getStoredToken } from "@/lib/api";
import { PageHeader } from "@/components/dashboard-shell";
import { Button, Field } from "@/components/ui";
import toast from "react-hot-toast";

interface App { _id: string; name: string; webhookUrl?: string; }
interface WebhookConfig {
  botName: string;
  botAvatar: string;
  color: number;
  footerText: string;
  footerIcon: string;
  messages: Record<string, string>;
}

const EVENT_LABELS: Record<string, string> = {
  login_success:     "✅ Login Success",
  login_failed:      "❌ Login Failed",
  login_relogin:     "🔄 Re-Login",
  license_activated: "🔑 License Activated",
  license_generated: "🎫 License Generated",
  hwid_error:        "⚠️ HWID Mismatch",
  user_banned:       "🚫 User Banned",
};

const VARIABLES: Record<string, string> = {
  login_success:     "{username}, {ip}, {appName}",
  login_failed:      "{username}, {ip}, {reason}, {appName}",
  login_relogin:     "{username}, {ip}, {appName}",
  license_activated: "{licenseKey}, {username}, {ip}, {appName}",
  license_generated: "{count}, {mask}, {appName}",
  hwid_error:        "{username}, {ip}, {appName}",
  user_banned:       "{username}, {reason}, {appName}",
};

const DEFAULT_CONFIG: WebhookConfig = {
  botName: "AuthPlatform", botAvatar: "", color: 0x3498db,
  footerText: "AuthPlatform", footerIcon: "",
  messages: Object.fromEntries(Object.keys(EVENT_LABELS).map(k => [k, ""])),
};

export default function WebhookConfigPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [config, setConfig] = useState<WebhookConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const token = getStoredToken();

  useEffect(() => {
    // Usar la app seleccionada en el sidebar
    const appId = typeof window !== "undefined"
      ? localStorage.getItem("authrd_selected_app")
      : null;
    if (appId) {
      setSelectedApp(appId);
      const token = getStoredToken();
      if (!token) return;
      apiRequest<any>(`/applications/${appId}`, { token })
        .then((data: any) => {
          setApps([data]);
          setWebhookUrl(data.webhookUrl || "");
        }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!selectedApp) return;
    const app = apps.find(a => a._id === selectedApp);
    setWebhookUrl(app?.webhookUrl || "");
    setLoading(true);
    apiRequest<WebhookConfig>(`/admin/webhook-config/${selectedApp}`, { token })
      .then(data => setConfig({ ...DEFAULT_CONFIG, ...data }))
      .catch(() => setConfig(DEFAULT_CONFIG))
      .finally(() => setLoading(false));
  }, [selectedApp]);

  const save = async () => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      // Guardar webhook URL en la app
      if (webhookUrl !== undefined) {
        await apiRequest(`/applications/${selectedApp}`, {
          method: "PUT", token,
          body: JSON.stringify({ webhookUrl }),
        });
      }
      // Guardar config del webhook
      await apiRequest(`/admin/webhook-config/${selectedApp}`, {
        method: "PUT", token,
        body: JSON.stringify(config),
      });
      toast.success("Configuracion guardada");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const testWebhook = async () => {
    if (!selectedApp) return;
    setTesting(true);
    try {
      await apiRequest(`/applications/${selectedApp}/test-webhook`, {
        method: "POST", token,
      });
      toast.success("Mensaje de prueba enviado a Discord");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setTesting(false); }
  };

  const colorHex = "#" + (config.color || 0x3498db).toString(16).padStart(6, "0");

  return (
    <>
      <PageHeader
        title="Webhook Config"
        description="Personaliza el bot de Discord y los mensajes por evento para cada aplicacion."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={testWebhook} loading={testing}>
              <Send className="h-4 w-4" />
              Probar Webhook
            </Button>
            <Button onClick={save} loading={saving}>
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </div>
        }
      />

      {/* App selector — usa la app seleccionada en el sidebar directamente */}
      <section className="card mb-6">
        <Field
          label="Webhook URL de Discord"
          value={webhookUrl}
          onChange={e => setWebhookUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
        />
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando configuracion...</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Bot Appearance */}
          <section className="card">
            <h2 className="mb-4 text-lg font-semibold">Apariencia del Bot</h2>
            <div className="grid gap-4">
              <Field label="Nombre del Bot" value={config.botName}
                onChange={e => setConfig(c => ({ ...c, botName: e.target.value }))} />
              <Field label="Avatar URL" value={config.botAvatar || ""}
                onChange={e => setConfig(c => ({ ...c, botAvatar: e.target.value }))}
                placeholder="https://..." />
              <label className="block">
                <span className="label">Color del Embed</span>
                <div className="flex items-center gap-3">
                  <input type="color" value={colorHex}
                    onChange={e => setConfig(c => ({ ...c, color: parseInt(e.target.value.replace("#", ""), 16) }))}
                    className="h-10 w-16 cursor-pointer rounded-md border border-border bg-transparent" />
                  <span className="input flex-1">{colorHex}</span>
                </div>
              </label>
              <Field label="Footer Text" value={config.footerText}
                onChange={e => setConfig(c => ({ ...c, footerText: e.target.value }))} />
              <Field label="Footer Icon URL" value={config.footerIcon || ""}
                onChange={e => setConfig(c => ({ ...c, footerIcon: e.target.value }))}
                placeholder="https://..." />
            </div>
          </section>

          {/* Event Messages */}
          <section className="card">
            <h2 className="mb-4 text-lg font-semibold">Mensajes por Evento</h2>
            <div className="grid gap-4">
              {Object.entries(EVENT_LABELS).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="label">{label}</span>
                  <input
                    value={config.messages?.[key] || ""}
                    onChange={e => setConfig(c => ({ ...c, messages: { ...c.messages, [key]: e.target.value } }))}
                    placeholder={`Mensaje por defecto...`}
                    className="input"
                  />
                  <span className="mt-1 block text-xs text-muted">
                    Variables: {VARIABLES[key]}
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
