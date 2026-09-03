// Resolves a stored `/uploads/...` path (from Organization.logoUrl/faviconUrl,
// Client.piAttachments, etc.) into a fully-qualified URL against the API
// host — same pattern already used inline in ClientDetailPage.jsx for PI
// attachments, pulled out here since branding needs it in several places.
export const resolveFileUrl = (uploadPath) => {
  if (!uploadPath) return null;
  if (/^(https?:)?\/\//i.test(uploadPath) || uploadPath.startsWith("data:") || uploadPath.startsWith("blob:")) {
    return uploadPath;
  }
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "https://crm.technicaltiwariji.com/api").replace("/api", "");
  return `${baseUrl.replace(/\/$/, "")}/${String(uploadPath).replace(/^\//, "")}`;
};
