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
  const [showDefaults, setShowDefaults] = useState(false);

  const defaultUrls = [
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHoyNGFzc21nMndod3k2ZmR1N3N1YzJlenhmbDZqbGluMnkwejB6MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/zkMri4yiJ3Mdy/giphy.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3RxdTFyNmE0eXZsd21ocGRmNjZ0MGtid3h6Ynd2ZWVsMno3MjQ2YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ZZT3Wag0jrTD3dpIfe/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXRuN3BuYmcxZzA4cmc1eXo0MjkwcGZjeDhxcnBlaHFqbXlmOGQzeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/E3K4ALemtRRidyYcfn/giphy.gif",
    "https://media.giphy.com/media/IffLnwlgZNgAQlVFT1/giphy.gif",
    "https://media.giphy.com/media/XXnSnRWh9iuakOY2wA/giphy.gif",
    "https://media.giphy.com/media/u3fEnaMRVNXZj8vRPG/giphy.gif",
    "https://media.giphy.com/media/nzAJ0dCqczqQdAgH8B/giphy.gif",
    "https://media.giphy.com/media/6o96ru5kUh8GjT9DsJ/giphy.gif",
    "https://media.giphy.com/media/WR9adQvRKA9kGcdI8w/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3g3cGQxcXRyY2doZzFuYzJ5Y29hZHlpcGJ2bGc1cjQ1NHRyN2w0eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/L0rDsOKmBnOOOMlGQH/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3g3cGQxcXRyY2doZzFuYzJ5Y29hZHlpcGJ2bGc1cjQ1NHRyN2w0eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/iihhj7uImF4UvAx3sO/giphy.gif",
    "https://i.gifer.com/xB.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cGgyeG1vMTlneXNtYWdjOG1jaGRodWkxanFzbTF0bTF0OWZ5eHNvZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1Ahw9XQ50JSdG7Vlcr/giphy.gif",
    "https://i.gifer.com/P420.gif",
    "https://media.giphy.com/media/KbZ1MOkvXkVYLPJVgh/giphy.gif",
    "https://media.giphy.com/media/tsVNjHb8SnQ2AnSbTa/giphy.gif",
    "https://media.giphy.com/media/8mbddSjGQXiLhv9t9K/giphy.gif",
    "https://media.giphy.com/media/PijmAh1ZFDveYsqnUR/giphy.gif",
    "https://media.giphy.com/media/piKe92Lhbexf40tNaR/giphy.gif",
    "https://media.giphy.com/media/7E5hSu9SA63wbIaoN2/giphy.gif",
    "https://media.giphy.com/media/NT20URHBaeZIzLPHWO/giphy.gif",
    "https://media.giphy.com/media/Y4sPp54Ed5Iv4Vktya/giphy.gif",
    "https://media.giphy.com/media/vwEUlx7r97PwIHxQcm/giphy.gif",
    "https://media.giphy.com/media/giEBaPNKEtjZtK43oX/giphy.gif",
    "https://media.giphy.com/media/KEZ8ZiKekb084Ng1E2/giphy.gif",
    "https://media.giphy.com/media/mkxIsVVfptxDWqFMIn/giphy.gif",
    "https://media.giphy.com/media/bq28CCsrIr35ML7tts/giphy.gif",
    "https://media.giphy.com/media/1dHrPwc5PWGQ8WXJ8e/giphy.gif",
    "https://media.giphy.com/media/oX7UH4SyPkawMG234t/giphy.gif",
    "https://media.giphy.com/media/SJXNmmOWKxrzN1ZUgT/giphy.gif",
    "https://media.giphy.com/media/2YpUE1W87ekkf0Dc7E/giphy.gif",
    "https://media.giphy.com/media/vNXeQsjGDIvcTwQ3rX/giphy.gif",
    "https://media.giphy.com/media/9xv8jNoTj9FJRkQjni/giphy.gif",
    "https://media.giphy.com/media/4ZvDEQZ6PueDUeCJXk/giphy.gif",
    "https://media.giphy.com/media/1zjfZG53zPsWVnzAXN/giphy.gif",
    "https://media.giphy.com/media/AiTjjWJaQvzyKeFRgl/giphy.gif",
    "https://media.giphy.com/media/xV78ZOduN9PzFmf5ue/giphy.gif",
    "https://media.giphy.com/media/SFKBr9eAFiwJ8oat8p/giphy.gif",
    "https://media.giphy.com/media/ycgfyv8A88Da0NX04M/giphy.gif",
    "https://media.giphy.com/media/l2vrFXP2yRA7SFYNlc/giphy.gif",
    "https://media.giphy.com/media/ulmOp7WdUHi5TqvGUW/giphy.gif",
    "https://media.giphy.com/media/AFv0XWCpogkKFg00DA/giphy.gif",
    "https://media.giphy.com/media/3FeByEGAjJWR1gc1kX/giphy.gif",
    "https://media.giphy.com/media/8i5ZAuJS3m9vjGE0LX/giphy.gif",
    "https://media.giphy.com/media/fRaBEnJ91iYBGiotd3/giphy.gif",
    "https://media.giphy.com/media/de9AxMzQCiswJ3Fskd/giphy.gif",
    "https://media.giphy.com/media/YkezHS1rrf5BZU0j5B/giphy.gif",
    "https://media.giphy.com/media/1fhbOpm3e3Sts7NXdW/giphy.gif",
    "https://media.giphy.com/media/4ahHmJHQAOVlwxCxGr/giphy.gif",
    "https://media.giphy.com/media/9P5mMA2Vgyvk8SXOX7/giphy.gif",
    "https://media.giphy.com/media/uTAZSWZmeggPwtiszK/giphy.gif",
    "https://media.giphy.com/media/ul0cqMk23IwVCxT7tX/giphy.gif",
    "https://media.giphy.com/media/2WdHOuWhxMmPzRP6BI/giphy.gif",
    "https://media.giphy.com/media/1gVjPZTltNBQIeJPOM/giphy.gif",
    "https://media.giphy.com/media/oziN3d4oW1HzHS1ame/giphy.gif",
    "https://media.giphy.com/media/jWp4ZgPZIdQYmBATaD/giphy.gif",
    "https://media.giphy.com/media/ny4YVxw2PITyhDjRsn/giphy.gif",
    "https://media.giphy.com/media/45cnPgquFIACYueyFy/giphy.gif",
    "https://media.giphy.com/media/7E2RvWd51DHCnZzOft/giphy.gif",
    "https://media.giphy.com/media/2wh2uBgG5Ex7PQSjU0/giphy.gif",
    "https://media.giphy.com/media/bkhpYV07EkHcCYxyx6/giphy.gif",
    "https://media.giphy.com/media/5QW2Oqt4uK8HDdwr0v/giphy.gif",
    "https://media.giphy.com/media/B1i4Fglxwm1HfUlp7n/giphy.gif",
    "https://media.giphy.com/media/fQx9cJxObFqHo2MqtL/giphy.gif",
    "https://media.giphy.com/media/9rrb3IHhvpCvzf2pZ3/giphy.gif",
    "https://media.giphy.com/media/245pPHFA5XTMkRA8em/giphy.gif",
    "https://media.giphy.com/media/ErizhSwfQlDItcJpzw/giphy.gif",
    "https://media.giphy.com/media/4Nbeg6HiPlIALk8Mj6/giphy.gif",
    "https://media.giphy.com/media/7JgCCL82qzIOCtY3WN/giphy.gif",
    "https://media.giphy.com/media/45bEtRvEDGI05OwGLa/giphy.gif",
    "https://media.giphy.com/media/4T5xvASbv8IKrNhWrJ/giphy.gif",
    "https://media.giphy.com/media/ZwrLL6vegULEyuDNvv/giphy.gif",
    "https://media.giphy.com/media/24FRXFX4gHsNGjkXyA/giphy.gif",
    "https://media.giphy.com/media/fNW4y1TC9cJ0gGMC3E/giphy.gif",
    "https://media.giphy.com/media/LwHe6XST1XVNATGH2n/giphy.gif",
    "https://media.giphy.com/media/4HgDCMosFYHjLJ6oum/giphy.gif",
    "https://media.giphy.com/media/7zMtHjCghYhQMGai7y/giphy.gif",
    "https://media.giphy.com/media/Wxl5aVht0Ltw0DNGet/giphy.gif",
    "https://media.giphy.com/media/4T9f0fZrbSwXW0RM67/giphy.gif",
    "https://media.giphy.com/media/uVtggYjeqAtbg9tl4V/giphy.gif",
    "https://media.giphy.com/media/1wq58EhaulgC4PmRKc/giphy.gif",
    "https://media.giphy.com/media/65FzxQ9L8kx2uSWE76/giphy.gif",
    "https://media.giphy.com/media/nnvvN635Q7QuhKN7bl/giphy.gif",
    "https://media.giphy.com/media/7zAAUElyF88bMCocHo/giphy.gif",
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmwzOG90YTZmMDFmbXEwOTVpNWg4d3c3M3dheXozaGNocW5zMnhvciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1PgA8RlbH3o2xsGeHF/giphy.gif",
    "https://media.giphy.com/media/1ylz5wsyJjY4BJzDGm/giphy.gif",
    "https://media.giphy.com/media/uUmC1nwcQduA1cL3yJ/giphy.gif",
    "https://media.giphy.com/media/6wo1ToFVaugldw7d9U/giphy.gif",
    "https://media.giphy.com/media/WgSJLI6wEYmyodg4jW/giphy.gif",
    "https://media.giphy.com/media/1iqhEl1HuthwPE6b2f/giphy.gif",
    "https://media.giphy.com/media/XtdQnnBXSccmcuEQws/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cnV5a2VubjU1YXMyd2huY2pycHkwdWw2enlhN3dsbWtvNXYxZWExZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/uYe2emzPgDfj2/giphy.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXp4YnI5ZXVzd2lqOHdxNTc1Z2ZyNWpqenkxOWl3cHhleWZvZzVnMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VnDxzWp8uTnb0x7yNP/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXR5cmV6YzI4NzZ0eGlmdjEzenNoZ3VhbHJmcmN2cGU4ZDFtOGgyOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QNG9CoR0gRRTme9C3q/giphy.gif",
  ].join("\n");

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
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
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
                <RemoveBtn type="button" onClick={() => removeItem(i)}>
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
        <DefaultsToggle type="button" onClick={() => setShowDefaults(s => !s)}>
          {showDefaults ? "Hide defaults" : "Import defaults"}
        </DefaultsToggle>
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
        {showDefaults && (
          <DefaultsArea>
            <small>Click below to import the default GIFs</small>
            <DefaultsBtn
              type="button"
              onClick={() => {
                const merged = bulkReplace
                  ? defaultUrls.split("\n")
                  : [...list, ...defaultUrls.split("\n")];
                const deduped = [...new Set(merged)].filter(u => u.trim() !== "");
                onChange(deduped);
                setShowDefaults(false);
              }}
            >
              Import defaults
            </DefaultsBtn>
          </DefaultsArea>
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

const DefaultsToggle = styled.button`
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

const DefaultsArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
  padding: 8px;
  background: ${({ theme }) => theme.bg};
  border: 1px solid ${({ theme }) => theme.border};
`;

const DefaultsBtn = styled.button`
  padding: 6px 12px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  cursor: pointer;
  font-size: 0.8rem;
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
