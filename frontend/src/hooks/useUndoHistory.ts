import { useRef } from 'react';
import type { SceneSlot } from '@livewallpaper/types';

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

export interface XFocusAction {
  type: 'xFocus';
  before: number;
  after: number;
}

export interface YFocusAction {
  type: 'yFocus';
  before: number;
  after: number;
}

export interface TextureAction {
  type: 'texture';
  spriteIndex: number;
  before: { textureResource: string; width: number; height: number; texCoordinates: number[] };
  after: { textureResource: string; width: number; height: number; texCoordinates: number[] };
}

/**
 * A whole-slots snapshot. Slot edits (add/remove/rename slot or sprite, gate changes, drag-move)
 * all go through one immutable array replace, so a before/after snapshot is the simplest uniform
 * way to make every slot mutation undoable.
 */
export interface SlotsAction {
  type: 'slots';
  before: SceneSlot[];
  after: SceneSlot[];
}

export type HistoryAction = PositionAction | ScaleAction | DepthAction | XFocusAction | YFocusAction | TextureAction | SlotsAction;

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
