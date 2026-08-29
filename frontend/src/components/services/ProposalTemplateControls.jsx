import React, { useEffect, useState } from "react";
import { BookmarkPlus, FolderOpen, Trash2 } from "lucide-react";
import API from "../../services/api";
import useTenantTheme from "../../hooks/useTenantTheme";
import Dropdown from "../Dropdown";
import { Modal, FormField, baseInpNoIcon } from "../../pages/sections/shared";

// "Save as Template" (Modal, reused) + "Load Template" (Dropdown, reused) —
// no new dropdown/modal primitives, both already exist in the codebase.
export default function ProposalTemplateControls({ services, onLoadTemplate, showToast }) {
  const { T } = useTenantTheme();
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState(null);

  const loadTemplateList = async () => {
    try {
      const { data } = await API.get("/proposal-templates");
      setTemplates(data.templates || []);
    } catch {
      setTemplates([]);
    }
  };

  useEffect(() => { loadTemplateList(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!services.length) {
      showToast?.("Configure at least one service before saving a template", false);
      return;
    }
    setSaving(true);
    try {
      await API.post("/proposal-templates", { name, description, services });
      showToast?.("Template saved");
      setSaveOpen(false);
      setName("");
      setDescription("");
      loadTemplateList();
    } catch (error) {
      showToast?.(error?.response?.data?.message || "Failed to save template", false);
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (templateId, close) => {
    try {
      const { data } = await API.get(`/proposal-templates/${templateId}`);
      onLoadTemplate(data.template.services || []);
      showToast?.(`Loaded "${data.template.name}"`);
      close();
    } catch (error) {
      showToast?.(error?.response?.data?.message || "Failed to load template", false);
    }
  };

  const handleDelete = async (templateId, e) => {
    e.stopPropagation();
    try {
      await API.delete(`/proposal-templates/${templateId}`);
      loadTemplateList();
    } catch (error) {
      showToast?.(error?.response?.data?.message || "Failed to delete template", false);
    }
  };

  const btnStyle = { display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: "#fff", color: T.textSecondary, fontSize: 12.5, fontWeight: 600, cursor: "pointer" };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button type="button" onClick={() => setSaveOpen(true)} style={btnStyle}>
        <BookmarkPlus size={14} strokeWidth={2} /> Save as Template
      </button>

      <Dropdown
        panelStyle={{ width: 260 }}
        trigger={<span style={btnStyle}><FolderOpen size={14} strokeWidth={2} /> Load Template</span>}
      >
        {({ close }) => (
          <div style={{ padding: "8px 0", maxHeight: 280, overflowY: "auto" }}>
            {templates === null ? (
              <p style={{ padding: "10px 16px", fontSize: 12.5, color: T.textMuted }}>Loading…</p>
            ) : templates.length === 0 ? (
              <p style={{ padding: "10px 16px", fontSize: 12.5, color: T.textMuted }}>No saved templates yet.</p>
            ) : (
              templates.map((t) => (
                <div
                  key={t._id}
                  onClick={() => handleLoad(t._id, close)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 16px", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.brandLight; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                    {t.description && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</div>}
                  </div>
                  <button type="button" onClick={(e) => handleDelete(t._id, e)} style={{ display: "flex", background: "none", border: "none", cursor: "pointer", color: T.textMuted, flexShrink: 0 }}>
                    <Trash2 size={13} strokeWidth={1.8} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </Dropdown>

      {saveOpen && (
        <Modal title="Save as Template" onClose={() => setSaveOpen(false)} width={420}>
          <form onSubmit={handleSave}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FormField label="Template Name">
                <input className="inp" style={baseInpNoIcon} type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              </FormField>
              <FormField label="Description (optional)">
                <input className="inp" style={baseInpNoIcon} type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
              </FormField>
            </div>
            <button type="submit" disabled={saving} style={{ marginTop: 20, background: T.brand, color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? .7 : 1 }}>
              {saving ? "Saving…" : "Save Template"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
