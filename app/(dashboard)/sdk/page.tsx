"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Copy, Download, RefreshCcw } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Button } from "@/components/ui";
import { apiRequest, getStoredToken } from "@/lib/api";

type SdkFiles = {
  header?: string;
  source?: string;
  "skCrypt.hpp"?: string;
  "skCrypt.h"?: string;
  "Auth.hpp"?: string;
  "Auth.h"?: string;
  "Auth.cpp"?: string;
};

type AppRecord = {
  _id: string;
  name: string;
  appId: string;
  appSecret?: string;
};

export default function SdkPage() {
  const [app, setApp] = useState<AppRecord | null>(null);
  const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_API_URL?.trim() || "https://auchrd.netlify.app/api");
  const [buildMode, setBuildMode] = useState<'exe' | 'dll'>('exe');
  const [files, setFiles] = useState<{ name: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  function getAppId() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authrd_selected_app");
  }

  async function loadApp() {
    const appId = getAppId();
    if (!appId) return;
    const token = getStoredToken();
    if (!token) return;
    try {
      const data = await apiRequest<AppRecord>(`/applications/${appId}`, { token });
      setApp(data);
    } catch {
      // ignore
    }
  }

  async function generateSdk() {
    const appId = getAppId();
    if (!appId) { toast.error("Selecciona una aplicación"); return; }
    const token = getStoredToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<SdkFiles>(`/sdk/generate/${appId}`, { token });
      const result: { name: string; content: string }[] = [];
      if (data["skCrypt.hpp"] || data["skCrypt.h"]) result.push({ name: "skCrypt.hpp", content: data["skCrypt.hpp"] || data["skCrypt.h"] || "" });
      if (data["Auth.hpp"] || data["Auth.h"] || data.header) result.push({ name: "Auth.hpp", content: data["Auth.hpp"] || data["Auth.h"] || data.header || "" });
      if (data["Auth.cpp"] || data.source) result.push({ name: "Auth.cpp", content: data["Auth.cpp"] || data.source || "" });
      if (result.length === 0) {
        // Fallback: generate locally
        result.push({ name: "skCrypt.hpp", content: generateSkCryptHeader() });
        result.push({ name: "Auth.hpp", content: generateHeader() });
        result.push({ name: "Auth.cpp", content: generateSource() });
      }
      setFiles(result);
      toast.success("SDK generado");
    } catch {
      // Fallback to local generation
      setFiles([
        { name: "skCrypt.hpp", content: generateSkCryptHeader() },
        { name: "Auth.hpp", content: generateHeader() },
        { name: "Auth.cpp", content: generateSource() }
      ]);
      toast("SDK generado localmente");
    } finally {
      setLoading(false);
    }
  }

  function generateSkCryptHeader() {
    return `#pragma once
// skCrypt - Compile-time string obfuscation helper
// Usage: skCrypt("text").decrypt()

#include <array>
#include <cstdint>
#include <string>

namespace detail {
    template<typename T>
    struct skCryptImpl {
        const T* data;
        std::size_t size;
        uint8_t key;

        constexpr skCryptImpl(const T* str, std::size_t n, uint8_t k)
            : data(str), size(n), key(k) {}

        std::basic_string<T> decrypt() const {
            std::basic_string<T> result(size - 1, T(0));
            for (std::size_t i = 0; i < size - 1; ++i) {
                result[i] = static_cast<T>(static_cast<uint8_t>(data[i]) ^ (key + i));
            }
            return result;
        }
    };

    template<std::size_t N>
    struct skCryptStr {
        char encrypted[N];
        uint8_t key;
        std::size_t size;

        constexpr skCryptStr(const char (&str)[N], uint8_t k) : encrypted{}, key(k), size(N) {
            for (std::size_t i = 0; i < N; ++i) {
                encrypted[i] = static_cast<char>(static_cast<uint8_t>(str[i]) ^ (k + i));
            }
        }

        std::string decrypt() const {
            std::string result(size - 1, '\0');
            for (std::size_t i = 0; i < size - 1; ++i) {
                result[i] = static_cast<char>(static_cast<uint8_t>(encrypted[i]) ^ (key + i));
            }
            return result;
        }
    };
}

#define skCrypt(str) ([]() constexpr { \
    constexpr auto impl = detail::skCryptStr<sizeof(str)>(str, 0x4B); \
    return impl; \
}())`;
  }

  function generateHeader() {
    const buildModeDirective = buildMode === "dll" ? "#define BUILD_AS_DLL\n\n" : "";
    return `${buildModeDirective}#pragma once

#ifdef BUILD_AS_DLL
  #define AUTHPLATFORM_API __declspec(dllexport)
#else
  #define AUTHPLATFORM_API
#endif

#include <string>

class AUTHPLATFORM_API Auth {
public:
    static bool Init(const std::string& appId, const std::string& appSecret, const std::string& apiUrl);
    static bool Login(const std::string& username, const std::string& password, const std::string& hwid = "");
    static bool ActivateLicense(const std::string& license, const std::string& username, const std::string& password, const std::string& hwid = "");
    static bool LoginWithLicense(const std::string& license, const std::string& hwid = "", const std::string& subscriptionRequired = "");
    static bool CheckLicense(const std::string& license);
    static std::string GetVariable(const std::string& name);
    static std::string GetHWID();
    static bool ResetHWID();
    static bool IsBanned();
};`;
  }

  function generateSource() {
    const appId = app?.appId || "APP_ID";
    const appSecret = app?.appSecret || "APP_SECRET";
    return `#include "Auth.hpp"
#include <windows.h>
#include <winhttp.h>
#include <sstream>
#include <string>
#pragma comment(lib, "winhttp.lib")

static const std::string APP_ID     = "${appId}";
static const std::string APP_SECRET = "${appSecret}";
static const std::string API_URL    = "${apiUrl}";

std::string Auth::GetHWID() {
    DWORD serial = 0;
    GetVolumeInformationA("C:\\", nullptr, 0, &serial, nullptr, nullptr, nullptr, 0);
    std::stringstream ss;
    ss << std::hex << serial;
    return ss.str();
}

bool Auth::Init(const std::string& appId, const std::string& appSecret, const std::string& apiUrl) {
    return !appId.empty() && !appSecret.empty() && !apiUrl.empty();
}

bool Auth::Login(const std::string& username, const std::string& password, const std::string& hwid) {
    // POST ${apiUrl}/licenses/login
    // User/password login using optional HWID.
    return !username.empty() && !password.empty();
}

bool Auth::ActivateLicense(const std::string& license, const std::string& username, const std::string& password, const std::string& hwid) {
    // POST ${apiUrl}/licenses/activate
    return !license.empty() && !username.empty() && !password.empty();
}

bool Auth::LoginWithLicense(const std::string& license, const std::string& hwid) {
    // POST ${apiUrl}/licenses/login
    // License-only login using optional HWID.
    // Pass subscriptionRequired to enforce subscription validation on the server.
    return !license.empty();
}

bool Auth::CheckLicense(const std::string& license) {
    // POST ${apiUrl}/licenses/check
    return !license.empty();
}

std::string Auth::GetVariable(const std::string& name) {
    // GET ${apiUrl}/variables/name/:name
    return "";
}

bool Auth::ResetHWID() {
    // POST ${apiUrl}/users/reset-hwid
    return true;
}

bool Auth::IsBanned() {
    // GET ${apiUrl}/users/status
    return false;
}`;
  }

  useEffect(() => {
    loadApp();
  }, []);

  function copyAll() {
    const all = files.map((f) => `// ${f.name}\n${f.content}`).join("\n\n");
    navigator.clipboard.writeText(all).then(() => toast.success("SDK completo copiado"));
  }

  function downloadFile(name: string, content: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="SDK"
        description="Genera Auth.hpp, Auth.cpp y skCrypt.hpp con APP_ID, APP_SECRET y API_URL incrustados."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={generateSdk} loading={loading}>
              <RefreshCcw className="h-4 w-4" />
              Regenerar
            </Button>
            <Button onClick={copyAll}>
              <Copy className="h-4 w-4" />
              Copiar SDK
            </Button>
          </div>
        }
      />

      {/* Config */}
      <section className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Configuración</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <span className="label">APP ID</span>
            <p className="input font-mono text-sm text-primary-light">{app?.appId || "Cargando..."}</p>
          </div>
          <div>
            <span className="label">APP SECRET</span>
            <p className="input font-mono text-sm text-muted-foreground">{"•".repeat(16)}</p>
          </div>
          <div>
            <span className="label">Build mode</span>
            <div className="flex gap-2">
              <Button variant={buildMode === "exe" ? "secondary" : "ghost"} onClick={() => setBuildMode("exe")}>EXE</Button>
              <Button variant={buildMode === "dll" ? "secondary" : "ghost"} onClick={() => setBuildMode("dll")}>DLL</Button>
            </div>
          </div>
          <label className="block md:col-span-3">
            <span className="label">API URL</span>
            <input
              className="input"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://auchrd.netlify.app/api"
            />
          </label>
        </div>
      </section>

      {/* Files */}
      {files.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-muted-foreground mb-4">Selecciona una aplicación para generar el SDK</p>
          <Button onClick={generateSdk} loading={loading}>
            Generar SDK
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {files.map((file) => (
            <section key={file.name} className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold font-mono">{file.name}</h2>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => navigator.clipboard.writeText(file.content).then(() => toast.success(`${file.name} copiado`))}>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </Button>
                  <Button variant="secondary" onClick={() => downloadFile(file.name, file.content)}>
                    <Download className="h-4 w-4" />
                    Descargar
                  </Button>
                </div>
              </div>
              <pre className="max-h-[500px] overflow-auto rounded-lg border border-border bg-surface-2 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                {file.content}
              </pre>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
