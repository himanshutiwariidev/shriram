import React, { useRef, useState } from "react";
import { Download, Image as ImageIcon, Trash2, UploadCloud } from "lucide-react";
import API from "../../services/api";
import { resolveFileUrl } from "../../utils/fileUrl";
import { T } from "./shared";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_SIZE_MB = 2;

// Drag-and-drop logo/favicon uploader — uploads immediately on drop/select
// (no separate save step), with preview/replace/remove. Used for both a
// tenant's logo and favicon; the caller supplies the endpoint + form field
// name so this stays generic rather than logo-specific.
export default function LogoUploadField({ label, value, uploadUrl, deleteUrl, fieldName, onChange, showToast }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const validate = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast?.("Only PNG, JPG, JPEG, SVG, and WEBP files are allowed", false);
      return false;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showToast?.(`File must be under ${MAX_SIZE_MB}MB`, false);
      return false;
    }
    return true;
  };

  const upload = async (file) => {
    if (!validate(file)) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append(fieldName, file);
      const { data } = await API.post(uploadUrl, formData, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(data.logoUrl || data.faviconUrl || data.profileImage || null);
      showToast?.(`${label} uploaded successfully`);
    } catch (error) {
      showToast?.(error?.response?.data?.message || `Failed to upload ${label.toLowerCase()}`, false);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await API.delete(deleteUrl);
      onChange(null);
      showToast?.(`${label} removed`);
    } catch (error) {
      showToast?.(error?.response?.data?.message || `Failed to remove ${label.toLowerCase()}`, false);
    } finally {
      setBusy(false);
    }
  };

  const previewUrl = resolveFileUrl(value);

  return (
    <div>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.[0]) upload(e.dataTransfer.files[0]);
        }}
        style={{
          display: "flex", alignItems: "center", gap: 16, padding: 16, borderRadius: 12,
          flexWrap: "wrap", minWidth: 0, overflow: "hidden",
          border: `1.5px dashed ${dragOver ? T.brand : T.inputBorder}`,
          background: dragOver ? T.brandLight : T.inputBg,
          transition: "border-color .15s, background .15s",
        }}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={label} style={{ width: 56, height: 56, borderRadius: 10, objectFit: "contain", background: "#fff", border: `1px solid ${T.border}` }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: 10, background: T.borderLight, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <ImageIcon size={22} color={T.textMuted} strokeWidth={1.8} />
          </div>
        )}

        <div style={{ flex: "1 1 170px", minWidth: 0 }}>
          <p style={{ fontSize: 12.5, color: T.textSecondary, marginBottom: 8, lineHeight: 1.55, overflowWrap: "anywhere" }}>
            Drag & drop an image here, or
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} style={{ background: "none", border: "none", color: T.brand, fontWeight: 700, cursor: "pointer", padding: "0 4px", fontSize: 12.5 }}>browse</button>
            — PNG, JPG, JPEG, SVG, or WEBP, up to {MAX_SIZE_MB}MB.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${T.inputBorder}`, background: "#fff", color: T.textSecondary, fontSize: 12, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
              <UploadCloud size={13} strokeWidth={2} /> {value ? "Replace" : "Upload"}
            </button>
            {value && (
              <a href={previewUrl} download style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${T.inputBorder}`, background: "#fff", color: T.textSecondary, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                <Download size={13} strokeWidth={2} /> Download
              </a>
            )}
            {value && (
              <button type="button" onClick={handleRemove} disabled={busy} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${T.redBorder}`, background: T.redBg, color: T.red, fontSize: 12, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
                <Trash2 size={13} strokeWidth={2} /> Remove
              </button>
            )}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.svg,.webp"
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.[0]) upload(e.target.files[0]); e.target.value = ""; }}
        />
      </div>
    </div>
  );
}
