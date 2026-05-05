import express from 'express';
import path from 'path';

const app = express();
const PORT = 3000;

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Live Wallpaper Scene Viewer</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          height: 100vh;
          overflow: hidden;
          background: #000;
          display: flex;
          gap: 20px;
          padding: 20px;
        }
        
        .main-content {
          display: flex;
          gap: 20px;
          width: 100%;
          height: 100%;
        }
        
        #canvas-container {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          min-width: 300px;
          background: #111;
          border-radius: 8px;
          overflow: hidden;
        }
        
        #canvas-container canvas {
          max-width: 100%;
          max-height: 100%;
          display: block;
        }
        
        .controls {
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 20px;
          border-radius: 8px;
          width: 280px;
          height: fit-content;
          border: 1px solid #444;
          overflow-y: auto;
        }
        
        .controls h2 {
          margin-bottom: 15px;
          font-size: 16px;
        }
        
        .control-group {
          margin-bottom: 12px;
        }
        
        .control-group label {
          display: block;
          margin-bottom: 5px;
          font-size: 12px;
        }
        
        .control-group select,
        .control-group input {
          width: 100%;
          padding: 8px;
          border: 1px solid #444;
          background: #333;
          color: white;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .control-group input[type="range"] {
          padding: 0;
          cursor: pointer;
        }
        
        .info-text {
          font-size: 12px;
          color: #aaa;
          margin-top: 10px;
          border-top: 1px solid #444;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="controls">
        <h2>Scene Viewer</h2>
        
        <div class="control-group">
          <label for="scene-select">Select Scene:</label>
          <select id="scene-select">
            <option value="">-- Choose a scene --</option>
            <option value="boba_sunset">Boba Sunset</option>
            <option value="dancing_sunset">Dancing Sunset</option>
            <option value="leaning_day">Leaning Day</option>
            <option value="stretch_sunrise">Stretch Sunrise</option>
            <option value="tinker_sunrise">Tinker Sunrise</option>
            <option value="vr_night">VR Night</option>
          </select>
        </div>
        
        <div id="xfocus-container" class="control-group" style="display: none;">
          <label for="xfocus-slider">Camera Focus (xFocus):</label>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="range" id="xfocus-slider" min="0" max="1" step="0.01" value="0.5" style="flex: 1;" />
            <span id="xfocus-value">0.50</span>
          </div>
        </div>
        
        <div id="guide-container" class="control-group" style="display: none;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="phone-guide-toggle" style="cursor: pointer; width: auto; padding: 0; flex: none;" />
            <span>Show Phone Guide</span>
          </label>
        </div>
        
        <div class="info-text">
          Select a scene to view. Adjust the camera focus slider to parallax scroll.
        </div>
      </div>

      <div class="main-content">
        <div id="canvas-container"></div>
      </div>

      <script src="/bundle.js"></script>
      <script>
        // Load scene when selected
        document.getElementById('scene-select').addEventListener('change', async (e) => {
          const sceneName = e.target.value;
          if (!sceneName) return;
          
          try {
            const response = await fetch(\`/scenes/\${sceneName}.json\`);
            const sceneData = await response.json();
            
            // This will be initialized by the client-side code
            console.log('Scene loaded:', sceneData);
            window.sceneData = sceneData;
            window.initScene(sceneData);
            
            // Show xFocus slider and guide toggle
            document.getElementById('xfocus-container').style.display = 'block';
            document.getElementById('guide-container').style.display = 'block';
            
            const xfocus = sceneData.xFocus || 0.5;
            document.getElementById('xfocus-slider').value = xfocus;
            document.getElementById('xfocus-value').textContent = xfocus.toFixed(2);
            
            // Apply initial scroll offset
            if (window.currentRenderer) {
              window.currentRenderer.setScrollOffset(xfocus);
            }
          } catch (error) {
            console.error('Failed to load scene:', error);
            alert('Failed to load scene. Make sure the scene JSON file exists in the public folder.');
          }
        });
        
        // Handle xFocus slider changes
        document.getElementById('xfocus-slider').addEventListener('input', (e) => {
          const xfocus = parseFloat(e.target.value);
          document.getElementById('xfocus-value').textContent = xfocus.toFixed(2);
          
          // Update scene rendering
          if (window.currentRenderer) {
            window.currentRenderer.setScrollOffset(xfocus);
          }
        });

        // Handle phone guide toggle
        document.getElementById('phone-guide-toggle').addEventListener('change', (e) => {
          if (window.currentRenderer) {
            if (e.target.checked) {
              window.currentRenderer.showGuide();
            } else {
              window.currentRenderer.hideGuide();
            }
          }
        });
        
        // This function will be called after the bundle loads
        window.initScene = function(sceneData) {
          console.log('Scene init called');
        };
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
