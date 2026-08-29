import React, { useEffect, useRef, useState } from "react";

// Generic trigger+panel dropdown — closes on outside click or Escape. No
// existing generic primitive was in the codebase (SearchableSelect.jsx is
// the closest analog but is select-specific), so this is the shared base
// for both the profile menu and the notification bell panel rather than
// two bespoke one-off implementations.
export default function Dropdown({ trigger, children, align = "right", panelStyle = {} }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <div onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer" }}>
        {trigger}
      </div>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 10px)", [align]: 0, zIndex: 200,
            background: "#fff", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,.16)",
            border: "1px solid #e8eaf0", animation: "dropdownIn .16s cubic-bezier(.22,1,.36,1)",
            ...panelStyle,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
      <style>{`@keyframes dropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
