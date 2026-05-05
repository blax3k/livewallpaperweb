import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/scenes', (req, res) => {
  const scenesDir = path.join(__dirname, '..', 'public', 'scenes');
  const files = fs.readdirSync(scenesDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const value = f.replace('.json', '');
      const label = value
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      return { value, label };
    });
  res.json(files);
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Live Wallpaper Scene Viewer</title>
      <link rel="stylesheet" href="/bundle.css">
    </head>
    <body>
      <script src="/bundle.js"></script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

