"use client";

import React, { useEffect, useState } from "react";
import { MonitorSmartphone, Trash2, Loader2, ShieldCheck, MapPin, Monitor } from "lucide-react";
import apiClient from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";

interface DeviceSession {
  id: string;
  deviceName: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  location: string | null;
  lastActive: string;
  loginTime: string;
}

export default function SettingsPage() {
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      const res = await apiClient.get("/auth/devices");
      if (res.data.success) {
        setDevices(res.data.devices);
      }
    } catch (err) {
      console.error("Failed to fetch devices", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevoke = async (deviceId: string) => {
    setRevokingId(deviceId);
    try {
      const res = await apiClient.delete(`/auth/devices/${deviceId}`);
      if (res.data.success) {
        setDevices(prev => prev.filter(d => d.id !== deviceId));
      }
    } catch (err) {
      console.error("Failed to revoke device", err);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and security preferences.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="w-5 h-5 text-gold" />
            <h2 className="text-lg font-semibold text-foreground">Device Management</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage the devices that are currently logged into your account. You can revoke access for any unfamiliar devices.
          </p>
        </div>

        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : devices.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No active devices found.
            </div>
          ) : (
            <AnimatePresence>
              {devices.map((device, index) => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
                      <MonitorSmartphone className="w-5 h-5 text-foreground/70" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground">
                          {device.deviceName || device.os || "Unknown Device"}
                        </p>
                        {index === 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Monitor className="w-3 h-3" />
                          {device.browser || "Unknown Browser"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {device.ipAddress || "Unknown IP"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        Last active: {new Date(device.lastActive).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {index !== 0 && (
                    <button
                      onClick={() => handleRevoke(device.id)}
                      disabled={revokingId === device.id}
                      className="text-xs font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {revokingId === device.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Revoke Access
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
