import { useState } from 'react';

interface CollapsibleGroupProps {
  title: string;
  count: number;
  children: React.ReactNode;
}

export function CollapsibleGroup({ title, count, children }: CollapsibleGroupProps) {
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
