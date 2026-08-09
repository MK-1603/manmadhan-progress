"use client";

import { Monitor, Smartphone, Laptop, ShieldCheck, LogOut, Globe } from "lucide-react";

const devices = [
  {
    id: "1",
    name: "MacBook Pro 16\"",
    type: "laptop",
    browser: "Chrome",
    os: "macOS 14.0",
    loginTime: "2026-08-01 09:00",
    lastActive: "Just now",
    current: true,
  },
  {
    id: "2",
    name: "iPhone 15 Pro",
    type: "mobile",
    browser: "Safari",
    os: "iOS 17.5",
    loginTime: "2026-08-02 14:30",
    lastActive: "2 hours ago",
    current: false,
  },
  {
    id: "3",
    name: "Windows Desktop",
    type: "desktop",
    browser: "Edge",
    os: "Windows 11",
    loginTime: "2026-07-28 11:15",
    lastActive: "5 days ago",
    current: false,
  }
];

export function ManageDevices() {
  const getIcon = (type: string) => {
    switch(type) {
      case 'mobile': return <Smartphone className="w-5 h-5" />;
      case 'laptop': return <Laptop className="w-5 h-5" />;
      default: return <Monitor className="w-5 h-5" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-background rounded-3xl border border-border text-foreground shadow-2xl">
      <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Active Devices</h2>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Manage the devices currently signed into your workspace.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-bold transition-colors">
          <LogOut className="w-4 h-4" />
          Sign Out All Devices
        </button>
      </div>

      <div className="space-y-4">
        {devices.map(device => (
          <div key={device.id} className="flex items-center justify-between p-5 rounded-2xl border border-border bg-muted hover:bg-muted transition-colors">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl border ${device.current ? 'bg-amber-500/10 border-amber-500/20 text-gold' : 'bg-muted border-border text-muted-foreground'}`}>
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
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground font-medium">
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {device.browser} on {device.os}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span>Logged in: {device.loginTime}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className={device.current ? "text-emerald-400" : ""}>Active: {device.lastActive}</span>
                </div>
              </div>
            </div>

            {!device.current && (
              <button className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                Sign Out
              </button>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs leading-relaxed">
        <ShieldCheck className="w-5 h-5 shrink-0 text-blue-400" />
        <p>If you don't recognize a device, sign it out immediately and consider changing your password. Your workspace uses 256-bit encryption for all active sessions.</p>
      </div>
    </div>
  );
}
