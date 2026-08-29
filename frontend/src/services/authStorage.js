// Single source of truth for the localStorage keys backing auth state. Kept
// as a plain module (not a hook) so it can be used both inside React
// (AuthContext) and outside it (axios interceptors in api.js/clientApi.js).
const KEYS = {
  token: "token",
  role: "role",
  tenantId: "tenantId",
  userId: "userId",
  userName: "userName",
  userEmail: "userEmail",
  userProfileImage: "userProfileImage",
};

export const getAuth = () => ({
  token: localStorage.getItem(KEYS.token),
  role: localStorage.getItem(KEYS.role),
  tenantId: localStorage.getItem(KEYS.tenantId),
  userId: localStorage.getItem(KEYS.userId),
  userName: localStorage.getItem(KEYS.userName),
  userEmail: localStorage.getItem(KEYS.userEmail),
  userProfileImage: localStorage.getItem(KEYS.userProfileImage),
});

export const setAuth = ({ token, user }) => {
  localStorage.setItem(KEYS.token, token);
  localStorage.setItem(KEYS.role, user.role);
  localStorage.setItem(KEYS.tenantId, user.tenantId || "");
  localStorage.setItem(KEYS.userId, user.id);
  localStorage.setItem(KEYS.userName, user.name);
  localStorage.setItem(KEYS.userEmail, user.email);
  localStorage.setItem(KEYS.userProfileImage, user.profileImage || "");
};

export const updateStoredUser = (user = {}) => {
  if (user.id || user._id) localStorage.setItem(KEYS.userId, user.id || user._id);
  if (user.name !== undefined) localStorage.setItem(KEYS.userName, user.name || "");
  if (user.email !== undefined) localStorage.setItem(KEYS.userEmail, user.email || "");
  if (user.profileImage !== undefined) localStorage.setItem(KEYS.userProfileImage, user.profileImage || "");
  if (user.role !== undefined) localStorage.setItem(KEYS.role, user.role || "");
  if (user.tenantId !== undefined) localStorage.setItem(KEYS.tenantId, user.tenantId || "");
};

export const clearAuth = () => localStorage.clear();
