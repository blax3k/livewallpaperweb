interface SimulatorTopBarProps {
  projectName: string;
  onBack: () => void;
  chapterNumber: number;
  chapterName: string;
  timeOfDay: string;
  dayOfWeek: string;
  daysSinceInstall: number;
  totalWakes: number;
  lastSceneShown: string;
}

// Read-only status strip. The editable controls live in the SimulatorControlsPanel;
// this bar just mirrors the current simulated world at a glance.
export function SimulatorTopBar({
  projectName,
  onBack,
  chapterNumber,
  chapterName,
  timeOfDay,
  dayOfWeek,
  daysSinceInstall,
  totalWakes,
  lastSceneShown,
}: SimulatorTopBarProps) {
  const timeShort = timeOfDay.split(' · ')[1] ?? timeOfDay;

  return (
    <div className="simulator-topbar">
      <span className="simulator-topbar__back" onClick={onBack}>←</span>
      <span className="simulator-topbar__divider" />
      <span className="simulator-topbar__title">{projectName}</span>
      <span className="simulator-topbar__divider" />
      <span className="simulator-topbar__state">
        <span className="simulator-topbar__dot" />
        Simulated state
      </span>

      <div className="simulator-topbar__summary">
        <Segment label="Chapter" value={chapterName ? `${chapterNumber} · ${chapterName}` : '—'} />
        <span className="simulator-topbar__divider" />
        <Segment label="Ambient" value={`${timeShort} · ${dayOfWeek}`} />
        <span className="simulator-topbar__divider" />
        <Segment label="Active days" value={String(daysSinceInstall)} />
        <Segment label="Wakes" value={String(totalWakes)} />
        <span className="simulator-topbar__divider" />
        <Segment label="Last shown" value={lastSceneShown} truncate />
      </div>
    </div>
  );
}

function Segment({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <span className={`simulator-topbar__seg ${truncate ? 'simulator-topbar__seg--truncate' : ''}`}>
      <span className="simulator-topbar__seg-label">{label}</span>
      <span className="simulator-topbar__seg-value">{value}</span>
    </span>
  );
}
