import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  checkStoredKey,
  createSection,
  deleteSection as apiDeleteSection,
  fetchDashboard,
  fetchWidgetRegistry,
  isPinRequired,
  renameSection as apiRenameSection,
  reorderSections,
  saveApiKey,
  saveGlobalSettings,
  saveWidgets,
  verifyPin,
} from '../api';
import type { ConfigFieldSchema, DashboardSection, DashboardState, WidgetDefinition, WidgetInstance } from '../types';
import { v4 as uuid } from '../utils/id';

export function Settings() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [registry, setRegistry] = useState<WidgetDefinition[]>([]);
  const [pinRequired, setPinRequired] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinOk, setPinOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [keyMasks, setKeyMasks] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [dashboard, reg, pinReq] = await Promise.all([
      fetchDashboard(),
      fetchWidgetRegistry(),
      isPinRequired(),
    ]);
    setState(dashboard);
    setRegistry(reg);
    setPinRequired(pinReq);
    if (!pinReq) setPinOk(true);

    const masks: Record<string, string> = {};
    for (const w of dashboard.widgets) {
      const def = reg.find((r) => r.type === w.type);
      for (const field of def?.configSchema ?? []) {
        if (field.type === 'secret') {
          const result = await checkStoredKey(w.id, field.key);
          if (result.hasValue && result.masked) {
            masks[`${w.id}:${field.key}`] = result.masked;
          }
        }
      }
    }
    setKeyMasks(masks);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePinSubmit = async () => {
    const ok = await verifyPin(pinInput);
    if (ok) {
      setPinOk(true);
      setMessage(null);
    } else {
      setMessage('Invalid PIN');
    }
  };

  const updateWidgetConfig = (id: string, key: string, value: unknown) => {
    if (!state) return;
    setState({
      ...state,
      widgets: state.widgets.map((w) =>
        w.id === id ? { ...w, config: { ...w.config, [key]: value } } : w,
      ),
    });
  };

  const addWidget = (type: string) => {
    if (!state) return;
    const def = registry.find((r) => r.type === type);
    if (!def) return;
    const firstSection = state.sections[0];
    const newWidget: WidgetInstance = {
      id: `${type}-${uuid()}`,
      type,
      position: state.widgets.filter((w) => w.section === (firstSection?.id ?? 'default')).length,
      section: firstSection?.id ?? 'default',
      config: { ...def.defaultConfig },
    };
    setState({ ...state, widgets: [...state.widgets, newWidget] });
  };

  const removeWidget = (id: string) => {
    if (!state) return;
    setState({ ...state, widgets: state.widgets.filter((w) => w.id !== id) });
  };

  const moveWidget = (id: string, direction: -1 | 1) => {
    if (!state) return;
    const idx = state.widgets.findIndex((w) => w.id === id);
    const newIdx = idx + direction;
    if (idx < 0 || newIdx < 0 || newIdx >= state.widgets.length) return;
    const widgets = [...state.widgets];
    [widgets[idx], widgets[newIdx]] = [widgets[newIdx], widgets[idx]];
    setState({ ...state, widgets });
  };

  const changeWidgetSection = (id: string, sectionId: string) => {
    if (!state) return;
    setState({
      ...state,
      widgets: state.widgets.map((w) =>
        w.id === id ? { ...w, section: sectionId } : w,
      ),
    });
  };

  const handleAddSection = async () => {
    if (!state) return;
    const name = `Section ${state.sections.length + 1}`;
    try {
      const { section } = await createSection(name);
      setState({ ...state, sections: [...state.sections, section] });
    } catch {
      /* silent */
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!state || state.sections.length <= 1) return;
    try {
      await apiDeleteSection(sectionId);
      const updatedWidgets = state.widgets.map((w) =>
        w.section === sectionId ? { ...w, section: state.sections.find((s) => s.id !== sectionId)?.id ?? 'default' } : w,
      );
      setState({
        ...state,
        sections: state.sections.filter((s) => s.id !== sectionId),
        widgets: updatedWidgets,
      });
    } catch {
      /* silent */
    }
  };

  const handleRenameSection = async (sectionId: string, name: string) => {
    if (!state || !name.trim()) return;
    try {
      await apiRenameSection(sectionId, name.trim());
      setState({
        ...state,
        sections: state.sections.map((s) =>
          s.id === sectionId ? { ...s, name: name.trim() } : s,
        ),
      });
    } catch {
      /* silent */
    }
  };

  const handleTogglePaired = (sectionId: string) => {
    if (!state) return;
    setState({
      ...state,
      sections: state.sections.map((s) =>
        s.id === sectionId ? { ...s, paired: !s.paired } : s,
      ),
    });
  };

  const handleSave = async () => {
    if (!state) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveWidgets(state.widgets);
      await saveGlobalSettings(state.globalSettings);
      await reorderSections(state.sections.map((s, i) => ({ ...s, position: i })));
      setMessage('Saved successfully');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSecretSave = async (widgetId: string, keyName: string, value: string) => {
    if (!value.trim()) return;
    try {
      const result = await saveApiKey(widgetId, keyName, value);
      setKeyMasks((m) => ({ ...m, [`${widgetId}:${keyName}`]: result.masked }));
      setMessage('API key saved');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save key');
    }
  };

  if (!state) {
    return <div className="settings settings--loading">Loading…</div>;
  }

  if (pinRequired && !pinOk) {
    return (
      <div className="settings settings--pin">
        <h1>Enter PIN</h1>
        <input
          type="password"
          inputMode="numeric"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          placeholder="PIN"
          className="settings__input"
        />
        <button type="button" onClick={() => void handlePinSubmit()}>
          Unlock
        </button>
        {message && <p className="settings__message settings__message--error">{message}</p>}
        <Link to="/">← Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className={`settings theme-${state.globalSettings.theme}`}>
      <header className="settings__header">
        <h1>Settings</h1>
        <Link to="/" className="settings__back">
          ← Dashboard
        </Link>
      </header>

      {message && (
        <p className={`settings__message ${message.includes('fail') || message.includes('Invalid') ? 'settings__message--error' : ''}`}>
          {message}
        </p>
      )}

      <section className="settings__section">
        <h2>Global</h2>
        <label className="settings__field">
          Theme
          <select
            value={state.globalSettings.theme}
            onChange={(e) =>
              setState({
                ...state,
                globalSettings: {
                  ...state.globalSettings,
                  theme: e.target.value as 'dark' | 'light',
                },
              })
            }
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label className="settings__field">
          Default refresh (seconds)
          <input
            type="number"
            min={10}
            value={state.globalSettings.defaultRefreshInterval}
            onChange={(e) =>
              setState({
                ...state,
                globalSettings: {
                  ...state.globalSettings,
                  defaultRefreshInterval: Number(e.target.value),
                },
              })
            }
          />
        </label>
        <label className="settings__field">
          Settings PIN (optional)
          <input
            type="password"
            value={state.globalSettings.settingsPin ?? ''}
            onChange={(e) =>
              setState({
                ...state,
                globalSettings: {
                  ...state.globalSettings,
                  settingsPin: e.target.value || undefined,
                },
              })
            }
            placeholder="Leave empty to disable"
          />
        </label>
      </section>

      <section className="settings__section">
        <h2>Sections</h2>
        <div className="settings__sections-list">
          {state.sections.map((section) => (
            <div key={section.id} className="settings__section-item">
              <div className="settings__section-item-left">
                <SectionNameInput
                  section={section}
                  onRename={(name) => void handleRenameSection(section.id, name)}
                />
                <label className="settings__paired-toggle">
                  <input
                    type="checkbox"
                    checked={section.paired ?? false}
                    onChange={() => void handleTogglePaired(section.id)}
                  />
                  <span>Pair with next</span>
                </label>
              </div>
              {state.sections.length > 1 && (
                <button
                  type="button"
                  className="settings__remove-btn"
                  onClick={() => void handleDeleteSection(section.id)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="settings__add-btn"
            onClick={() => void handleAddSection()}
          >
            + Section
          </button>
        </div>
      </section>

      <section className="settings__section">
        <h2>Widgets</h2>
        <div className="settings__add-widgets">
          {registry.map((def) => (
            <button
              key={def.type}
              type="button"
              className="settings__add-btn"
              onClick={() => addWidget(def.type)}
            >
              + {def.name}
            </button>
          ))}
        </div>

        {state.sections.map((section) => {
          const sectionWidgets = state.widgets.filter((w) => w.section === section.id);
          if (sectionWidgets.length === 0) return null;
          return (
            <div key={section.id} className="settings__section-group">
              <h3 className="settings__section-group-title">{section.name}</h3>
              {sectionWidgets.map((widget) => {
                const def = registry.find((r) => r.type === widget.type);
                return (
                  <div key={widget.id} className="settings__widget-card">
                    <div className="settings__widget-header">
                      <h3>{def?.name ?? widget.type}</h3>
                      <div className="settings__widget-actions">
                        {state.sections.length > 1 && (
                          <select
                            className="settings__section-select"
                            value={widget.section}
                            onChange={(e) => changeWidgetSection(widget.id, e.target.value)}
                          >
                            {state.sections.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <button type="button" onClick={() => moveWidget(widget.id, -1)} aria-label="Move up">
                          ↑
                        </button>
                        <button type="button" onClick={() => moveWidget(widget.id, 1)} aria-label="Move down">
                          ↓
                        </button>
                        <button
                          type="button"
                          className="settings__remove-btn"
                          onClick={() => removeWidget(widget.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {def?.configSchema.map((field) => (
                      <ConfigField
                        key={field.key}
                        field={field}
                        value={widget.config[field.key]}
                        mask={keyMasks[`${widget.id}:${field.key}`]}
                        onChange={(val) => updateWidgetConfig(widget.id, field.key, val)}
                        onSecretSave={(val) => void handleSecretSave(widget.id, field.key, val)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      <button
        type="button"
        className="settings__save-btn"
        onClick={() => void handleSave()}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

function ConfigField({
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
  const [secretInput, setSecretInput] = useState('');

  if (field.type === 'secret') {
    return (
      <label className="settings__field">
        {field.label}
        {mask && <span className="settings__mask"> (stored: {mask})</span>}
        <input
          type="password"
          value={secretInput}
          onChange={(e) => setSecretInput(e.target.value)}
          placeholder="Enter new key"
          className="settings__input"
        />
        <button
          type="button"
          className="settings__key-btn"
          onClick={() => {
            onSecretSave(secretInput);
            setSecretInput('');
          }}
        >
          Save key
        </button>
        {field.description && <small>{field.description}</small>}
      </label>
    );
  }

  if (field.type === 'boolean') {
    return (
      <label className="settings__field settings__field--checkbox">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}
      </label>
    );
  }

  if (field.type === 'select' && field.options) {
    return (
      <label className="settings__field">
        {field.label}
        <select value={String(value ?? field.default)} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'number') {
    return (
      <label className="settings__field">
        {field.label}
        <input
          type="number"
          value={Number(value ?? field.default ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {field.description && <small>{field.description}</small>}
      </label>
    );
  }

  if (field.type === 'string-list') {
    const list = Array.isArray(value) ? (value as string[]) : [];
    return (
      <label className="settings__field">
        {field.label}
        <textarea
          rows={4}
          value={list.join('\n')}
          onChange={(e) =>
            onChange(
              e.target.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder="One URL per line"
        />
        {field.description && <small>{field.description}</small>}
      </label>
    );
  }

  return (
    <label className="settings__field">
      {field.label}
      <input
        type="text"
        value={String(value ?? field.default ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.description && <small>{field.description}</small>}
    </label>
  );
}

function SectionNameInput({
  section,
  onRename,
}: {
  section: DashboardSection;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(section.name);

  if (editing) {
    return (
      <input
        className="settings__section-name-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          onRename(name);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onRename(name);
            setEditing(false);
          }
          if (e.key === 'Escape') {
            setName(section.name);
            setEditing(false);
          }
        }}
        autoFocus
      />
    );
  }

  return (
    <span
      className="settings__section-name"
      onDoubleClick={() => setEditing(true)}
      title="Double-click to rename"
    >
      {section.name}
    </span>
  );
}
