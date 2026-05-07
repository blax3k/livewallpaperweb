import { useRef } from 'react';

export interface PositionAction {
  spriteIndex: number;
  before: { x: number; y: number };
  after: { x: number; y: number };
}

export function useUndoHistory() {
  const past = useRef<PositionAction[]>([]);
  const future = useRef<PositionAction[]>([]);

  function push(action: PositionAction) {
    past.current = [...past.current, action];
    future.current = [];
  }

  function undo(): PositionAction | null {
    const action = past.current[past.current.length - 1];
    if (!action) return null;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, action];
    return action;
  }

  function redo(): PositionAction | null {
    const action = future.current[future.current.length - 1];
    if (!action) return null;
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, action];
    return action;
  }

  function clear() {
    past.current = [];
    future.current = [];
  }

  return { push, undo, redo, clear };
}
