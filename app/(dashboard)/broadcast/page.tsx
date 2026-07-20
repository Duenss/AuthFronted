"use client";

import { useMemo, useState } from "react";
import { Copy, Bot, Terminal, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Button, Field } from "@/components/ui";
import toast from "react-hot-toast";

const COMMAND_TEMPLATES = [
  {
    command: "/claimfreelicence {license}",
    description: "Reclamar una licencia activa desde el bot.",
  },
  {
    command: "/licence generate {user} {duration}",
    description: "Generar una licencia nueva con la plantilla.",
  },
  {
    command: "/checkhwid {hwid}",
    description: "Verificar HWID en el sistema de licencias.",
  },
  {
    command: "/licence status {user}",
    description: "Consultar estado de licencia de un usuario.",
  },
  {
    command: "/license reset {user} {hwid}",
    description: "Resetear HWID para un usuario con licencia.",
  },
  {
    command: "/ban user {user} {reason}",
    description: "Banear un usuario específico del sistema.",
  },
  {
    command: "/unban user {user}",
    description: "Remover ban de un usuario.",
  },
  {
    command: "/license validate {license}",
    description: "Validar si una licencia es válida.",
  },
  {
    command: "/bot stats",
    description: "Obtener estadísticas del bot y licencias.",
  },
];

export default function BotHubPage() {
  const [tokenType, setTokenType] = useState<"bot" | "webhook">("bot");
  const [botToken, setBotToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [commandPrefix, setCommandPrefix] = useState("/");
  const [licenseMask, setLicenseMask] = useState("****-****-****-****");
  const [responseTemplate, setResponseTemplate] = useState("Tu licencia {license} ha sido activada para {username}.");
  const [customCommands, setCustomCommands] = useState<string[]>([]);
  const [newCommand, setNewCommand] = useState("");

  const generatedCommands = useMemo(() => {
    return COMMAND_TEMPLATES.map((template) => ({
      ...template,
      preview: template.command
        .replace("{license}", "ABCD-EFGH-IJKL-MNOP")
        .replace("{user}", "usuario123")
        .replace("{duration}", "30d")
        .replace("{hwid}", "HWID-1234-ABCD"),
    }));
  }, []);

  const generatedBotCommand = `${commandPrefix}claimfreelicence ${licenseMask}`;

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  const sampleConfig = useMemo(() => {
    return `Bot Token: ${botToken || "<BOT_TOKEN>"}\nWebhook URL: ${webhookUrl || "<WEBHOOK_URL>"}\nComando: ${generatedBotCommand}\nRespuesta: ${responseTemplate}`;
  }, [botToken, webhookUrl, generatedBotCommand, responseTemplate]);

  return (
    <>
      <PageHeader
        title="BotHub"
        description="Gestiona y configura tu bot de licencias con comandos personalizados e integración."
      />

      <section className="rounded-[28px] border border-cyan-500/15 bg-gradient-to-br from-[#09131f] via-[#0c1f34] to-[#081523] p-8 shadow-[0_20px_60px_rgba(14,165,233,0.12),inset_0_0_0_1px_rgba(56,189,248,0.08)] backdrop-blur-xl mb-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Configuración del Bot</h2>
            <p className="mt-2 text-sm text-muted-foreground">Elige entre integración con Bot Token o Webhook URL.</p>
          </div>
          <Bot className="h-8 w-8 text-cyan-300" />
        </div>

        <div className="mb-8 grid gap-4">
          <div className="flex gap-3">
            <button
              onClick={() => setTokenType("bot")}
              className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                tokenType === "bot"
                  ? "border-cyan-400 bg-cyan-400/10 text-cyan-200 shadow-[0_0_24px_rgba(56,189,248,0.2)]"
                  : "border-border bg-surface-2 text-muted-foreground hover:border-cyan-300/50"
              }`}
            >
              Bot Token
            </button>
            <button
              onClick={() => setTokenType("webhook")}
              className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                tokenType === "webhook"
                  ? "border-cyan-400 bg-cyan-400/10 text-cyan-200 shadow-[0_0_24px_rgba(56,189,248,0.2)]"
                  : "border-border bg-surface-2 text-muted-foreground hover:border-cyan-300/50"
              }`}
            >
              Webhook URL
            </button>
          </div>

          {tokenType === "bot" ? (
            <Field
              label="Bot Token"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="Pega aquí tu bot token de Discord"
            />
          ) : (
            <Field
              label="Webhook URL"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
            />
          )}

          <label className="block">
            <span className="label">Prefijo de comandos</span>
            <input
              className="input"
              value={commandPrefix}
              onChange={(e) => setCommandPrefix(e.target.value)}
              placeholder="/"
              maxLength={3}
            />
          </label>

          <label className="block">
            <span className="label">Máscara de licencia</span>
            <input
              className="input"
              value={licenseMask}
              onChange={(e) => setLicenseMask(e.target.value)}
              placeholder="****-****-****-****"
            />
          </label>

          <label className="block">
            <span className="label">Plantilla de respuesta</span>
            <textarea
              className="input min-h-[100px] resize-none rounded-2xl"
              value={responseTemplate}
              onChange={(e) => setResponseTemplate(e.target.value)}
              placeholder="Tu licencia {license} ha sido activada para {username}."
            />
          </label>
        </div>
      </section>

      <section className="rounded-[28px] border border-cyan-500/15 bg-gradient-to-br from-[#09131f] via-[#0c1f34] to-[#081523] p-8 shadow-[0_20px_60px_rgba(14,165,233,0.12),inset_0_0_0_1px_rgba(56,189,248,0.08)] backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Comandos disponibles</h2>
            <p className="mt-1 text-sm text-muted-foreground">Copia cualquier comando para usarlo en tu integración.</p>
          </div>
          <Terminal className="h-8 w-8 text-cyan-300" />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {generatedCommands.map((item, idx) => (
            <div
              key={idx}
              className="group rounded-2xl border border-cyan-500/10 bg-[#071823]/50 p-4 transition hover:border-cyan-400/30 hover:bg-[#0a1f2e]/70 hover:shadow-[0_10px_30px_rgba(14,165,233,0.1)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-mono text-sm font-semibold text-cyan-200 break-words">{item.command}</p>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(item.command)}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-[#0b1d2f] px-2.5 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400/50 hover:bg-[#0f2b45]"
                >
                  <Copy className="h-3 w-3" />
                  <span className="hidden sm:inline">Copiar</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-cyan-500/10 pt-8">
          <h3 className="mb-4 text-lg font-semibold text-white">Comandos personalizados</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCommand}
              onChange={(e) => setNewCommand(e.target.value)}
              placeholder="/mi-comando {param}"
              className="input flex-1 rounded-2xl"
            />
            <button
              onClick={() => {
                if (newCommand.trim()) {
                  setCustomCommands([...customCommands, newCommand]);
                  setNewCommand("");
                  toast.success("Comando agregado");
                }
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 transition"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>

          {customCommands.length > 0 && (
            <div className="grid gap-2">
              {customCommands.map((cmd, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-[#071823]/50 px-4 py-3">
                  <p className="font-mono text-sm text-cyan-200">{cmd}</p>
                  <button
                    onClick={() => {
                      setCustomCommands(customCommands.filter((_, i) => i !== idx));
                      toast.success("Comando eliminado");
                    }}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
