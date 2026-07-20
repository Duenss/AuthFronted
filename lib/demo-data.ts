export const demoApps = [
  {
    _id: "demo-app-1",
    name: "Loader FF",
    appId: "app_8f2d4c_loader",
    appSecret: "sec_72f64e7b9d2a4a9b",
    status: "active",
    version: "1.3.0",
    userCount: 182,
    licenseCount: 420
  },
  {
    _id: "demo-app-2",
    name: "Cementerio DLL",
    appId: "app_44a1_cementerio",
    appSecret: "sec_15a923ee887c4cb2",
    status: "paused",
    version: "2.1.4",
    userCount: 48,
    licenseCount: 96
  }
];

export const demoSubscriptions = [
  { _id: "sub-1", name: "Free", level: 1, duration: 7, description: "Testing access" },
  { _id: "sub-2", name: "Premium", level: 4, duration: 30, description: "Monthly premium access" },
  { _id: "sub-3", name: "Lifetime", level: 9, duration: 3650, description: "Permanent access" }
];

export const demoLicenses = [
  { key: "PREMIUM-A7K9-X2Q4-LM8P", subscription: "Premium", duration: "30 dias", status: "unused" },
  { key: "LIFETIME-Z8Q1-N4V6-RD22", subscription: "Lifetime", duration: "Lifetime", status: "active" },
  { key: "BYPASS-J2P8-C9D1-KK7A", subscription: "Bypass", duration: "7 dias", status: "expired" }
];

export const demoUsers = [
  { username: "jvampard", subscription: "Premium", expiresAt: "2026-07-01", status: "active", hwid: "9F31-22AA-88CD" },
  { username: "manager01", subscription: "Lifetime", expiresAt: null, status: "active", hwid: "AA19-11BE-70FD" },
  { username: "tester", subscription: "Free", expiresAt: "2026-06-07", status: "banned", hwid: "Sin HWID" }
];

export const demoVariables = [
  { name: "Version", value: "1.3.0" },
  { name: "DiscordLink", value: "https://discord.gg/authrd" },
  { name: "UpdateURL", value: "https://cdn.authrd.app/loader.exe" },
  { name: "MaintenanceMode", value: "false" }
];

export const demoLogs = [
  { createdAt: "2026-05-31T10:32:00Z", username: "jvampard", ip: "181.45.20.10", event: "Login Exitoso", description: "Panel access granted" },
  { createdAt: "2026-05-31T10:20:00Z", username: "tester", ip: "181.45.20.99", event: "Error HWID", description: "HWID mismatch" },
  { createdAt: "2026-05-30T23:12:00Z", username: "manager01", ip: "181.45.20.50", event: "Licencia Generada", description: "20 Premium licenses" }
];
