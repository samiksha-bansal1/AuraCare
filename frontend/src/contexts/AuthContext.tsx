// contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useMemo,
} from "react";
import { authAPI } from "../services/api"; // ✅ use your axios-based API layer

export interface User {
  type: "patient" | "nurse" | "family";
  name: string;
  id?: string;
  patientId?: string;
  email?: string;
  password?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (payload: Partial<User> & { type: User["type"] }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from storage
  useEffect(() => {
    const stored = localStorage.getItem("auracare_auth");
    if (stored) {
      try {
        const { user, token } = JSON.parse(stored);
        setUser(user);
        setToken(token);
      } catch {
        localStorage.removeItem("auracare_auth");
      }
    }
  }, []);

  const persist = (u: User | null, t: string | null) => {
    setUser(u);
    setToken(t);
    if (u && t) {
      localStorage.setItem(
        "auracare_auth",
        JSON.stringify({ user: u, token: t })
      );
    } else {
      localStorage.removeItem("auracare_auth");
    }
  };

  const login: AuthContextType["login"] = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      let data;

      if (payload.type === "patient") {
        // ✅ call patient API
        data = await authAPI.loginPatient({
          patientId: payload.id!, // use id field from UI
          name: payload.name!,
        });
      } else if (payload.type === "nurse") {
        // ✅ call nurse/staff API
        data = await authAPI.loginNurse({
          email: payload.email!,
          password: payload.password!,
        });
      } else if (payload.type === "family") {
        // ✅ call family API
        data = await authAPI.loginFamily({
          email: payload.email!,
          password: payload.password!,
        });
      } else {
        throw new Error("Unsupported login type");
      }

      // Normalize user to ensure 'type' is present for role-specific logins
      const rawUser = data.user as User;
      const normalizedUser: User = {
        ...rawUser,
        // Ensure type is set based on the login payload (backend role-specific endpoints may omit it)
        type: payload.type,
      };
      persist(normalizedUser, data.token as string);
    } catch (err: any) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => persist(null, null);

  const clearError = () => setError(null);

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      isAuthenticated: !!token,
      loading,
      error,
      clearError,
    }),
    [user, token, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
