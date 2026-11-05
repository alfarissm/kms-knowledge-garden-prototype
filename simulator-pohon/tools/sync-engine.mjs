import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// Standalone snapshots: production KMS files are read, never changed.
const source = new URL('../../src/', import.meta.url);
const target = new URL('../src/engine/', import.meta.url);
mkdirSync(target, { recursive: true });
let engine = readFileSync(new URL('gamification.js', source), 'utf8').replace(/\r\n/g, '\n');
// Simulator rule correction: death requires BOTH care resources to be empty.
// Preserve this rule even when refreshing the snapshot from the older KMS.
const legacyDeath = "  if (careFertilizerUnits <= 0) {\n    return 'dead';\n  }";
const correctedDeath = "  if (careAir <= 0 && careFertilizerUnits <= 0) {\n    return 'dead';\n  }";
if (engine.includes(legacyDeath)) engine = engine.replace(legacyDeath, correctedDeath);
else if (!engine.includes(correctedDeath)) throw new Error('Condition rule changed upstream. Review before syncing.');
writeFileSync(new URL('gamification.js', target), engine);
const main = readFileSync(new URL('main.js', source), 'utf8');
const start = main.indexOf('function makeTreeSvg(');
const end = main.indexOf('\nfunction renderStageTrack(', start);
if (start < 0 || end < 0) throw new Error('Tree renderer boundaries not found.');
writeFileSync(new URL('tree-svg.js', target),
  '// Snapshot of the original Kebunku SVG renderer. No application/API imports.\n' +
  "import { STAGES } from './gamification.js';\nconst MAX_VISIBLE_FRUIT = 7;\nexport " + main.slice(start, end).trim() + '\n');
console.log('Isolated engine and SVG snapshots created. Original application unchanged.');
