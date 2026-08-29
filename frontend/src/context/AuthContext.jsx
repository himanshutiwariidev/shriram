import React, { createContext, useContext, useState, useCallback } from "react";
import { getAuth, setAuth, clearAuth, updateStoredUser } from "../services/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuthState] = useState(() => getAuth());

  const login = useCallback(({ token, user }) => {
    setAuth({ token, user });
    setAuthState(getAuth());
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuthState(getAuth());
  }, []);

  const updateUser = useCallback((userPatch) => {
    updateStoredUser(userPatch);
    setAuthState(getAuth());
  }, []);

  const value = {
    token: auth.token,
    role: auth.role,
    tenantId: auth.tenantId,
    user: {
      id: auth.userId,
      name: auth.userName,
      email: auth.userEmail,
      profileImage: auth.userProfileImage,
    },
    isAuthenticated: Boolean(auth.token),
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
