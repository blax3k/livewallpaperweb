import { RotateCcw, ChevronDown } from 'lucide-react';
import type { FlagDefinition } from './api';
import { TIME_OPTIONS, DAY_OPTIONS } from './useSimulatedState';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './components/ui/dropdown-menu';

// How many chapters render as inline spine pills before the rest collapse into the
// "+N" overflow menu. Matches the sketch (1–8, then +N).
const MAX_VISIBLE_CHAPTERS = 8;

interface SimulatorControlsPanelProps {
  chapters: FlagDefinition[];
  currentChapterId: string | null;
  onSelectChapter: (id: string) => void;
  onNewChapter: () => void;
  onRemoveChapter: (chapter: FlagDefinition) => void;
  timeOfDay: string;
  onTimeOfDayChange: (v: string) => void;
  dayOfWeek: string;
  onDayOfWeekChange: (v: string) => void;
  daysSinceInstall: number;
  onDaysSinceInstallChange: (v: number | ((prev: number) => number)) => void;
  totalWakes: number;
  onTotalWakesChange: (v: number | ((prev: number) => number)) => void;
  onReset: () => void;
}

export function SimulatorControlsPanel({
  chapters,
  currentChapterId,
  onSelectChapter,
  onNewChapter,
  onRemoveChapter,
  timeOfDay,
  onTimeOfDayChange,
  dayOfWeek,
  onDayOfWeekChange,
  daysSinceInstall,
  onDaysSinceInstallChange,
  totalWakes,
  onTotalWakesChange,
  onReset,
}: SimulatorControlsPanelProps) {
  const currentChapter = chapters.find(c => c.id === currentChapterId) ?? null;
  const currentIndex = currentChapter ? chapters.indexOf(currentChapter) : -1;
  const visible = chapters.slice(0, MAX_VISIBLE_CHAPTERS);
  const overflow = chapters.slice(MAX_VISIBLE_CHAPTERS);

  return (
    <div className="simulator-controls">
      {/* ── SPINE: chapter progression ─────────────────────────────────────── */}
      <div className="simulator-spine">
        <span className="simulator-spine__label">
          SPINE · {currentIndex >= 0 ? currentIndex + 1 : 0}/{chapters.length}
        </span>

        <div className="simulator-spine__pills">
          {visible.map((chapter, i) => {
            const isCurrent = chapter.id === currentChapterId;
            return (
              <button
                key={chapter.id}
                className={`simulator-chip ${isCurrent ? 'simulator-chip--current' : ''}`}
                onClick={() => onSelectChapter(chapter.id)}
              >
                <span className="simulator-chip__num">{i + 1}</span>
                {isCurrent && (
                  <>
                    <span className="simulator-chip__name">{chapter.name || chapter.id}</span>
                    <span className="simulator-chip__here">★ here</span>
                  </>
                )}
              </button>
            );
          })}

          {/* Overflow + management: select or remove any chapter, add a new one. Always
              present (shows "⋯" when nothing overflows) so removal stays reachable. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="simulator-chip simulator-chip--more">
                {overflow.length > 0 ? `+${overflow.length}` : '⋯'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="simulator-chapter-menu">
              <div className="simulator-chapter-menu__label">Chapters · {chapters.length}</div>
              <div className="simulator-chapter-menu__list">
                {chapters.map((chapter, i) => (
                  <DropdownMenuItem
                    key={chapter.id}
                    className={`simulator-chapter-menu__item ${chapter.id === currentChapterId ? 'simulator-chapter-menu__item--current' : ''}`}
                    onSelect={() => onSelectChapter(chapter.id)}
                  >
                    <span className="simulator-chapter-menu__item-num">{i + 1}</span>
                    <span className="simulator-chapter-menu__item-name">{chapter.name || chapter.id}</span>
                    {chapter.id === currentChapterId ? (
                      <span className="simulator-chapter-menu__item-current">★ current</span>
                    ) : (
                      <span
                        className="simulator-chapter-menu__item-remove"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); onRemoveChapter(chapter); }}
                      >
                        🗑
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="simulator-chapter-menu__new" onSelect={onNewChapter}>
                + New chapter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button className="simulator-spine__new" onClick={onNewChapter}>+ Chapter</button>
        <button className="simulator-controls__reset" onClick={onReset}>
          <RotateCcw size={12} strokeWidth={2} /> Reset
        </button>
      </div>

      {/* ── ENGAGEMENT + AMBIENT ───────────────────────────────────────────── */}
      <div className="simulator-controls__grid">
        <div className="simulator-section">
          <div className="simulator-section__head">
            <span className="simulator-section__title">Engagement</span>
            <span className="simulator-section__hint">fuels progression · idle never advances</span>
          </div>
          <div className="simulator-section__fields">
            <StepperField label="Active days" value={daysSinceInstall} onChange={onDaysSinceInstallChange} />
            <StepperField label="Total wakes" value={totalWakes} onChange={onTotalWakesChange} />
          </div>
        </div>

        <div className="simulator-section">
          <div className="simulator-section__head">
            <span className="simulator-section__title">Ambient</span>
            <span className="simulator-section__hint">mood · re-checked every wake</span>
          </div>
          <div className="simulator-section__fields">
            <SelectField label="Time of day" value={timeOfDay} options={TIME_OPTIONS} onChange={onTimeOfDayChange} wide />
            <SelectField label="Weekday" value={dayOfWeek} options={DAY_OPTIONS} onChange={onDayOfWeekChange} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StepperFieldProps {
  label: string;
  value: number;
  onChange: (v: number | ((prev: number) => number)) => void;
}

function StepperField({ label, value, onChange }: StepperFieldProps) {
  return (
    <div className="simulator-cfield">
      <span className="simulator-cfield__label">{label}</span>
      <div className="simulator-stepper">
        <button className="simulator-stepper__btn" onClick={() => onChange(v => Math.max(0, v - 1))}>−</button>
        <span className="simulator-stepper__value">{value}</span>
        <button className="simulator-stepper__btn" onClick={() => onChange(v => v + 1)}>+</button>
      </div>
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  wide?: boolean;
}

function SelectField({ label, value, options, onChange, wide }: SelectFieldProps) {
  return (
    <div className="simulator-cfield">
      <span className="simulator-cfield__label">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`simulator-select ${wide ? 'simulator-select--wide' : ''}`}>
            <span className="simulator-select__value">{value}</span>
            <ChevronDown className="simulator-select__caret" size={12} strokeWidth={2} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {options.map(opt => (
            <DropdownMenuItem key={opt} onSelect={() => onChange(opt)}>
              {opt === value ? '✓ ' : ''}{opt}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
