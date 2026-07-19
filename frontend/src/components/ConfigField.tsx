import { useState } from "react";
import styled from "styled-components";
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
      <FieldRow>
        {field.label}
        {mask && <Mask>(stored: {mask})</Mask>}
        <input
          type="password"
          value={secretInput}
          onChange={e => setSecretInput(e.target.value)}
          placeholder="Enter new key"
        />
        <KeyBtn
          type="button"
          onClick={() => {
            onSecretSave(secretInput);
            setSecretInput("");
          }}
        >
          Save key
        </KeyBtn>
        {field.description && <small>{field.description}</small>}
      </FieldRow>
    );
  }

  if (field.type === "boolean") {
    return (
      <CheckboxRow>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={e => onChange(e.target.checked)}
        />
        {field.label}
      </CheckboxRow>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <FieldRow>
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
      </FieldRow>
    );
  }

  if (field.type === "number") {
    return (
      <FieldRow>
        {field.label}
        <NumberInput value={Number(value ?? field.default ?? 0)} onChange={onChange} />
        {field.description && <small>{field.description}</small>}
      </FieldRow>
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
      <FieldRow>
        <FieldLabel>{field.label}</FieldLabel>
        <UrlGrid>
          {list.map((url, i) => (
            <UrlCard key={i}>
              <UrlCardPreview>
                {url ? (
                  <img
                    src={url}
                    alt={`GIF ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Placeholder>No preview</Placeholder>
                )}
              </UrlCardPreview>
              <UrlCardFooter>
                <UrlInput
                  type="text"
                  value={url}
                  onChange={e => updateItem(i, e.target.value)}
                  placeholder="Paste GIF URL"
                />
                <RemoveBtn
                  type="button"
                  onClick={() => removeItem(i)}
                >
                  ✕
                </RemoveBtn>
              </UrlCardFooter>
            </UrlCard>
          ))}
          <AddCardBtn type="button" onClick={addItem}>
            + GIF
          </AddCardBtn>
        </UrlGrid>
        <BulkToggle type="button" onClick={() => setShowBulk(s => !s)}>
          {showBulk ? "Hide bulk import" : "Bulk import"}
        </BulkToggle>
        {showBulk && (
          <BulkArea>
            <BulkTextarea
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
              <BulkCount>
                {
                  bulkInput
                    .split(/[\n,]/)
                    .map(u => u.trim())
                    .filter(u => u.length > 0).length
                }{" "}
                URL(s) detected
              </BulkCount>
            )}
            <BulkActions>
              <CheckboxRow>
                <input
                  type="checkbox"
                  checked={bulkReplace}
                  onChange={e => setBulkReplace(e.target.checked)}
                />
                Replace existing
              </CheckboxRow>
              <AddBtn
                type="button"
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
              </AddBtn>
            </BulkActions>
          </BulkArea>
        )}
        {field.description && <small>{field.description}</small>}
      </FieldRow>
    );
  }

  return (
    <FieldRow>
      {field.label}
      <input
        type="text"
        value={String(value ?? field.default ?? "")}
        onChange={e => onChange(e.target.value)}
      />
      {field.description && <small>{field.description}</small>}
    </FieldRow>
  );
}

const FieldRow = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 0.85rem;

  & input,
  & select,
  & textarea {
    padding: 8px 10px;
    background: ${({ theme }) => theme.bgElevated};
    border: 1px solid ${({ theme }) => theme.border};
  }

  & small {
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.75rem;
  }
`;

const CheckboxRow = styled.label`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 0.85rem;
`;

const FieldLabel = styled.span`
  font-size: 0.85rem;
  margin-bottom: 2px;
`;

const Mask = styled.span`
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.75rem;
`;

const KeyBtn = styled.button`
  align-self: flex-start;
  padding: 5px 10px;
  background: ${({ theme }) => theme.accentDim};
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 0.8rem;
`;

const UrlGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
`;

const UrlCard = styled.div`
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  overflow: hidden;
`;

const UrlCardPreview = styled.div`
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.bg};
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const Placeholder = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.textMuted};
`;

const UrlCardFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
`;

const UrlInput = styled.input`
  flex: 1;
  min-width: 0;
`;

const RemoveBtn = styled.button`
  padding: 4px 8px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  cursor: pointer;
  color: ${({ theme }) => theme.error};
`;

const AddCardBtn = styled.button`
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  cursor: pointer;
  font-size: 0.8rem;
`;

const BulkToggle = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.accent};
  font-size: 0.75rem;
  cursor: pointer;
  padding: 4px 0;
  margin-top: 4px;

  &:hover {
    text-decoration: underline;
  }
`;

const BulkArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
`;

const BulkTextarea = styled.textarea`
  width: 100%;
  resize: vertical;
  font-family: inherit;
  font-size: 0.8rem;
  padding: 6px 8px;
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text};
  border: 1px solid ${({ theme }) => theme.border};
`;

const BulkCount = styled.small`
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.75rem;
`;

const BulkActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const AddBtn = styled.button`
  padding: 6px 12px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  cursor: pointer;
  font-size: 0.8rem;
`;
