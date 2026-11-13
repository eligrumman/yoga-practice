// Build: node pilot/anidoodle/build.mjs <esbuild-module-dir> <anidoodle-clone-dir>
// Bundles the pilot with the anidoodle engine sources (cloned from https://github.com/alexgreensh/anidoodle,
// Apache-2.0) into pilot/anidoodle/dist/. esbuild is installed outside the repo (npm i --ignore-scripts esbuild@0.25.12).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const [esb, ani] = process.argv.slice(2);
const { build } = createRequire(esb + '/')('esbuild');
const here = new URL('.', import.meta.url).pathname;
const banner = `/*! Bundle includes code from anidoodle (https://github.com/alexgreensh/anidoodle),
 Copyright 2026 Alex Greenshpun, licensed under the Apache License 2.0 (see LICENSE and NOTICE next to this file).
 Modifications: bundled with a pilot entry point; engine sources otherwise unchanged. */`;
const alias = { '@ani': ani + '/skills/anidoodle/engine/src/canvas-core' };
mkdirSync(here + 'dist', { recursive: true });
await build({ entryPoints: [here + 'src/fit.ts'], bundle: true, platform: 'node', format: 'esm', outfile: here + 'dist/fit.mjs', alias, banner: { js: banner }, loader: { '.json': 'json' }, logLevel: 'warning' });
await build({ entryPoints: [here + 'src/page.ts'], bundle: true, platform: 'browser', format: 'iife', outfile: here + 'dist/pilot.js', alias, banner: { js: banner }, loader: { '.json': 'json' }, logLevel: 'warning', target: 'es2020' });
console.log('built');
