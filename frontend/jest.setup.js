require('jest-canvas-mock');

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  configurable: true,
  value: 1,
});

// Mock PIXI before any tests
jest.mock('pixi.js', () => {
  const mockTexture = {
    width: 256,
    height: 256,
    source: {
      pixelWidth: 256,
      pixelHeight: 256,
    },
  };

  return {
    __esModule: true,
    Application: jest.fn().mockImplementation(() => ({
      init: jest.fn().mockResolvedValue(undefined),
      canvas: document.createElement('canvas'),
      stage: {
        addChild: jest.fn(),
        removeChildren: jest.fn(),
        scale: { set: jest.fn() },
        x: 0,
        y: 0,
      },
      renderer: {
        resize: jest.fn(),
      },
      destroy: jest.fn(),
    })),
    Assets: {
      load: jest.fn().mockResolvedValue(mockTexture),
    },
    Sprite: jest.fn().mockImplementation(function() {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        anchor: { set: jest.fn() },
        destroy: jest.fn(),
      };
    }),
    Graphics: jest.fn().mockImplementation(function() {
      return {
        x: 0,
        y: 0,
        visible: true,
        alpha: 1,
        moveTo: jest.fn(function() { return this; }),
        lineTo: jest.fn(function() { return this; }),
        stroke: jest.fn(function() { return this; }),
        destroy: jest.fn(),
      };
    }),
    Texture: jest.fn().mockImplementation(function(config) {
      return {
        ...config,
        width: config?.source?.pixelWidth || 256,
        height: config?.source?.pixelHeight || 256,
        source: config?.source || mockTexture.source,
      };
    }),
    Rectangle: jest.fn().mockImplementation(function(x, y, w, h) {
      return { x, y, width: w, height: h };
    }),
  };
}, { virtual: true });
