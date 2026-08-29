// Pure client-side JSON export/import of a proposal's Services Builder
// state — no backend endpoint needed for either direction.

export function exportServicesJson(payload, filename = "proposal-services.json") {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Resolves the parsed JSON, or rejects with a user-facing message on
// malformed input / an unexpected shape.
export function importServicesJson(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file selected"));
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.services)) {
          return reject(new Error("This file doesn't look like an exported proposal (missing a 'services' array)"));
        }
        resolve(parsed);
      } catch {
        reject(new Error("Couldn't parse this file as JSON"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
