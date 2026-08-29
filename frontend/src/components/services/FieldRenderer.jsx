import React from "react";
import useTenantTheme from "../../hooks/useTenantTheme";
import { FormField, baseInpNoIcon } from "../../pages/sections/shared";
import TagInput from "../TagInput";

// Pure presentational — switches on field.type. Every field type this
// config schema needs (text/textarea/number/toggle/select/multiselect/
// radio/tags/date) lives here once; the config never carries JSX.
export default function FieldRenderer({ field, value, onChange }) {
  const { T } = useTenantTheme();

  switch (field.type) {
    case "toggle":
      return (
        <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontSize: 13, color: T.textSecondary, fontWeight: 500 }}>
          <span
            onClick={() => onChange(!value)}
            style={{
              width: 34, height: 19, borderRadius: 99, position: "relative", flexShrink: 0, transition: "background .15s",
              background: value ? T.brand : T.borderLight,
            }}
          >
            <span style={{ position: "absolute", top: 2, left: value ? 17 : 2, width: 15, height: 15, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} />
          </span>
          {field.label}
        </label>
      );

    case "textarea":
      return (
        <FormField label={field.label}>
          <textarea
            className="inp"
            style={{ ...baseInpNoIcon, resize: "vertical", minHeight: 60 }}
            rows={2}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </FormField>
      );

    case "number":
      return (
        <FormField label={field.label}>
          <input className="inp" style={baseInpNoIcon} type="number" min="0" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
        </FormField>
      );

    case "date":
      return (
        <FormField label={field.label}>
          <input className="inp" style={baseInpNoIcon} type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} />
        </FormField>
      );

    case "select":
      return (
        <FormField label={field.label}>
          <select className="inp" style={{ ...baseInpNoIcon, appearance: "none" }} value={value || ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select…</option>
            {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </FormField>
      );

    case "radio":
      return (
        <FormField label={field.label}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(field.options || []).map((opt) => {
              const active = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(opt)}
                  style={{
                    padding: "8px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    border: `1.5px solid ${active ? T.brand : T.inputBorder}`,
                    background: active ? T.brandLight : "#fff",
                    color: active ? T.brand : T.textSecondary,
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </FormField>
      );

    case "multiselect": {
      const selected = Array.isArray(value) ? value : [];
      const toggleOpt = (opt) => onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
      return (
        <FormField label={field.label}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(field.options || []).map((opt) => {
              const active = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleOpt(opt)}
                  style={{
                    padding: "8px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    border: `1.5px solid ${active ? T.brand : T.inputBorder}`,
                    background: active ? T.brandLight : "#fff",
                    color: active ? T.brand : T.textSecondary,
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </FormField>
      );
    }

    case "tags":
      return (
        <FormField label={field.label}>
          <TagInput value={Array.isArray(value) ? value : []} onChange={onChange} />
        </FormField>
      );

    case "text":
    default:
      return (
        <FormField label={field.label}>
          <input className="inp" style={baseInpNoIcon} type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} />
        </FormField>
      );
  }
}
