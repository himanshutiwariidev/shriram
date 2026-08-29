import React, { useState } from "react";
import { X } from "lucide-react";
import useTenantTheme from "../hooks/useTenantTheme";

// Pill-chip tag input — Enter or comma commits the current text as a tag,
// Backspace on an empty input removes the last tag. No library; nothing
// reusable for this existed in the codebase before.
export default function TagInput({ value = [], onChange, placeholder = "Type and press Enter…" }) {
  const { T } = useTenantTheme();
  const [draft, setDraft] = useState("");

  const commit = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeAt = (idx) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div
      style={{
        display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
        background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 9, padding: "7px 9px", minHeight: 40,
      }}
    >
      {value.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          style={{
            display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
            color: T.brand, background: T.brandLight, borderRadius: 6, padding: "4px 8px",
          }}
        >
          {tag}
          <button
            type="button"
            onClick={() => removeAt(idx)}
            style={{ display: "flex", background: "none", border: "none", cursor: "pointer", color: T.brand, padding: 0 }}
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={value.length === 0 ? placeholder : ""}
        style={{
          flex: 1, minWidth: 90, border: "none", outline: "none", background: "transparent",
          fontSize: 13, color: T.textPrimary, fontFamily: "inherit", padding: "3px 2px",
        }}
      />
    </div>
  );
}
