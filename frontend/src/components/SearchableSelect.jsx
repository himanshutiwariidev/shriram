import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import "./SearchableSelect.css";

// Lightweight searchable dropdown — no autocomplete library exists in this project.
// `options` is [{ value, label }]. `value` is the selected option's value (or "").
const SearchableSelect = ({ options, value, onChange, placeholder = "Select...", emptyLabel = "No options found", disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="searchable-select" ref={containerRef}>
      <button
        type="button"
        className="searchable-select-trigger"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? "" : "searchable-select-placeholder"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} />
      </button>

      {open && !disabled && (
        <div className="searchable-select-panel">
          <div className="searchable-select-search">
            <Search size={14} />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="searchable-select-list">
            {filtered.length === 0 ? (
              <div className="searchable-select-empty">{emptyLabel}</div>
            ) : (
              filtered.map((o) => (
                <div
                  key={o.value}
                  className={`searchable-select-option ${o.value === value ? "selected" : ""}`}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {o.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
