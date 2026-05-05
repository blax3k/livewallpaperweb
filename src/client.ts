import { SceneRenderer } from './renderers/SceneRenderer';
import type { Scene } from './interfaces/Scene';

/**
 * Client-side initialization for the scene viewer
 */
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  let renderer: SceneRenderer | null = null;

  // Define the global init function for the server to call
  (window as any).initScene = async (sceneData: Scene) => {
    try {
      // Destroy previous renderer if it exists
      if (renderer) {
        renderer.destroy();
      }

      // Create new renderer
      renderer = new SceneRenderer(container);

      // Load and render the scene
      await renderer.loadScene(sceneData);

      // Store renderer globally for scroll updates
      (window as any).currentRenderer = renderer;

      console.log('Scene rendered successfully');
    } catch (error) {
      console.error('Failed to render scene:', error);
    }
  };
});
