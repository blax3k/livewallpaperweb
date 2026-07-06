import { useState, useEffect, useMemo } from 'react';
import './SimulatorPage.scss';
import { PageLayout, PageHeader, PageBody } from './components/PageLayout';
import { Button } from './components/Button';
import { rulesApi, flagsApi, type RuleDefinition, type FlagDefinition } from './api';
import type { RuleCondition } from '@livewallpaper/types';

interface SimulatorPageProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number | undefined): string {
  return String(n ?? 0).padStart(2, '0');
}

function flagLabel(flagId: string | undefined, flagsById: Map<string, FlagDefinition>): string {
  if (!flagId) return '(no flag)';
  return flagsById.get(flagId)?.name || flagId;
}

function summarizeCondition(c: RuleCondition, flagsById: Map<string, FlagDefinition>): string {
  switch (c.type) {
    case 'flag_active': return `${flagLabel(c.flagId, flagsById)} active`;
    case 'flag_inactive': return `${flagLabel(c.flagId, flagsById)} inactive`;
    case 'time_of_day': return `time ${pad(c.startHour)}:00–${pad(c.endHour)}:00`;
    case 'day_of_week': return `day ${(c.daysOfWeek ?? []).map(d => DAY_LABELS[d]).join(',') || '—'}`;
    case 'scene_count': return `scene views ${c.operator ?? '>='} ${c.intValue ?? 0}`;
    case 'install_duration_hours': return `install age ${c.operator ?? '>='} ${c.intValue ?? 0}h`;
    case 'time_since_flag_change': return `${flagLabel(c.flagId, flagsById)} ${c.flagChangeType ?? 'activated'} ${c.operator ?? '>='} ${c.intValue ?? 0}h ago`;
    default: return c.type;
  }
}

function summarizeConditions(rule: RuleDefinition, flagsById: Map<string, FlagDefinition>): string {
  const group = rule.conditions;
  if (!group || group.checks.length === 0) return 'always';
  const joiner = group.operator === 'OR' ? ' or ' : ' + ';
  return group.checks.map(c => summarizeCondition(c, flagsById)).join(joiner);
}

function summarizeActions(rule: RuleDefinition, flagsById: Map<string, FlagDefinition>): string {
  if (rule.actions.length === 0) return '—';
  return rule.actions
    .map(a => `${a.type === 'deactivate_flag' ? '¬' : ''}${flagLabel(a.flagId, flagsById)}`)
    .join(', ');
}

function CollapsibleGroup({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="simulator-group">
      <div className="simulator-group__header" onClick={() => setOpen(o => !o)}>
        <span className="simulator-group__caret">{open ? '▾' : '▸'}</span>
        {title}
        <span className="simulator-group__count">· {count}</span>
      </div>
      {open && children}
    </div>
  );
}

export function SimulatorPage({ projectId, projectName, onBack }: SimulatorPageProps) {
  const [rules, setRules] = useState<RuleDefinition[]>([]);
  const [flags, setFlags] = useState<FlagDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<'least_shown' | 'points'>('least_shown');

  useEffect(() => {
    Promise.all([rulesApi.list(projectId), flagsApi.list(projectId)])
      .then(([r, f]) => { setRules(r); setFlags(f); setLoading(false); })
      .catch(err => { setError(String(err)); setLoading(false); });
  }, [projectId]);

  const flagsById = useMemo(() => new Map(flags.map(f => [f.id, f])), [flags]);

  return (
    <PageLayout>
      <PageHeader title={`${projectName} — Simulator`} left={<Button onClick={onBack}>←</Button>} />
      <PageBody>
        {loading && <p style={{ padding: 'var(--size-16)' }}>Loading…</p>}
        {error && <p style={{ padding: 'var(--size-16)', color: 'var(--color-danger)' }}>{error}</p>}
        {!loading && (
          <div className="simulator-root">
            {/* ===== Simulated State: HUD + spine + engagement + ambient ===== */}
            <div className="simulator-state">
              <div className="simulator-hud">
                <span className="simulator-hud__title"><span className="simulator-hud__dot" />Simulated state</span>
                <span className="simulator-hud__divider" />
                <span className="simulator-hud__stat">Chapter <b>2 · The Deep Wood</b></span>
                <span className="simulator-hud__divider" />
                <span className="simulator-hud__stat">Ambient <b>Night · Tue</b></span>
                <span className="simulator-hud__divider" />
                <span className="simulator-hud__stat">Active days <b>8</b> · Wakes <b>34</b></span>
                <div className="simulator-hud__tabs">
                  <span className="simulator-hud__tab simulator-hud__tab--active">Simulator</span>
                  <span className="simulator-hud__tab" onClick={onBack}>Scene editor <span>▸</span></span>
                </div>
              </div>

              <div className="simulator-spine">
                <span className="simulator-spine__label">Spine <span>· 2/14</span></span>
                <div className="simulator-spine__track">
                  <div className="simulator-spine__node simulator-spine__node--done">1</div>
                  <div className="simulator-spine__node simulator-spine__node--current">
                    <span className="simulator-spine__node-num">2</span>
                    <span className="simulator-spine__node-name">The Deep Wood</span>
                    <span className="simulator-spine__node-here">★ here</span>
                  </div>
                  {[3, 4, 5, 6, 7, 8].map(n => (
                    <div key={n} className="simulator-spine__node simulator-spine__node--locked">{n}</div>
                  ))}
                  <div className="simulator-spine__node simulator-spine__node--overflow">+6</div>
                </div>
                <span className="simulator-spine__add">+ Chapter</span>
              </div>

              <div className="simulator-engagement-ambient">
                <div className="simulator-column simulator-column--divided">
                  <div className="simulator-column__title">Engagement <span>fuels progression · idle never advances</span></div>
                  <div className="simulator-column__fields">
                    <Stepper label="Active days" value={8} />
                    <Stepper label="Total wakes" value={34} />
                    <Stepper label="Forest views" value={5} />
                  </div>
                </div>
                <div className="simulator-column">
                  <div className="simulator-column__title">Ambient <span>mood · re-checked every wake</span></div>
                  <div className="simulator-column__fields">
                    <DropdownField label="Time of day" value="21:30 · Night" />
                    <DropdownField label="Weekday" value="Tue" />
                    <DropdownField label="Persona" value="Power user" />
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Rule Pipeline: rules -> flags -> preview ===== */}
            <div className="simulator-pipeline">
              <div className="simulator-pipeline__header">
                <span className="simulator-pipeline__title">Rule pipeline</span>
                <span className="simulator-pipeline__hint">rules set flags → flags pick the scene · resolved at each wake</span>
              </div>
              <div className="simulator-pipeline__row">
                {/* RULES */}
                <div className="simulator-panel simulator-panel--rules">
                  <div className="simulator-panel__header">
                    <span>Rules · {rules.length}</span>
                    <span className="simulator-panel__search">⌕</span>
                  </div>
                  <CollapsibleGroup title="RULES" count={rules.length}>
                    {rules.length === 0 && <p className="simulator-empty">No rules defined.</p>}
                    {rules.map(rule => (
                      <div className="simulator-rule-row" key={rule.id}>
                        {rule.oneShot
                          ? <span className="simulator-rule-row__lock">🔒</span>
                          : <span className="simulator-rule-row__dot" />}
                        <span className="simulator-rule-row__condition">{summarizeConditions(rule, flagsById)}</span>
                        <span className="simulator-rule-row__flag">{summarizeActions(rule, flagsById)}</span>
                      </div>
                    ))}
                  </CollapsibleGroup>
                  <span className="simulator-new-rule">+ New rule</span>
                </div>

                <Arrow />

                {/* FLAGS */}
                <div className="simulator-panel simulator-panel--flags">
                  <div className="simulator-panel__header">
                    <span>Flags · {flags.length}</span>
                  </div>
                  <CollapsibleGroup title="FLAGS" count={flags.length}>
                    {flags.length === 0 && <p className="simulator-empty">No flags defined.</p>}
                    <div className="simulator-chip-row">
                      {flags.map(flag => (
                        <span key={flag.id} className={`simulator-chip ${flag.defaultActive ? 'simulator-chip--on' : 'simulator-chip--off'}`}>
                          <span className="simulator-chip__dot" />
                          <span>{flag.name || flag.id}</span>
                        </span>
                      ))}
                    </div>
                  </CollapsibleGroup>
                  <div className="simulator-flag-info">
                    <div className="simulator-flag-info__selected">selected: forest_regular</div>
                    <div className="simulator-flag-info__link">drives 3 sprites · 2 scenes ▸</div>
                  </div>
                </div>

                <Arrow />

                {/* PREVIEW */}
                <div className="simulator-panel simulator-panel--preview">
                  <div className="simulator-panel__header">
                    <span>Preview</span>
                    <span className="simulator-panel__hint">composited · real sprites</span>
                  </div>
                  <div className="simulator-preview-body">
                    <div className="simulator-phone-wrap">
                      <div className="simulator-phone">
                        <div className="simulator-phone__bezel" />
                        <span className="simulator-phone__badge">ON SCREEN</span>
                        <div className="simulator-phone__sprite simulator-phone__sprite--tree">tree</div>
                        <div className="simulator-phone__sprite simulator-phone__sprite--fox">fox</div>
                        <div className="simulator-phone__sprite simulator-phone__sprite--aurora">aurora band</div>
                        <span className="simulator-phone__scene-name">Aurora Forest</span>
                      </div>
                      <div className="simulator-edit-scene-link">✎ Edit scene ▸</div>
                    </div>
                    <div className="simulator-selection-list">
                      <span className="simulator-qualify-caption">3 qualify at this wake</span>
                      <div className="simulator-order-toggle">
                        <span>Order by</span>
                        <span
                          className={`simulator-order-toggle__option ${orderBy === 'least_shown' ? 'simulator-order-toggle__option--active' : ''}`}
                          onClick={() => setOrderBy('least_shown')}
                        >
                          Least shown
                        </span>
                        <span
                          className={`simulator-order-toggle__option ${orderBy === 'points' ? 'simulator-order-toggle__option--active' : ''}`}
                          onClick={() => setOrderBy('points')}
                        >
                          Points
                        </span>
                      </div>
                      <div className="simulator-scene-row simulator-scene-row--wins">
                        <span className="simulator-scene-row__badge">WINS</span>
                        <span className="simulator-scene-row__name">Aurora Forest</span>
                        <span className="simulator-scene-row__value">3×</span>
                      </div>
                      <div className="simulator-scene-row">
                        <span className="simulator-scene-row__badge">#2</span>
                        <span className="simulator-scene-row__name">Night City</span>
                        <span className="simulator-scene-row__value">12×</span>
                      </div>
                      <div className="simulator-scene-row simulator-scene-row--out">
                        <span className="simulator-scene-row__badge">OUT</span>
                        <span className="simulator-scene-row__name">Day Forest</span>
                        <span className="simulator-scene-row__reason">needs day</span>
                      </div>
                    </div>
                  </div>
                  <div className="simulator-stale-banner">
                    <span>⟳</span>
                    <span>Stale — re-picked only on wake</span>
                  </div>
                  <div className="simulator-wake-button">◐ Wake screen — pick a scene now</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageBody>
    </PageLayout>
  );
}

function Stepper({ label, value }: { label: string; value: number }) {
  return (
    <div className="simulator-field">
      <span className="simulator-field-label">{label}</span>
      <div className="simulator-stepper">
        <span className="simulator-stepper__btn">−</span>
        <span className="simulator-stepper__value">{value}</span>
        <span className="simulator-stepper__btn">+</span>
      </div>
    </div>
  );
}

function DropdownField({ label, value }: { label: string; value: string }) {
  return (
    <div className="simulator-field">
      <span className="simulator-field-label">{label}</span>
      <span className="simulator-dropdown-field">{value} ▾</span>
    </div>
  );
}

function Arrow() {
  return (
    <div className="simulator-arrow">
      <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
        <path d="M2 8 H17" stroke="#3f3f46" strokeWidth="1.5" />
        <path d="M13 3 L18 8 L13 13" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
