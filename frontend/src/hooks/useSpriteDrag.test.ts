import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useSpriteDrag } from './useSpriteDrag';
import type { SelectedSprite } from './useSceneRenderer';
import type { SceneRenderer } from '../renderers/SceneRenderer';

const selectedSprite: SelectedSprite = {
  index: 0, name: 'test', x: 0, y: 0, depth: 1, width: 1, height: 1,
};

describe('useSpriteDrag', () => {
  let container: HTMLDivElement;
  let unmount: () => void;
  let canvasContainer: HTMLDivElement;
  let onSpriteMove: jest.Mock;
  let onDragCommit: jest.Mock;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    onSpriteMove = jest.fn();
    onDragCommit = jest.fn();

    mockCanvas = document.createElement('canvas');
    // getBoundingClientRect returns all zeros in jsdom — mock left/top to zero so clientX == cssX
    jest.spyOn(mockCanvas, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    const rendererRef = {
      current: {
        getCanvas: () => mockCanvas,
        hitTestSprite: jest.fn<() => boolean>().mockReturnValue(true),
        // Identity transform: world coords == canvas CSS coords
        canvasToWorld: jest.fn<(x: number, y: number) => { x: number; y: number }>()
          .mockImplementation((x, y) => ({ x, y })),
        setSpritePosition: jest.fn(),
      },
    } as unknown as React.RefObject<SceneRenderer | null>;

    const TestComponent = () => {
      const { handleCanvasMouseDown } = useSpriteDrag({
        selectedSprite,
        rendererRef,
        onSpriteMove,
        onDragCommit,
      });
      return React.createElement('div', {
        'data-testid': 'canvas-container',
        onMouseDown: handleCanvasMouseDown,
      });
    };

    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => { root.render(React.createElement(TestComponent)); });
    unmount = () => act(() => { root.unmount(); });

    canvasContainer = container.querySelector('[data-testid="canvas-container"]') as HTMLDivElement;
  });

  afterEach(() => {
    unmount();
    if (document.body.contains(container)) document.body.removeChild(container);
  });

  it('calls onDragCommit when drag ends with a nonzero displacement', () => {
    act(() => {
      canvasContainer.dispatchEvent(
        new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }),
      );
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 10, bubbles: true }));
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup', { clientX: 30, clientY: 10, bubbles: true }));
    });

    expect(onDragCommit).toHaveBeenCalledTimes(1);
    expect(onDragCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'position', spriteIndex: 0 }),
    );
  });

  it('does NOT call onDragCommit when drag ends at the same position', () => {
    act(() => {
      canvasContainer.dispatchEvent(
        new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }),
      );
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup', { clientX: 10, clientY: 10, bubbles: true }));
    });

    expect(onDragCommit).not.toHaveBeenCalled();
  });

  it('calls onSpriteMove during drag', () => {
    act(() => {
      canvasContainer.dispatchEvent(
        new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true }),
      );
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 10, bubbles: true }));
    });

    expect(onSpriteMove).toHaveBeenCalled();
  });

  it('does NOT start a drag on right-click', () => {
    act(() => {
      canvasContainer.dispatchEvent(
        new MouseEvent('mousedown', { button: 2, clientX: 10, clientY: 10, bubbles: true }),
      );
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup', { clientX: 30, clientY: 10, bubbles: true }));
    });

    expect(onDragCommit).not.toHaveBeenCalled();
    expect(onSpriteMove).not.toHaveBeenCalled();
  });
});
