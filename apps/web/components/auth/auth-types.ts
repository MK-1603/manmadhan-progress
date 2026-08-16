export type User = {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  avatar?: string;
  role: string;
  workspaceId?: string;
  timezone?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  batchNumber?: string;
  firstLoginCompleted?: boolean;
  onboardingStatus?: string;
};

export type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isOpen: boolean;
  isDirty: boolean;
  setIsDirty: (val: boolean) => void;
  isTransitioning: boolean;
  setIsTransitioning: (val: boolean) => void;
  transitionMessage: string;
  setTransitionMessage: (val: string) => void;
  authState: string;
  setAuthState: (state: string) => void;
  authData: { step?: string; token?: string; role?: string; error?: string; email?: string } | null;
  setAuthData: (data: { step?: string; token?: string; role?: string; error?: string; email?: string } | null) => void;
  authStatus: "initializing" | "authenticated" | "unauthenticated";
  open: () => void;
  close: (discardState?: boolean) => void;
  verifyOtp: (tempToken: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  /** Re-fetches the current user from /auth/me and updates context state. */
  refreshUser: () => Promise<void>;
};
