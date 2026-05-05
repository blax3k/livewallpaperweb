import * as esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';

const isWatch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/client.tsx'],
  bundle: true,
  outfile: 'public/bundle.js',
  platform: 'browser',
  plugins: [sassPlugin({ type: 'css' })],
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(config);
}
