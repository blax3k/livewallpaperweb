import type { FlagDefinition } from './api';
import { TIME_OPTIONS, DAY_OPTIONS } from './useSimulatedState';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './components/ui/dropdown-menu';

interface SimulatorTopBarProps {
  projectName: string;
  onBack: () => void;
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
  lastSceneShown: string;
  totalWakes: number;
  onTotalWakesChange: (v: number | ((prev: number) => number)) => void;
  onReset: () => void;
}

export function SimulatorTopBar({
  projectName,
  onBack,
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
  lastSceneShown,
  totalWakes,
  onTotalWakesChange,
  onReset,
}: SimulatorTopBarProps) {
  const currentChapter = chapters.find(c => c.id === currentChapterId) ?? null;
  const currentIndex = currentChapter ? chapters.indexOf(currentChapter) : -1;

  return (
    <div className="simulator-topbar">
      <span className="simulator-topbar__back" onClick={onBack}>←</span>
      <span className="simulator-topbar__divider" />
      <span className="simulator-topbar__title">{projectName}</span>
      <span className="simulator-topbar__divider" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="simulator-chapter-pill">
            {currentChapter ? (
              <>
                <span className="simulator-chapter-pill__num">{currentIndex + 1}</span>
                <span className="simulator-chapter-pill__name">{currentChapter.name || currentChapter.id}</span>
              </>
            ) : (
              <span className="simulator-chapter-pill__name">No chapters</span>
            )}
            <span className="simulator-chapter-pill__caret">▾</span>
          </div>
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

      <span className="simulator-topbar__divider" />

      <div className="simulator-topbar__fields">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="simulator-topbar-field">
              <span className="simulator-topbar-field__label">TIME</span>
              <span className="simulator-topbar-field__value">{timeOfDay.split(' · ')[0]}</span>
              <span className="simulator-topbar-field__caret">▾</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {TIME_OPTIONS.map(opt => (
              <DropdownMenuItem key={opt} onSelect={() => onTimeOfDayChange(opt)}>
                {opt === timeOfDay ? '✓ ' : ''}{opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="simulator-topbar-field">
              <span className="simulator-topbar-field__label">DAY</span>
              <span className="simulator-topbar-field__value">{dayOfWeek}</span>
              <span className="simulator-topbar-field__caret">▾</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {DAY_OPTIONS.map(opt => (
              <DropdownMenuItem key={opt} onSelect={() => onDayOfWeekChange(opt)}>
                {opt === dayOfWeek ? '✓ ' : ''}{opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="simulator-topbar-field">
          <span className="simulator-topbar-field__label">SINCE INSTALL</span>
          <span className="simulator-topbar-field__value">{daysSinceInstall}</span>
          <span className="simulator-topbar-field__unit">d</span>
          <span className="simulator-topbar-field__steppers">
            <span className="simulator-topbar-field__btn" onClick={() => onDaysSinceInstallChange(v => Math.max(0, v - 1))}>−</span>
            <span className="simulator-topbar-field__btn" onClick={() => onDaysSinceInstallChange(v => v + 1)}>+</span>
          </span>
        </div>

        <div className="simulator-topbar-field simulator-topbar-field--last-shown">
          <span className="simulator-topbar-field__label">LAST SHOWN</span>
          <span className="simulator-topbar-field__value">{lastSceneShown}</span>
        </div>

        <div className="simulator-topbar-field">
          <span className="simulator-topbar-field__label">WAKES</span>
          <span className="simulator-topbar-field__value">{totalWakes}</span>
          <span className="simulator-topbar-field__steppers">
            <span className="simulator-topbar-field__btn" onClick={() => onTotalWakesChange(v => Math.max(0, v - 1))}>−</span>
            <span className="simulator-topbar-field__btn" onClick={() => onTotalWakesChange(v => v + 1)}>+</span>
          </span>
        </div>
      </div>

      <span className="simulator-topbar__reset" onClick={onReset}>↺ Reset</span>
    </div>
  );
}
