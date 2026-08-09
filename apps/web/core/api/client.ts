const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  version: string;
  limits?: {
    maxUploadSizeBytes: string;
    uploadRateLimit: string;
  };
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendPushPayload {
  token?: string;
  topic?: string;
  title: string;
  body: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  avatar?: string;
  provider?: string;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user?: UserProfile;
  token?: string;
  message?: string;
}

export interface CloudinaryUploadResponse {
  success: boolean;
  url?: string;
  optimizeUrl?: string;
  autoCropUrl?: string;
  publicId?: string;
  sizeFormatted?: string;
  error?: string;
}

export const apiClient = {
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE_URL}/health`, {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Health check failed with status ${res.status}`);
    }
    return res.json();
  },

  async sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async sendPushNotification(payload: SendPushPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async generateAI(
    prompt: string,
    provider: "groq" | "gemini" = "groq"
  ): Promise<{
    success: boolean;
    data?: {
      provider: string;
      model: string;
      executionTimeMs: number;
      failoverTriggered: boolean;
      failoverTrail: string[];
      response: string;
    };
    providerUsed?: string;
    response?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, provider }),
    });
    return res.json();
  },

  async uploadMedia(fileBase64: string, folder = "manmadhan-progress"): Promise<CloudinaryUploadResponse> {
    const res = await fetch(`${API_BASE_URL}/api/v1/storage/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: fileBase64, folder }),
    });
    return res.json();
  },

  async deleteMedia(publicId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/storage/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publicId }),
    });
    return res.json();
  },

  async getAuthMe(): Promise<AuthMeResponse> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      cache: "no-store",
      credentials: "include",
    });
    return res.json();
  },

  async logout(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    return res.json();
  },

  async getQueueStats(): Promise<{ redisStatus: string; autoCleanup: string; completedJobs: number; failedJobs: number; waitingJobs: number }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/queue/stats`, { cache: "no-store" });
    return res.json();
  },

  async enqueueEmailJob(to: string, subject: string, text: string): Promise<{ success: boolean; mode: string; jobId: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/queue/email-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, text }),
    });
    return res.json();
  },

  async enqueuePushJob(title: string, body: string, token?: string): Promise<{ success: boolean; mode: string; jobId: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/queue/push-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, token }),
    });
    return res.json();
  },

  async getDbRecords(): Promise<{ success: boolean; tables: { users: any[]; mediaAssets: any[]; notificationLogs: any[]; aiConversations: any[] } }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/db/records`, { cache: "no-store" });
    return res.json();
  },
};
