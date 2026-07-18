import { useRef } from "react";
import { Link } from "react-router-dom";
import { ConfigField } from "../components/ConfigField";
import { NumberInput } from "../components/NumberInput";
import { useAutoDismiss } from "../hooks/useAutoDismiss";
import { useDashboardQuery } from "../hooks/useDashboardQuery";
import { useScrollToTop } from "../hooks/useScrollToTop";
import { useSettingsState } from "../hooks/useSettingsState";
import { useAuthStore } from "../stores/authStore";
import type { SectionLayout } from "../types";
import { getDeviceId } from "../utils/deviceId";

export function Settings() {
  const deviceId = getDeviceId();
  const logout = useAuthStore(s => s.logout);
  const { state: dashboardState, updateState } = useDashboardQuery();
  const settings = useSettingsState(deviceId, dashboardState, updateState);
  const scrollRef = useRef<HTMLDivElement>(null);
  const showScrollTop = useScrollToTop(scrollRef);
  useAutoDismiss(settings.message, () => settings.setMessage(null));

  const { state } = settings;

  if (!state) {
    return <div className="settings settings--loading">Loading…</div>;
  }

  return (
    <>
      <div ref={scrollRef} className={`settings theme-${state.globalSettings.theme}`}>
        <header className="settings__header">
          <h1>Settings</h1>
          <div className="settings__header-actions">
            <Link to="/" className="settings__back">
              ← Back
            </Link>
            <button
              type="button"
              className="settings__logout"
              aria-label="Logout"
              onClick={() => logout()}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="settings__section">
          <h2>Global</h2>
          <label className="settings__field">
            Theme
            <select
              value={state.globalSettings.theme}
              onChange={e =>
                settings.setState({
                  ...state,
                  globalSettings: {
                    ...state.globalSettings,
                    theme: e.target.value as "dark" | "light",
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
            <NumberInput
              min={10}
              value={state.globalSettings.defaultRefreshInterval}
              onChange={n =>
                settings.setState({
                  ...state,
                  globalSettings: {
                    ...state.globalSettings,
                    defaultRefreshInterval: n,
                  },
                })
              }
            />
          </label>
          <label className="settings__field">
            Orientation
            <select
              value={state.globalSettings.orientation ?? "auto"}
              onChange={e =>
                settings.setState({
                  ...state,
                  globalSettings: {
                    ...state.globalSettings,
                    orientation: e.target.value as "auto" | "portrait" | "landscape",
                  },
                })
              }
            >
              <option value="auto">Auto (follows device)</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>
          <label className="settings__field">
            Auto-rotate groups (seconds)
            <NumberInput
              min={0}
              step={1}
              value={state.globalSettings.autoRotateInterval ?? 0}
              onChange={n =>
                settings.setState({
                  ...state,
                  globalSettings: {
                    ...state.globalSettings,
                    autoRotateInterval: Math.max(0, n),
                  },
                })
              }
            />
            <small>0 = disabled. Cycles through groups with widgets automatically.</small>
          </label>

          <h2>Sleep Time</h2>
          <label className="settings__field settings__field--checkbox">
            <input
              type="checkbox"
              checked={state.globalSettings.sleepTimeEnabled}
              onChange={e =>
                settings.setState({
                  ...state,
                  globalSettings: {
                    ...state.globalSettings,
                    sleepTimeEnabled: e.target.checked,
                  },
                })
              }
            />
            Enable sleep time (black screen, pauses all activity)
          </label>

          {state.globalSettings.sleepTimeEnabled && (
            <div className="settings__sleep-row">
              <label className="settings__field">
                Start
                <div className="settings__sleep-time">
                  <NumberInput
                    min={0}
                    max={23}
                    value={state.globalSettings.sleepStartHour}
                    onChange={n =>
                      settings.setState({
                        ...state,
                        globalSettings: {
                          ...state.globalSettings,
                          sleepStartHour: Math.max(0, Math.min(23, n)),
                        },
                      })
                    }
                  />
                  <span>:</span>
                  <NumberInput
                    min={0}
                    max={59}
                    value={state.globalSettings.sleepStartMinute}
                    onChange={n =>
                      settings.setState({
                        ...state,
                        globalSettings: {
                          ...state.globalSettings,
                          sleepStartMinute: Math.max(0, Math.min(59, n)),
                        },
                      })
                    }
                  />
                </div>
              </label>
              <label className="settings__field">
                End
                <div className="settings__sleep-time">
                  <NumberInput
                    min={0}
                    max={23}
                    value={state.globalSettings.sleepEndHour}
                    onChange={n =>
                      settings.setState({
                        ...state,
                        globalSettings: {
                          ...state.globalSettings,
                          sleepEndHour: Math.max(0, Math.min(23, n)),
                        },
                      })
                    }
                  />
                  <span>:</span>
                  <NumberInput
                    min={0}
                    max={59}
                    value={state.globalSettings.sleepEndMinute}
                    onChange={n =>
                      settings.setState({
                        ...state,
                        globalSettings: {
                          ...state.globalSettings,
                          sleepEndMinute: Math.max(0, Math.min(59, n)),
                        },
                      })
                    }
                  />
                </div>
              </label>
            </div>
          )}
        </section>

        <section className="settings__section">
          <h2>Sections</h2>
          <div className="settings__sections-list">
            {state.sections.map(section => (
              <div key={section.id} className="settings__section-item">
                <div className="settings__section-item-left">
                  <span className="settings__section-name">{section.name}</span>
                  <select
                    className="settings__layout-select"
                    value={section.layout ?? "full-width"}
                    onChange={e =>
                      void settings.handleSetLayout(
                        section.id,
                        e.target.value as SectionLayout,
                      )
                    }
                  >
                    <option value="full-width">Full width</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="left-full-height">Left + Full height</option>
                    <option value="right-full-height">Right + Full height</option>
                  </select>
                  <select
                    className="settings__layout-select"
                    value={section.group ?? ""}
                    onChange={e =>
                      void settings.handleSetSectionGroup(
                        section.id,
                        e.target.value === "" ? undefined : Number(e.target.value),
                      )
                    }
                  >
                    <option value="">No group</option>
                    <option value="1">Group 1</option>
                    <option value="2">Group 2</option>
                    <option value="3">Group 3</option>
                    <option value="4">Group 4</option>
                    <option value="5">Group 5</option>
                    <option value="6">Group 6</option>
                    <option value="7">Group 7</option>
                    <option value="8">Group 8</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="settings__remove-btn"
                  onClick={() => void settings.handleDeleteSection(section.id)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="settings__add-btn"
              onClick={() => void settings.handleAddSection()}
            >
              + Section
            </button>
          </div>
        </section>

        <section className="settings__section">
          <h2>Widgets</h2>
          <div className="settings__add-widgets">
            {settings.registry.map(def => (
              <button
                key={def.type}
                type="button"
                className="settings__add-btn"
                onClick={() => settings.addWidget(def.type)}
              >
                + {def.name}
              </button>
            ))}
          </div>

          {state.sections.map(section => {
            const sectionWidgets = state.widgets.filter(w => w.section === section.id);
            if (sectionWidgets.length === 0) return null;
            return (
              <div key={section.id} className="settings__section-group">
                <h3 className="settings__section-group-title">{section.name}</h3>
                {sectionWidgets.map(widget => {
                  const def = settings.registry.find(r => r.type === widget.type);
                  return (
                    <div key={widget.id} className="settings__widget-card">
                      <div className="settings__widget-header">
                        <h3>{def?.name ?? widget.type}</h3>
                        <div className="settings__widget-actions">
                          {state.sections.length > 1 && (
                            <select
                              className="settings__section-select"
                              value={widget.section}
                              onChange={e =>
                                settings.changeWidgetSection(widget.id, e.target.value)
                              }
                            >
                              {state.sections.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          )}
                          <button
                            type="button"
                            onClick={() => settings.moveWidget(widget.id, -1)}
                            aria-label="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => settings.moveWidget(widget.id, 1)}
                            aria-label="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="settings__remove-btn"
                            onClick={() => settings.removeWidget(widget.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      {def?.configSchema.map(field => (
                        <ConfigField
                          key={field.key}
                          field={field}
                          value={widget.config[field.key]}
                          mask={settings.keyMasks[`${widget.id}:${field.key}`]}
                          onChange={val =>
                            settings.updateWidgetConfig(widget.id, field.key, val)
                          }
                          onSecretSave={val =>
                            void settings.handleSecretSave(widget.id, field.key, val)
                          }
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>
      </div>

      <div className="settings__bottom-bar">
        <button
          type="button"
          className="settings__save-btn"
          onClick={() => void settings.handleSave()}
          disabled={settings.saving}
        >
          {settings.saving ? "Saving…" : "Save"}
        </button>
        {settings.message && (
          <div
            className={`settings__toast ${settings.message.includes("fail") || settings.message.includes("Invalid") ? "settings__toast--error" : ""}`}
          >
            {settings.message}
          </div>
        )}
        <button
          type="button"
          className={`settings__scroll-top${showScrollTop ? "" : " settings__scroll-top--hidden"}`}
          aria-label="Scroll to top"
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ↑
        </button>
      </div>
    </>
  );
}
