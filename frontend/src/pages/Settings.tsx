import { useContext, useRef } from "react";
import { Link } from "react-router-dom";
import styled, { css, keyframes } from "styled-components";
import { ConfigField } from "../components/ConfigField";
import { NumberInput } from "../components/NumberInput";
import { useAutoDismiss } from "../hooks/useAutoDismiss";
import { useDashboardQuery } from "../hooks/useDashboardQuery";
import { useScrollToTop } from "../hooks/useScrollToTop";
import { useSettingsState } from "../hooks/useSettingsState";
import { useAuthStore } from "../stores/authStore";
import { ThemeModeContext } from "../styles/theme";
import type { SectionLayout } from "../types";

export function Settings() {
  const logout = useAuthStore(s => s.logout);
  const { state: dashboardState, updateState } = useDashboardQuery();
  const settings = useSettingsState(dashboardState, updateState);
  const scrollRef = useRef<HTMLDivElement>(null);
  const showScrollTop = useScrollToTop(scrollRef);
  const { setThemeMode } = useContext(ThemeModeContext);
  useAutoDismiss(settings.message, () => settings.setMessage(null));

  const { state } = settings;

  const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const AVAILABLE_DAYS = [0, 1, 2, 3, 4, 5, 6];

  if (!state) {
    return <LoadingWrapper>Loading…</LoadingWrapper>;
  }

  const handleThemeChange = (theme: "dark" | "light") => {
    setThemeMode(theme);
    settings.setState({
      ...state,
      globalSettings: { ...state.globalSettings, theme },
    });
  };

  return (
    <>
      <Scroller ref={scrollRef}>
        <Header>
          <h1>Settings</h1>
          <HeaderActions>
            <BackLink to="/">← Back</BackLink>
            <LogoutBtn type="button" aria-label="Logout" onClick={() => logout()}>
              Logout
            </LogoutBtn>
          </HeaderActions>
        </Header>

        <Section>
          <h2>Global</h2>
          <FieldRow>
            Theme
            <select
              value={state.globalSettings.theme}
              onChange={e => handleThemeChange(e.target.value as "dark" | "light")}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </FieldRow>
          <FieldRow>
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
          </FieldRow>
          <FieldRow>
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
          </FieldRow>
          <FieldRow>
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
          </FieldRow>

          <h2>Sleep Time</h2>
          <CheckboxRow>
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
          </CheckboxRow>

          {state.globalSettings.sleepTimeEnabled && (
            <>
              <SleepRow>
                <FieldRow>
                  Start
                  <SleepTime>
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
                  </SleepTime>
                </FieldRow>
                <FieldRow>
                  End
                  <SleepTime>
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
                  </SleepTime>
                </FieldRow>
              </SleepRow>

              <DayOverridesSection>
                <DayOverridesTitle>Day Overrides</DayOverridesTitle>
                {Object.entries(state.globalSettings.sleepTimeDayOverrides ?? {}).map(
                  ([day, override]) => {
                    const dayNum = Number(day);
                    return (
                      <DayOverrideRow key={day}>
                        <DayLabel>{DAY_NAMES[dayNum]}</DayLabel>
                        <FieldRow>
                          Start
                          <SleepTime>
                            <NumberInput
                              min={0}
                              max={23}
                              value={override.sleepStartHour}
                              onChange={n =>
                                settings.setState({
                                  ...state,
                                  globalSettings: {
                                    ...state.globalSettings,
                                    sleepTimeDayOverrides: {
                                      ...state.globalSettings.sleepTimeDayOverrides,
                                      [dayNum]: {
                                        ...override,
                                        sleepStartHour: Math.max(0, Math.min(23, n)),
                                      },
                                    },
                                  },
                                })
                              }
                            />
                            <span>:</span>
                            <NumberInput
                              min={0}
                              max={59}
                              value={override.sleepStartMinute}
                              onChange={n =>
                                settings.setState({
                                  ...state,
                                  globalSettings: {
                                    ...state.globalSettings,
                                    sleepTimeDayOverrides: {
                                      ...state.globalSettings.sleepTimeDayOverrides,
                                      [dayNum]: {
                                        ...override,
                                        sleepStartMinute: Math.max(0, Math.min(59, n)),
                                      },
                                    },
                                  },
                                })
                              }
                            />
                          </SleepTime>
                        </FieldRow>
                        <FieldRow>
                          End
                          <SleepTime>
                            <NumberInput
                              min={0}
                              max={23}
                              value={override.sleepEndHour}
                              onChange={n =>
                                settings.setState({
                                  ...state,
                                  globalSettings: {
                                    ...state.globalSettings,
                                    sleepTimeDayOverrides: {
                                      ...state.globalSettings.sleepTimeDayOverrides,
                                      [dayNum]: {
                                        ...override,
                                        sleepEndHour: Math.max(0, Math.min(23, n)),
                                      },
                                    },
                                  },
                                })
                              }
                            />
                            <span>:</span>
                            <NumberInput
                              min={0}
                              max={59}
                              value={override.sleepEndMinute}
                              onChange={n =>
                                settings.setState({
                                  ...state,
                                  globalSettings: {
                                    ...state.globalSettings,
                                    sleepTimeDayOverrides: {
                                      ...state.globalSettings.sleepTimeDayOverrides,
                                      [dayNum]: {
                                        ...override,
                                        sleepEndMinute: Math.max(0, Math.min(59, n)),
                                      },
                                    },
                                  },
                                })
                              }
                            />
                          </SleepTime>
                        </FieldRow>
                        <RemoveBtn
                          type="button"
                          onClick={() => {
                            const { [dayNum]: _, ...rest } =
                              state.globalSettings.sleepTimeDayOverrides ?? {};
                            settings.setState({
                              ...state,
                              globalSettings: {
                                ...state.globalSettings,
                                sleepTimeDayOverrides: rest,
                              },
                            });
                          }}
                        >
                          Remove
                        </RemoveBtn>
                      </DayOverrideRow>
                    );
                  },
                )}
                {AVAILABLE_DAYS.filter(
                  d => !(state.globalSettings.sleepTimeDayOverrides ?? {})[d],
                ).length > 0 && (
                  <AddDayBtnWrap>
                    <DaySelect
                      value=""
                      onChange={e => {
                        const dayNum = Number(e.target.value);
                        if (isNaN(dayNum)) return;
                        settings.setState({
                          ...state,
                          globalSettings: {
                            ...state.globalSettings,
                            sleepTimeDayOverrides: {
                              ...state.globalSettings.sleepTimeDayOverrides,
                              [dayNum]: {
                                sleepStartHour: state.globalSettings.sleepStartHour,
                                sleepStartMinute: state.globalSettings.sleepStartMinute,
                                sleepEndHour: state.globalSettings.sleepEndHour,
                                sleepEndMinute: state.globalSettings.sleepEndMinute,
                              },
                            },
                          },
                        });
                      }}
                    >
                      <option value="">+ Add day override</option>
                      {AVAILABLE_DAYS.filter(
                        d => !(state.globalSettings.sleepTimeDayOverrides ?? {})[d],
                      ).map(d => (
                        <option key={d} value={d}>
                          {DAY_NAMES[d]}
                        </option>
                      ))}
                    </DaySelect>
                  </AddDayBtnWrap>
                )}
              </DayOverridesSection>
            </>
          )}
        </Section>

        <Section>
          <h2>Sections</h2>
          <SectionsList>
            {state.sections.map(section => (
              <SectionItem key={section.id}>
                <SectionItemLeft>
                  <SectionName>{section.name}</SectionName>
                  <LayoutSelect
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
                  </LayoutSelect>
                  <LayoutSelect
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
                  </LayoutSelect>
                </SectionItemLeft>
                <RemoveBtn
                  type="button"
                  onClick={() => void settings.handleDeleteSection(section.id)}
                >
                  Remove
                </RemoveBtn>
              </SectionItem>
            ))}
            <AddBtn type="button" onClick={() => void settings.handleAddSection()}>
              + Section
            </AddBtn>
          </SectionsList>
        </Section>

        <Section>
          <h2>Widgets</h2>
          <AddWidgetsRow>
            {settings.registry.map(def => (
              <AddBtn
                key={def.type}
                type="button"
                onClick={() => settings.addWidget(def.type)}
              >
                + {def.name}
              </AddBtn>
            ))}
          </AddWidgetsRow>

          {state.sections.map(section => {
            const sectionWidgets = state.widgets.filter(w => w.section === section.id);
            if (sectionWidgets.length === 0) return null;
            return (
              <SectionGroup key={section.id}>
                <SectionGroupTitle>{section.name}</SectionGroupTitle>
                {sectionWidgets.map(widget => {
                  const def = settings.registry.find(r => r.type === widget.type);
                  return (
                    <WidgetCard key={widget.id}>
                      <WidgetHeader>
                        <h3>{def?.name ?? widget.type}</h3>
                        <WidgetActions>
                          {state.sections.length > 1 && (
                            <SectionSelect
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
                            </SectionSelect>
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
                          <RemoveBtn
                            type="button"
                            onClick={() => settings.removeWidget(widget.id)}
                          >
                            Remove
                          </RemoveBtn>
                        </WidgetActions>
                      </WidgetHeader>
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
                    </WidgetCard>
                  );
                })}
              </SectionGroup>
            );
          })}
        </Section>
      </Scroller>

      <BottomBar>
        <SaveBtn
          type="button"
          onClick={() => void settings.handleSave()}
          disabled={settings.saving}
        >
          {settings.saving ? "Saving…" : "Save"}
        </SaveBtn>
        {settings.message && (
          <Toast
            $error={
              settings.message.includes("fail") || settings.message.includes("Invalid")
            }
          >
            {settings.message}
          </Toast>
        )}
        <ScrollTopBtn
          type="button"
          $hidden={!showScrollTop}
          aria-label="Scroll to top"
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ↑
        </ScrollTopBtn>
      </BottomBar>
    </>
  );
}

const toastIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const toastOut = keyframes`
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(10px); }
`;

const LoadingWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

const Scroller = styled.div`
  height: 100%;
  padding: 10px calc(16px + env(safe-area-inset-right, 0px))
    calc(72px + env(safe-area-inset-bottom, 0px))
    calc(16px + env(safe-area-inset-left, 0px));
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;

  & h1 {
    margin: 0;
    font-size: 1.2rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const BackLink = styled(Link)`
  width: 90px;
  text-decoration: none;
  padding: 6px 14px;
  border: 1px solid ${({ theme }) => theme.accent};
  background: transparent;
  color: ${({ theme }) => theme.accent};
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
  display: inline-block;
  text-align: center;

  &:hover {
    background: ${({ theme }) => theme.accent};
    color: #fff;
  }
`;

const LogoutBtn = styled.button`
  padding: 6px 14px;
  border: 1px solid ${({ theme }) => theme.error};
  background: transparent;
  color: ${({ theme }) => theme.error};
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;

  &:hover {
    background: ${({ theme }) => theme.error};
    color: #fff;
  }
`;

const Section = styled.section`
  margin-bottom: 20px;

  & h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.textMuted};
    margin: 0 0 12px;
  }
`;

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

const SleepRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 12px;

  & ${FieldRow} {
    flex: 1;
  }
`;

const SleepTime = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;

  & input {
    width: 56px;
    text-align: center;
  }
`;

const RemoveBtn = styled.button`
  padding: 4px 8px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  cursor: pointer;
  color: ${({ theme }) => theme.error};
`;

const DayOverridesSection = styled.div``;

const DayOverridesTitle = styled.h3`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.textMuted};
  margin: 0 0 8px;
`;

const DayOverrideRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  background: ${({ theme }) => theme.bgCard};
  border: 1px solid ${({ theme }) => theme.border};
  padding: 8px 10px;

  & ${FieldRow} {
    margin-bottom: 0;
    flex: 1;
  }

  & ${RemoveBtn} {
    flex-shrink: 0;
  }
`;

const DayLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 70px;
  flex-shrink: 0;
`;

const AddDayBtnWrap = styled.div`
  display: flex;
  margin-top: 4px;
`;

const DaySelect = styled.select`
  padding: 6px 10px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.text};
  font-size: 0.8rem;
  cursor: pointer;
`;

const SectionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
`;

const SectionItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.bgCard};
  border: 1px solid ${({ theme }) => theme.border};
  padding: 8px 12px;
`;

const SectionItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SectionName = styled.span`
  font-size: 0.85rem;
  cursor: default;

  &:hover {
    text-decoration: underline dotted;
  }
`;

const LayoutSelect = styled.select`
  font-size: 0.7rem;
  padding: 2px 4px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.textMuted};
  cursor: pointer;
`;

const SectionGroup = styled.div`
  margin-bottom: 16px;
`;

const SectionGroupTitle = styled.h3`
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.accent};
  margin: 0 0 8px;
  font-weight: 600;
`;

const SectionSelect = styled.select`
  padding: 3px 6px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  font-size: 0.75rem;
  color: ${({ theme }) => theme.text};
`;

const AddWidgetsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
`;

const AddBtn = styled.button`
  padding: 6px 12px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  cursor: pointer;
  font-size: 0.8rem;
`;

const WidgetCard = styled.div`
  background: ${({ theme }) => theme.bgCard};
  border: 1px solid ${({ theme }) => theme.border};
  padding: 12px;
  margin-bottom: 10px;
`;

const WidgetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;

  & h3 {
    margin: 0;
    font-size: 0.95rem;
  }
`;

const WidgetActions = styled.div`
  display: flex;
  gap: 4px;

  & button {
    padding: 4px 8px;
    background: ${({ theme }) => theme.bgElevated};
    border: 1px solid ${({ theme }) => theme.border};
    cursor: pointer;
  }
`;

const BottomBar = styled.div`
  position: fixed;
  bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  left: calc(16px + env(safe-area-inset-left, 0px));
  right: calc(16px + env(safe-area-inset-right, 0px));
  display: flex;
  gap: 8px;
  z-index: 20;
  justify-content: space-between;
  align-items: center;
`;

const SaveBtn = styled.button`
  width: 90px;
  padding: 6px 14px;
  background: ${({ theme }) => theme.accent};
  color: #fff;
  border: 1px solid ${({ theme }) => theme.accent};
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:disabled {
    opacity: 0.6;
  }
`;

const Toast = styled.div<{ $error: boolean }>`
  flex: 1;
  margin: 0 8px;
  padding: 10px 16px;
  background: ${({ $error, theme }) => ($error ? theme.error : theme.success)};
  color: ${({ $error }) => ($error ? "#fff" : "#0a0a0f")};
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  animation:
    ${toastIn} 0.25s ease,
    ${toastOut} 0.5s ease 3.5s forwards;
`;

const ScrollTopBtn = styled.button<{ $hidden: boolean }>`
  flex: 0 0 auto;
  padding: 6px 14px;
  border: 1px solid ${({ theme }) => theme.accent};
  background: ${({ theme }) => theme.accent};
  color: #fff;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:active {
    opacity: 0.8;
  }

  ${({ $hidden }) =>
    $hidden &&
    css`
      visibility: hidden;
      pointer-events: none;
    `}
`;
