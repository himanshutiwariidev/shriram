import React from "react";
import { T } from "./shared";

// Grouped checkbox matrix driven entirely by the catalog fetched from
// GET /api/superadmin/organizations/meta/feature-catalog — nothing about
// which features exist is hardcoded in this component.
export default function FeatureAccessMatrix({ catalog = [], enabledFeatures = [], onChange }) {
  const toggle = (key) => {
    if (enabledFeatures.includes(key)) {
      onChange(enabledFeatures.filter((k) => k !== key));
    } else {
      onChange([...enabledFeatures, key]);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
      {catalog.map((group) => (
        <div key={group.group} style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>{group.group}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {group.features.map((feature) => (
              <label key={feature.key} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: T.textPrimary, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={enabledFeatures.includes(feature.key)}
                  onChange={() => toggle(feature.key)}
                  style={{ width: 16, height: 16, accentColor: T.brand, cursor: "pointer" }}
                />
                {feature.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
