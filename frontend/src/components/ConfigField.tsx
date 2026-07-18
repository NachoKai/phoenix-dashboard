import { useState } from "react";
import { NumberInput } from "../components/NumberInput";
import type { ConfigFieldSchema } from "../types";

export function ConfigField({
  field,
  value,
  mask,
  onChange,
  onSecretSave,
}: {
  field: ConfigFieldSchema;
  value: unknown;
  mask?: string;
  onChange: (val: unknown) => void;
  onSecretSave: (val: string) => void;
}) {
  const [secretInput, setSecretInput] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [bulkReplace, setBulkReplace] = useState(false);

  if (field.type === "secret") {
    return (
      <label className="settings__field">
        {field.label}
        {mask && <span className="settings__mask"> (stored: {mask})</span>}
        <input
          type="password"
          value={secretInput}
          onChange={e => setSecretInput(e.target.value)}
          placeholder="Enter new key"
          className="settings__input"
        />
        <button
          type="button"
          className="settings__key-btn"
          onClick={() => {
            onSecretSave(secretInput);
            setSecretInput("");
          }}
        >
          Save key
        </button>
        {field.description && <small>{field.description}</small>}
      </label>
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="settings__field settings__field--checkbox">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={e => onChange(e.target.checked)}
        />
        {field.label}
      </label>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <label className="settings__field">
        {field.label}
        <select
          value={String(value ?? field.default)}
          onChange={e => onChange(e.target.value)}
        >
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "number") {
    return (
      <label className="settings__field">
        {field.label}
        <NumberInput value={Number(value ?? field.default ?? 0)} onChange={onChange} />
        {field.description && <small>{field.description}</small>}
      </label>
    );
  }

  if (field.type === "string-list") {
    const list = Array.isArray(value) ? (value as string[]) : [];
    const updateItem = (index: number, newVal: string) => {
      const updated = [...list];
      updated[index] = newVal;
      onChange(updated);
    };
    const addItem = () => {
      onChange([...list, ""]);
    };
    const removeItem = (index: number) => {
      onChange(list.filter((_, i) => i !== index));
    };
    return (
      <div className="settings__field">
        <span className="settings__field-label">{field.label}</span>
        <div className="settings__url-grid">
          {list.map((url, i) => (
            <div key={i} className="settings__url-card">
              <div className="settings__url-card-preview">
                {url ? (
                  <img
                    src={url}
                    alt={`GIF ${i + 1}`}
                    className="settings__url-preview"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="settings__url-preview-placeholder">No preview</span>
                )}
              </div>
              <div className="settings__url-card-footer">
                <input
                  type="text"
                  value={url}
                  onChange={e => updateItem(i, e.target.value)}
                  placeholder="Paste GIF URL"
                  className="settings__url-input"
                />
                <button
                  type="button"
                  className="settings__remove-btn"
                  onClick={() => removeItem(i)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="settings__add-btn settings__add-btn--card"
            onClick={addItem}
          >
            + GIF
          </button>
        </div>
        <button
          type="button"
          className="settings__bulk-toggle"
          onClick={() => setShowBulk(s => !s)}
        >
          {showBulk ? "Hide bulk import" : "Bulk import"}
        </button>
        {showBulk && (
          <div className="settings__bulk-area">
            <textarea
              className="settings__bulk-textarea"
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
              onPaste={e => {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                const el = e.currentTarget;
                const start = el.selectionStart;
                const end = el.selectionEnd;
                const next =
                  bulkInput.substring(0, start) + text + bulkInput.substring(end);
                setBulkInput(next);
              }}
              placeholder="Paste URLs, one per line or comma-separated"
              rows={5}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {bulkInput.trim() && (
              <small className="settings__bulk-count">
                {
                  bulkInput
                    .split(/[\n,]/)
                    .map(u => u.trim())
                    .filter(u => u.length > 0).length
                }{" "}
                URL(s) detected
              </small>
            )}
            <div className="settings__bulk-actions">
              <label className="settings__field settings__field--checkbox settings__bulk-replace">
                <input
                  type="checkbox"
                  checked={bulkReplace}
                  onChange={e => setBulkReplace(e.target.checked)}
                />
                Replace existing
              </label>
              <button
                type="button"
                className="settings__add-btn"
                onClick={() => {
                  const parsed = bulkInput
                    .split(/[\n,]/)
                    .map(u => u.trim())
                    .filter(u => u.length > 0);
                  if (parsed.length === 0) return;
                  const merged = bulkReplace ? parsed : [...list, ...parsed];
                  const deduped = [...new Set(merged)].filter(u => u.trim() !== "");
                  onChange(deduped);
                  setBulkInput("");
                  setShowBulk(false);
                }}
              >
                Import
              </button>
            </div>
          </div>
        )}
        {field.description && <small>{field.description}</small>}
      </div>
    );
  }

  return (
    <label className="settings__field">
      {field.label}
      <input
        type="text"
        value={String(value ?? field.default ?? "")}
        onChange={e => onChange(e.target.value)}
      />
      {field.description && <small>{field.description}</small>}
    </label>
  );
}
