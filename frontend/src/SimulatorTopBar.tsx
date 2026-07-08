import { useState } from 'react';
import type { FlagDefinition } from './api';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './components/ui/dropdown-menu';

const TIME_OPTIONS = ['06:00 · Morning', '12:00 · Midday', '17:00 · Evening', '21:30 · Night'];
const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface SimulatorTopBarProps {
  projectName: string;
  onBack: () => void;
  chapters: FlagDefinition[];
  currentChapterId: string | null;
  onSelectChapter: (id: string) => void;
  onNewChapter: () => void;
  onRemoveChapter: (chapter: FlagDefinition) => void;
}

export function SimulatorTopBar({
  projectName,
  onBack,
  chapters,
  currentChapterId,
  onSelectChapter,
  onNewChapter,
  onRemoveChapter,
}: SimulatorTopBarProps) {
  const [time, setTime] = useState(TIME_OPTIONS[3]);
  const [day, setDay] = useState(DAY_OPTIONS[1]);
  const [sinceInstall, setSinceInstall] = useState(8);
  const [wakes, setWakes] = useState(34);
  const [lastShown] = useState('—');

  const currentChapter = chapters.find(c => c.id === currentChapterId) ?? null;
  const currentIndex = currentChapter ? chapters.indexOf(currentChapter) : -1;

  const handleReset = () => {
    setTime(TIME_OPTIONS[3]);
    setDay(DAY_OPTIONS[1]);
    setSinceInstall(8);
    setWakes(34);
  };

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
              <span className="simulator-topbar-field__value">{time.split(' · ')[0]}</span>
              <span className="simulator-topbar-field__caret">▾</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {TIME_OPTIONS.map(opt => (
              <DropdownMenuItem key={opt} onSelect={() => setTime(opt)}>
                {opt === time ? '✓ ' : ''}{opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="simulator-topbar-field">
              <span className="simulator-topbar-field__label">DAY</span>
              <span className="simulator-topbar-field__value">{day}</span>
              <span className="simulator-topbar-field__caret">▾</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {DAY_OPTIONS.map(opt => (
              <DropdownMenuItem key={opt} onSelect={() => setDay(opt)}>
                {opt === day ? '✓ ' : ''}{opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="simulator-topbar-field">
          <span className="simulator-topbar-field__label">SINCE INSTALL</span>
          <span className="simulator-topbar-field__value">{sinceInstall}</span>
          <span className="simulator-topbar-field__unit">d</span>
          <span className="simulator-topbar-field__steppers">
            <span className="simulator-topbar-field__btn" onClick={() => setSinceInstall(v => Math.max(0, v - 1))}>−</span>
            <span className="simulator-topbar-field__btn" onClick={() => setSinceInstall(v => v + 1)}>+</span>
          </span>
        </div>

        <div className="simulator-topbar-field simulator-topbar-field--last-shown">
          <span className="simulator-topbar-field__label">LAST SHOWN</span>
          <span className="simulator-topbar-field__value">{lastShown}</span>
        </div>

        <div className="simulator-topbar-field">
          <span className="simulator-topbar-field__label">WAKES</span>
          <span className="simulator-topbar-field__value">{wakes}</span>
          <span className="simulator-topbar-field__steppers">
            <span className="simulator-topbar-field__btn" onClick={() => setWakes(v => Math.max(0, v - 1))}>−</span>
            <span className="simulator-topbar-field__btn" onClick={() => setWakes(v => v + 1)}>+</span>
          </span>
        </div>
      </div>

      <span className="simulator-topbar__reset" onClick={handleReset}>↺ Reset</span>
    </div>
  );
}
