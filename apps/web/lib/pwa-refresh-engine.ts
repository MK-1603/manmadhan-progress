"use client";

export type RefreshPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface RefreshDomainConfig {
  domain: string;
  priority: RefreshPriority;
  intervalMs: number;
  staleTimeMs: number;
  fetchFn: () => Promise<void>;
  enabled?: boolean;
}

export type NetworkStatus = "ONLINE" | "OFFLINE" | "SYNCING";

class PWARefreshEngine {
  private static instance: PWARefreshEngine;
  private isStandalone: boolean = false;
  private isRunning: boolean = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private networkStatus: NetworkStatus = "ONLINE";
  private domains: Map<string, RefreshDomainConfig> = new Map();
  private lastRefreshed: Map<string, number> = new Map();
  private inFlightRequests: Map<string, Promise<void>> = new Map();
  private listeners: Set<(status: NetworkStatus, lastSync: Date | null) => void> = new Set();
  private lastSyncTime: Date | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      this.initListeners();
    }
  }

  public static getInstance(): PWARefreshEngine {
    if (!PWARefreshEngine.instance) {
      PWARefreshEngine.instance = new PWARefreshEngine();
    }
    return PWARefreshEngine.instance;
  }

  public setStandalone(standalone: boolean) {
    this.isStandalone = standalone;
    if (standalone && !this.isRunning) {
      this.start();
    } else if (!standalone && this.isRunning) {
      this.stop();
    }
  }

  public registerDomain(config: RefreshDomainConfig) {
    this.domains.set(config.domain, config);
  }

  public unregisterDomain(domain: string) {
    this.domains.delete(domain);
    this.lastRefreshed.delete(domain);
  }

  public subscribe(callback: (status: NetworkStatus, lastSync: Date | null) => void) {
    this.listeners.add(callback);
    callback(this.networkStatus, this.lastSyncTime);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb(this.networkStatus, this.lastSyncTime));
  }

  private initListeners() {
    window.addEventListener("online", () => {
      this.networkStatus = "ONLINE";
      this.notifyListeners();
      if (this.isStandalone) {
        this.syncStaleDomains();
      }
    });

    window.addEventListener("offline", () => {
      this.networkStatus = "OFFLINE";
      this.notifyListeners();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        if (this.isStandalone) {
          this.syncStaleDomains();
        }
      }
    });
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run initial sync for stale items
    this.syncStaleDomains();

    // 30-Second Centralized Scheduler Heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.evaluateHeartbeat();
    }, 30000);
  }

  public stop() {
    this.isRunning = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private isFormActive(): boolean {
    if (typeof document === "undefined") return false;

    // Check window global dirty form flag
    if ((window as any).__HAS_DIRTY_FORM__) return true;

    // Check active element
    const active = document.activeElement;
    if (!active) return false;

    const tag = active.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (active as HTMLElement).isContentEditable) {
      return true;
    }

    return false;
  }

  private async evaluateHeartbeat() {
    if (!this.isStandalone || this.networkStatus === "OFFLINE" || document.visibilityState !== "visible") {
      return;
    }

    if (this.isFormActive()) {
      return; // Protect active form inputs
    }

    const now = Date.now();
    const sortedDomains = Array.from(this.domains.values()).sort((a, b) => {
      const order: Record<RefreshPriority, number> = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
      return order[a.priority] - order[b.priority];
    });

    for (const domainConfig of sortedDomains) {
      if (domainConfig.enabled === false) continue;

      const last = this.lastRefreshed.get(domainConfig.domain) || 0;
      if (now - last >= domainConfig.intervalMs) {
        await this.refreshDomain(domainConfig.domain);
      }
    }
  }

  public async syncStaleDomains() {
    if (!this.isStandalone || this.networkStatus === "OFFLINE") return;

    if (this.isFormActive()) return;

    const now = Date.now();
    const staleDomains = Array.from(this.domains.values()).filter((config) => {
      if (config.enabled === false) return false;
      const last = this.lastRefreshed.get(config.domain) || 0;
      return now - last >= config.staleTimeMs;
    });

    if (staleDomains.length === 0) return;

    this.networkStatus = "SYNCING";
    this.notifyListeners();

    for (const config of staleDomains) {
      await this.refreshDomain(config.domain);
    }

    this.lastSyncTime = new Date();
    this.networkStatus = "ONLINE";
    this.notifyListeners();
  }

  public async refreshDomain(domain: string): Promise<void> {
    const config = this.domains.get(domain);
    if (!config) return;

    // Request deduplication: reuse in-flight promise if already fetching
    if (this.inFlightRequests.has(domain)) {
      return this.inFlightRequests.get(domain)!;
    }

    const fetchPromise = (async () => {
      try {
        await config.fetchFn();
        this.lastRefreshed.set(domain, Date.now());
      } catch (err: any) {
        if (err?.status === 401 || err?.message?.includes("401")) {
          // Disable domain on 401 auth failure to prevent infinite request storms
          config.enabled = false;
        }
      } finally {
        this.inFlightRequests.delete(domain);
      }
    })();

    this.inFlightRequests.set(domain, fetchPromise);
    return fetchPromise;
  }
}

export const pwaRefreshEngine = PWARefreshEngine.getInstance();
