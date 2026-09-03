import axios from "axios";
import { getAuth, clearAuth } from "./authStorage";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://crm.technicaltiwariji.com/api",
});

// Attach token automatically
API.interceptors.request.use((req) => {
  const { token } = getAuth();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const requestUrl = error?.config?.url || "";
    const isLoginCall = requestUrl.includes("/users/login") || requestUrl.includes("/login");

    if (status === 401 && !isLoginCall) {
      clearAuth();
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }

    if (status === 403 && typeof code === "string" && code.startsWith("ORG_") && !isLoginCall) {
      const isRenewalCall = requestUrl.includes("/subscription/");
      if (!isRenewalCall) {
        sessionStorage.setItem("authNotice", error.response.data.message);
        if (code === "ORG_EXPIRED") {
          // Keep the token — tenant needs it to authenticate the renewal payment
          if (window.location.pathname !== "/renew") {
            window.location.href = "/renew";
          }
        } else {
          // Suspended / not found — end session fully
          clearAuth();
          if (window.location.pathname !== "/") {
            window.location.href = "/";
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export default API;
