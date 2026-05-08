import { useRef } from 'react';

export interface PositionAction {
  type: 'position';
  spriteIndex: number;
  before: { x: number; y: number };
  after: { x: number; y: number };
}

export interface ScaleAction {
  type: 'scale';
  spriteIndex: number;
  before: { width: number; height: number };
  after: { width: number; height: number };
}

export interface DepthAction {
  type: 'depth';
  spriteIndex: number;
  before: number;
  after: number;
}

export type HistoryAction = PositionAction | ScaleAction | DepthAction;

export function useUndoHistory() {
  const past = useRef<HistoryAction[]>([]);
  const future = useRef<HistoryAction[]>([]);

  function push(action: HistoryAction) {
    past.current = [...past.current, action];
    future.current = [];
  }

  function undo(): HistoryAction | null {
    const action = past.current[past.current.length - 1];
    if (!action) return null;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, action];
    return action;
  }

  function redo(): HistoryAction | null {
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
