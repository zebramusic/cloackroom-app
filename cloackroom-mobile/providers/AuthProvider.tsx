import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import type { SessionUser, UserType } from "@/lib/types";

interface AuthState {
  user: SessionUser | null;
  isLoading: boolean;
  signIn: (input: {
    email: string;
    password: string;
    type: UserType;
    remember?: boolean;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchMe() {
  return apiFetch<{ user: SessionUser | null }>("/api/auth/me");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchMe();
      setUser(result.user || null);
    } catch (error) {
      setUser(null);
      if (error instanceof ApiError && error.status !== 401) {
        console.warn("Failed to refresh session", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(
    async (input: {
      email: string;
      password: string;
      type: UserType;
      remember?: boolean;
    }) => {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          type: input.type,
          remember: input.remember ?? false,
        }),
      });
      await refresh();
      queryClient.clear();
    },
    [queryClient, refresh]
  );

  const signOut = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({ user, isLoading, signIn, signOut, refresh }),
    [user, isLoading, signIn, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
