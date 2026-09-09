"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { account, appwriteConfig, tablesDB, ID } from "@/lib/appwrite";
import { Models } from "appwrite";

interface AuthContextValue {
  user: Models.User<Models.Preferences> | null;
  loading: boolean;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const current = await account.get();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const signup = async (name: string, email: string, password: string) => {
    setError(null);
    try {
      const newUser = await account.create(ID.unique(), email, password, name);

      // Create a session so the user is logged in immediately after signup.
      await account.createEmailPasswordSession(email, password);

      // Create a profile row so this user shows up in the user list.
      // (Appwrite's client SDK cannot list all auth users, so we maintain
      // a lightweight "profiles" table instead.)
      await tablesDB.createRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.profilesTableId,
        rowId: newUser.$id,
        data: {
          userId: newUser.$id,
          name,
          email,
        },
      });

      await refreshUser();
    } catch (err: any) {
      setError(err?.message || "Failed to sign up. Please try again.");
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      await account.createEmailPasswordSession(email, password);
      await refreshUser();
    } catch (err: any) {
      setError(err?.message || "Failed to log in. Please check your credentials.");
      throw err;
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession("current");
    } finally {
      setUser(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{ user, loading, signup, login, logout, error, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
