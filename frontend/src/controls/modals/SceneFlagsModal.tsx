import { useMemo, useState, useCallback } from 'react';
import { Check, Star, Ban, Minus, Plus, X } from 'lucide-react';
import '../../SimulatorPage.scss'; // reuses modal-overlay
import './SceneFlagsModal.scss';
import { Button } from '../../components/Button';
import { disqualifyReason, sceneScore } from '../../simulatorScenes';
import type { SceneFlagDeclarations, ScoredFlagEntry, FlagDefinition } from '@livewallpaper/types';

/** Scored-flag weights are stepped within this range and shown signed (e.g. +3, -2, 0). */
const WEIGHT_MIN = -100;
const WEIGHT_MAX = 100;

/** Context the modal needs to evaluate the draft against the current simulated world. */
export interface SceneFlagsLiveEval {
  activeFlags: Set<string>;
  /** Resolves a flag id to its display name (falls back to the id). */
  flagName: (id: string) => string;
  /** Short world-state note shown at the top-right of the Result strip, e.g. "day 8 · 21:30". */
  stateNote: string;
}

interface SceneFlagsModalProps {
  sceneName: string;
  flags: FlagDefinition[];
  declarations: SceneFlagDeclarations;
  /** When supplied (the Simulator), the Result strip evaluates eligibility + score live. */
  liveEval?: SceneFlagsLiveEval;
  onSave: (declarations: SceneFlagDeclarations) => void;
  onClose: () => void;
}

const signWeight = (w: number) => (w > 0 ? `+${w}` : `${w}`);

/** Build the persisted shape, dropping empty gates and rows with no flag selected. */
function buildDeclarations(
  required: string[],
  scored: ScoredFlagEntry[],
  excluded: string[],
): SceneFlagDeclarations {
  const req = required.filter(Boolean);
  const exc = excluded.filter(Boolean);
  const sco = scored.filter(e => e.flagId);
  const result: SceneFlagDeclarations = {};
  if (req.length > 0) result.required = req;
  if (sco.length > 0) result.scored = sco;
  if (exc.length > 0) result.excluded = exc;
  return result;
}

/** The flag picker shared by every gate row — a mono-styled select over the project's flags. */
function FlagSelect({
  value,
  flags,
  disabledIds,
  onChange,
}: {
  value: string;
  flags: FlagDefinition[];
  disabledIds: Set<string>;
  onChange: (flagId: string) => void;
}) {
  return (
    <select
      className="scene-flags-modal__flag-select"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">— select flag —</option>
      {flags.map(f => (
        <option key={f.id} value={f.id} disabled={f.id !== value && disabledIds.has(f.id)}>
          {f.name || f.id}
        </option>
      ))}
    </select>
  );
}

function WeightStepper({ weight, onChange }: { weight: number; onChange: (w: number) => void }) {
  const clamp = (w: number) => Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, w));
  return (
    <div className="scene-flags-modal__stepper">
      <button
        type="button"
        className="scene-flags-modal__step"
        onClick={() => onChange(clamp(weight - 1))}
        aria-label="Decrease weight"
      >
        <Minus size={14} strokeWidth={2} />
      </button>
      <span className="scene-flags-modal__weight">{signWeight(weight)}</span>
      <button
        type="button"
        className="scene-flags-modal__step"
        onClick={() => onChange(clamp(weight + 1))}
        aria-label="Increase weight"
      >
        <Plus size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="scene-flags-modal__remove"
      onClick={onClick}
      aria-label="Remove flag"
    >
      <X size={13} strokeWidth={2} />
    </button>
  );
}

/** One gate mark in the Result summary: a green check (pass) or red cross (fail). */
function GateMark({ ok }: { ok: boolean }) {
  return (
    <span className={`scene-flags-modal__mark scene-flags-modal__mark--${ok ? 'ok' : 'fail'}`}>
      {ok ? <Check size={12} strokeWidth={2.5} /> : <X size={12} strokeWidth={2.5} />}
    </span>
  );
}

function LiveResult({
  required,
  scored,
  excluded,
  liveEval,
}: {
  required: string[];
  scored: ScoredFlagEntry[];
  excluded: string[];
  liveEval: SceneFlagsLiveEval;
}) {
  const { activeFlags, flagName, stateNote } = liveEval;
  const draft = useMemo(
    () => buildDeclarations(required, scored, excluded),
    [required, scored, excluded],
  );

  const reason = disqualifyReason(draft, { activeFlags, flagName });
  const eligible = reason === null;
  const score = sceneScore(draft, activeFlags);

  const hasRequire = (draft.required?.length ?? 0) > 0;
  const hasExclude = (draft.excluded?.length ?? 0) > 0;
  const missingRequire = draft.required?.find(id => !activeFlags.has(id));
  const activeExclude = draft.excluded?.find(id => activeFlags.has(id));

  return (
    <div className="scene-flags-modal__result">
      <div className="scene-flags-modal__result-head">
        <span className="scene-flags-modal__result-label">Result at current world-state</span>
        <span className="scene-flags-modal__result-note">{stateNote}</span>
      </div>
      <div className="scene-flags-modal__result-body">
        <span
          className={`scene-flags-modal__badge scene-flags-modal__badge--${eligible ? 'eligible' : 'hidden'}`}
        >
          {eligible ? 'Eligible' : 'Hidden'}
        </span>
        <span className="scene-flags-modal__summary">
          {!hasRequire && !hasExclude && 'no gates'}
          {hasRequire && (
            <>
              Require <GateMark ok={!missingRequire} />
              {missingRequire && ` needs ${flagName(missingRequire)}`}
            </>
          )}
          {hasRequire && hasExclude && ' · '}
          {hasExclude && (
            <>
              Exclude <GateMark ok={!activeExclude} />
              {activeExclude ? ` blocked by ${flagName(activeExclude)}` : ' none on'}
            </>
          )}
        </span>
        <span className="scene-flags-modal__score">
          score <b>{score}</b>
        </span>
      </div>
    </div>
  );
}

export function SceneFlagsModal({
  sceneName,
  flags,
  declarations,
  liveEval,
  onSave,
  onClose,
}: SceneFlagsModalProps) {
  const [required, setRequired] = useState<string[]>(declarations.required ?? []);
  const [excluded, setExcluded] = useState<string[]>(declarations.excluded ?? []);
  const [scored, setScored] = useState<ScoredFlagEntry[]>(declarations.scored ?? []);

  // A flag may sit in only one gate at a time; disabling it everywhere else keeps a scene from
  // requiring and excluding the same flag (a contradiction) or scoring it twice.
  const usedIds = useMemo(() => {
    const s = new Set<string>();
    required.forEach(id => id && s.add(id));
    excluded.forEach(id => id && s.add(id));
    scored.forEach(e => e.flagId && s.add(e.flagId));
    return s;
  }, [required, excluded, scored]);

  const firstUnusedFlag = () => flags.find(f => !usedIds.has(f.id))?.id ?? '';

  const addRequired = () => setRequired([...required, firstUnusedFlag()]);
  const addExcluded = () => setExcluded([...excluded, firstUnusedFlag()]);
  const addScored = () => setScored([...scored, { flagId: firstUnusedFlag(), weight: 1 }]);

  const canAdd = flags.some(f => !usedIds.has(f.id));

  const handleSave = useCallback(() => {
    onSave(buildDeclarations(required, scored, excluded));
  }, [required, scored, excluded, onSave]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="scene-flags-modal" onClick={e => e.stopPropagation()}>
        <div className="scene-flags-modal__header">
          <span className="scene-flags-modal__accent" />
          <span className="scene-flags-modal__title">Scene Flags</span>
          <span className="scene-flags-modal__scene">— {sceneName}</span>
          <button
            type="button"
            className="scene-flags-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>

        <div className="scene-flags-modal__body">
          {/* Require — AND gate */}
          <div className="scene-flags-modal__gate scene-flags-modal__gate--require">
            <div className="scene-flags-modal__rail" />
            <div className="scene-flags-modal__gate-content">
              <div className="scene-flags-modal__gate-head">
                <Check size={12} strokeWidth={2.5} className="scene-flags-modal__gate-icon" />
                <span className="scene-flags-modal__gate-label">Require</span>
                <span className="scene-flags-modal__gate-helper">— all must be active</span>
              </div>
              {required.map((id, i) => (
                <div key={i} className="scene-flags-modal__row">
                  <FlagSelect
                    value={id}
                    flags={flags}
                    disabledIds={usedIds}
                    onChange={next => setRequired(required.map((v, j) => (j === i ? next : v)))}
                  />
                  <RemoveButton onClick={() => setRequired(required.filter((_, j) => j !== i))} />
                </div>
              ))}
              <button
                type="button"
                className="scene-flags-modal__add"
                onClick={addRequired}
                disabled={!canAdd}
              >
                + Require flag
              </button>
            </div>
          </div>

          {/* Score — weighted sum */}
          <div className="scene-flags-modal__gate scene-flags-modal__gate--score">
            <div className="scene-flags-modal__rail" />
            <div className="scene-flags-modal__gate-content">
              <div className="scene-flags-modal__gate-head">
                <Star size={12} strokeWidth={2.5} className="scene-flags-modal__gate-icon" />
                <span className="scene-flags-modal__gate-label">Score</span>
                <span className="scene-flags-modal__gate-helper">— active flags add weight</span>
              </div>
              {scored.map((entry, i) => (
                <div key={i} className="scene-flags-modal__row">
                  <FlagSelect
                    value={entry.flagId}
                    flags={flags}
                    disabledIds={usedIds}
                    onChange={next =>
                      setScored(scored.map((e, j) => (j === i ? { ...e, flagId: next } : e)))
                    }
                  />
                  <WeightStepper
                    weight={entry.weight}
                    onChange={w => setScored(scored.map((e, j) => (j === i ? { ...e, weight: w } : e)))}
                  />
                  <RemoveButton onClick={() => setScored(scored.filter((_, j) => j !== i))} />
                </div>
              ))}
              <button
                type="button"
                className="scene-flags-modal__add"
                onClick={addScored}
                disabled={!canAdd}
              >
                + Score flag
              </button>
            </div>
          </div>

          {/* Exclude — NOR gate */}
          <div className="scene-flags-modal__gate scene-flags-modal__gate--exclude">
            <div className="scene-flags-modal__rail" />
            <div className="scene-flags-modal__gate-content">
              <div className="scene-flags-modal__gate-head">
                <Ban size={12} strokeWidth={2.5} className="scene-flags-modal__gate-icon" />
                <span className="scene-flags-modal__gate-label">Exclude</span>
                <span className="scene-flags-modal__gate-helper">— any active hides the scene</span>
              </div>
              {excluded.map((id, i) => (
                <div key={i} className="scene-flags-modal__row">
                  <FlagSelect
                    value={id}
                    flags={flags}
                    disabledIds={usedIds}
                    onChange={next => setExcluded(excluded.map((v, j) => (j === i ? next : v)))}
                  />
                  <RemoveButton onClick={() => setExcluded(excluded.filter((_, j) => j !== i))} />
                </div>
              ))}
              <button
                type="button"
                className="scene-flags-modal__add"
                onClick={addExcluded}
                disabled={!canAdd}
              >
                + Exclude flag
              </button>
            </div>
          </div>

          {liveEval && (
            <LiveResult
              required={required}
              scored={scored}
              excluded={excluded}
              liveEval={liveEval}
            />
          )}
        </div>

        <div className="scene-flags-modal__footer">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            Save flags
          </Button>
        </div>
      </div>
    </div>
  );
}
