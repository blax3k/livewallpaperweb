import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useKeyboardControls } from './useKeyboardControls';
import type { SelectedSprite } from './useSceneRenderer';
import type { SceneRenderer } from '../renderers/SceneRenderer';
import type { useUndoHistory } from './useUndoHistory';

const selectedSprite: SelectedSprite = {
  index: 0, name: 'test', x: 1, y: 2, depth: 1, width: 1, height: 1,
};

function makeHistory(): ReturnType<typeof useUndoHistory> {
  return {
    push: jest.fn(),
    undo: jest.fn<() => null>().mockReturnValue(null),
    redo: jest.fn<() => null>().mockReturnValue(null),
    clear: jest.fn(),
  } as unknown as ReturnType<typeof useUndoHistory>;
}

function makeRendererRef() {
  return { current: { setSpritePosition: jest.fn() } } as unknown as React.RefObject<SceneRenderer | null>;
}

describe('useKeyboardControls', () => {
  let container: HTMLDivElement;
  let unmount: () => void;
  let onMarkDirty: jest.Mock;
  let onSpriteMove: jest.Mock;
  let history: ReturnType<typeof useUndoHistory>;

  beforeEach(() => {
    onMarkDirty = jest.fn();
    onSpriteMove = jest.fn();
    history = makeHistory();
    const rendererRef = makeRendererRef();

    const TestComponent = () => {
      useKeyboardControls({
        selectedSprite,
        rendererRef,
        history,
        onUndoApply: jest.fn(),
        onRedoApply: jest.fn(),
        onSpriteMove,
        onMarkDirty,
      });
      return null;
    };

    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => { root.render(React.createElement(TestComponent)); });
    unmount = () => act(() => { root.unmount(); });
  });

  afterEach(() => {
    unmount();
    if (document.body.contains(container)) document.body.removeChild(container);
  });

  it('calls onMarkDirty when ArrowLeft is pressed', () => {
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); });
    expect(onMarkDirty).toHaveBeenCalledTimes(1);
  });

  it('calls onMarkDirty when ArrowRight is pressed', () => {
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); });
    expect(onMarkDirty).toHaveBeenCalledTimes(1);
  });

  it('calls onMarkDirty when ArrowUp is pressed', () => {
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); });
    expect(onMarkDirty).toHaveBeenCalledTimes(1);
  });

  it('calls onMarkDirty when ArrowDown is pressed', () => {
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); });
    expect(onMarkDirty).toHaveBeenCalledTimes(1);
  });

  it('calls onSpriteMove when an arrow key is pressed', () => {
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); });
    expect(onSpriteMove).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
  });

  it('pushes a position action to history when an arrow key is pressed', () => {
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); });
    expect(history.push).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'position', spriteIndex: 0 }),
    );
  });

  it('does NOT call onMarkDirty on Ctrl+Z (undo)', () => {
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })); });
    expect(onMarkDirty).not.toHaveBeenCalled();
  });

  it('does NOT call onMarkDirty on Ctrl+Y (redo)', () => {
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true })); });
    expect(onMarkDirty).not.toHaveBeenCalled();
  });

  it('does NOT call onMarkDirty for non-arrow keys', () => {
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); });
    expect(onMarkDirty).not.toHaveBeenCalled();
  });

  it('does NOT call onMarkDirty when an input is focused', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); });
    expect(onMarkDirty).not.toHaveBeenCalled();
    expect(onSpriteMove).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
