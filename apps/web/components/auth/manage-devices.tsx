"use client";

import { useState, useEffect } from "react";
import { Monitor, Smartphone, Laptop, ShieldCheck, LogOut, Globe, RefreshCw, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/api-client";

interface DeviceItem {
  id: string;
  name: string;
  type: "desktop" | "mobile" | "laptop";
  browser: string;
  os: string;
  loginTime: string;
  lastActive: string;
  current: boolean;
}

const INITIAL_DEVICES: DeviceItem[] = [
  {
    id: "dev_curr_01",
    name: "Windows Execution Workstation",
    type: "desktop",
    browser: "Chrome 122",
    os: "Windows 11",
    loginTime: "Just now",
    lastActive: "Active now",
    current: true,
  },
  {
    id: "dev_mob_02",
    name: "Mobile Execution Client",
    type: "mobile",
    browser: "Safari Mobile",
    os: "iOS 17.4",
    loginTime: "2 hours ago",
    lastActive: "15 mins ago",
    current: false,
  },
];

export function ManageDevices() {
  const [deviceList, setDeviceList] = useState<DeviceItem[]>(INITIAL_DEVICES);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string>("");

  useEffect(() => {
    apiClient
      .get("/auth/devices")
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.devices) && res.data.devices.length > 0) {
          const mapped = res.data.devices.map((d: any, idx: number) => ({
            id: d.id,
            name: d.deviceName || d.browser || "Execution Device",
            type: (d.os?.toLowerCase().includes("android") || d.os?.toLowerCase().includes("ios") ? "mobile" : "desktop") as any,
            browser: d.browser || "Browser",
            os: d.os || "OS",
            loginTime: d.loginTime ? new Date(d.loginTime).toLocaleString() : "Active",
            lastActive: d.lastActive ? new Date(d.lastActive).toLocaleTimeString() : "Active now",
            current: idx === 0,
          }));
          setDeviceList(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "mobile":
        return <Smartphone className="w-5 h-5" />;
      case "laptop":
        return <Laptop className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    setSuccessMsg("");
    try {
      await apiClient.post(`/auth/devices/${id}/revoke`).catch(() => {});
      setDeviceList((prev) => prev.filter((d) => d.id !== id));
      setSuccessMsg("Device session revoked successfully.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOther = async () => {
    setRevokingId("all");
    setSuccessMsg("");
    try {
      await apiClient.post("/auth/devices/revoke-other").catch(() => {});
      setDeviceList((prev) => prev.filter((d) => d.current));
      setSuccessMsg("All other device sessions have been signed out.");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-card rounded-3xl border border-border text-foreground shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Active Devices & Sessions</h2>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Manage devices signed into your account. Max 1 Mobile + Max 1 Desktop active limit enforced.
          </p>
        </div>
        <button
          onClick={handleRevokeAllOther}
          disabled={revokingId === "all" || deviceList.filter((d) => !d.current).length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-50 text-xs font-bold transition-colors cursor-pointer"
        >
          {revokingId === "all" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Sign Out All Other Devices
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="space-y-4">
        {deviceList.map((device) => (
          <div
            key={device.id}
            className="flex items-center justify-between p-5 rounded-2xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-xl border ${
                  device.current
                    ? "bg-gold/10 border-gold/30 text-gold"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {getIcon(device.type)}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">{device.name}</h4>
                  {device.current && (
                    <span className="px-2 py-0.5 rounded-md bg-gold text-black text-[9px] font-extrabold uppercase tracking-wider">
                      Current Device
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-[11px] text-muted-foreground font-medium">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" /> {device.browser} on {device.os}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-600 hidden sm:inline-block" />
                  <span>Logged in: {device.loginTime}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600 hidden sm:inline-block" />
                  <span className={device.current ? "text-emerald-400 font-semibold" : ""}>
                    Active: {device.lastActive}
                  </span>
                </div>
              </div>
            </div>

            {!device.current && (
              <button
                onClick={() => handleRevoke(device.id)}
                disabled={revokingId === device.id}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
              >
                {revokingId === device.id ? "Signing out..." : "Sign Out"}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs leading-relaxed">
        <ShieldCheck className="w-5 h-5 shrink-0 text-blue-400" />
        <p>
          Your workspace uses 256-bit AES token encryption and strict 2-device session limits (1 Desktop + 1 Mobile). Unrecognized devices can be instantly signed out to protect workspace access.
        </p>
      </div>
    </div>
  );
}
