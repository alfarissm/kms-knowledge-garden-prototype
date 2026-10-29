import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Exercise the pure SVG renderer without starting the app or touching Neon.
const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const renderer = source.slice(source.indexOf('function makeTreeSvg('), source.indexOf('\nfunction renderStageTrack('));
const render = new Function('STAGES', 'MAX_VISIBLE_FRUIT', `${renderer}; return makeTreeSvg;`)(
  Array.from({ length: 8 }, (_, level) => `Level ${level}`), 7,
);
const empty = { tree: [], ground: [] };

describe('tree visual decorations and content-bound fruit', () => {
  it('provides shedding from level 2, but never on bare soil or seedlings', () => {
    for (const condition of ['healthy', 'thirsty', 'dead']) {
      expect(render(0, condition, empty)).not.toContain('class="falling-leaf"');
      expect(render(1, condition, empty)).not.toContain('class="falling-leaf"');
    }
    for (let level = 2; level <= 7; level += 1) {
      expect(render(level, 'healthy', empty).match(/class="falling-leaf"/g)).toHaveLength(1);
      expect(render(level, 'thirsty', empty).match(/class="falling-leaf"/g)).toHaveLength(3);
      expect(render(level, 'dead', empty).match(/class="falling-leaf"/g)).toHaveLength(6);
    }
  });

  it('hides hanging and stale fruit below level 3 without discarding the view data', () => {
    const view = { tree: [{ slot: 1 }], ground: [{ slot: 2 }] };
    const original = JSON.stringify(view);
    for (let level = 0; level < 3; level += 1) {
      for (const condition of ['healthy', 'thirsty', 'dead']) {
        const svg = render(level, condition, view);
        expect(svg).not.toContain('data-fruit-slot');
        expect(svg).not.toContain('class="fruit-core"');
        expect(svg).not.toContain('buah busuk rebah di tanah');
      }
    }
    expect(JSON.stringify(view)).toBe(original);
    expect(render(3, 'healthy', view).match(/data-fruit-slot=/g)).toHaveLength(2);
  });
  it('has no canopy blossoms or decorative fruit at any level', () => {
    for (let level = 0; level <= 7; level += 1) {
      const svg = render(level, 'healthy', empty);
      expect(svg).not.toContain('apple-blossom');
      expect(svg).not.toContain('data-fruit-slot');
    }
  });

  it('grows ground flowers with level, without flowers at seedling stages', () => {
    expect(render(2, 'healthy', empty)).not.toContain('class="garden-flower"');
    expect(render(3, 'healthy', empty).match(/class="garden-flower"/g)).toHaveLength(2);
    expect(render(7, 'healthy', empty).match(/class="garden-flower"/g)).toHaveLength(6);
  });

  it('plants different flower varieties with grass from level 3', () => {
    const level3 = render(3, 'healthy', empty);
    expect(level3).toContain('data-flower-variety="0"');
    expect(level3).toContain('data-flower-variety="1"');
    expect(render(4, 'healthy', empty)).toContain('data-flower-variety="2"');
    expect(level3).toContain('translate(160 442)');
  });

  it('hides ground flowers when thirsty or dead', () => {
    for (const condition of ['thirsty', 'dead']) {
      const svg = render(5, condition, empty);
      expect(svg).not.toContain('class="garden-flower"');
      expect(svg).not.toContain('class="apple-blossom"');
    }
  });

  it('keeps holes in fixed fruit slots and exposes keyboard actions', () => {
    const svg = render(4, 'healthy', { tree: [{ slot: 1 }, { slot: 3 }], ground: [{ slot: 2 }] });
    expect(svg.match(/data-fruit-slot=/g)).toHaveLength(3);
    expect(svg).toContain('data-fruit-slot="3" role="button" tabindex="0"');
    expect(svg).toContain('data-fruit-slot="2" role="button" tabindex="0" aria-label="Lihat konten buah basi 2"');
    expect(svg).toContain('translate(154 188)');
  });

  it('grows visible fruit gradually regardless of the canopy coordinate scale', () => {
    const canopyScales = { 3: 1.25, 4: .65, 5: .78, 6: .83, 7: .89 };
    for (let level = 3; level <= 7; level += 1) {
      const svg = render(level, 'healthy', { tree: [{ slot: 1 }], ground: [{ slot: 2 }] });
      const expected = .9 + (level - 3) * .1;
      const hanging = svg.match(/class="tree-fruit fruit-validated"[^>]*transform="translate\([^)]+\) scale\(([^)]+)\)"/);
      const fallen = svg.match(/class="tree-fruit fruit-ground-lying"[^>]*transform="translate\([^)]+\) rotate\([^)]+\) scale\(([^)]+)\)"/);
      expect(Number(hanging[1]) * canopyScales[level]).toBeCloseTo(expected);
      expect(Number(fallen[1])).toBeCloseTo(expected * .95);
    }
  });

  it('renders a stale-only fruit on the ground, with no leftover hanging fruit', () => {
    const svg = render(5, 'healthy', { tree: [], ground: [{ slot: 1 }] });
    expect(svg.match(/data-fruit-slot="1"/g)).toHaveLength(1);
    expect(svg).toContain('class="tree-fruit fruit-ground-lying"');
    expect(svg).not.toContain('class="tree-fruit fruit-validated"');
    expect(svg).not.toContain('appleRipe)');
    expect(svg).toMatch(/fruit-ground-lying[^>]*translate\(246 /);
  });

  it('places the first two fallen fruits on opposite sides near the trunk', () => {
    const svg = render(5, 'healthy', { tree: [], ground: [{ slot: 1 }, { slot: 2 }] });
    const positions = [...svg.matchAll(/fruit-ground-lying[^>]*translate\((\d+) /g)].map((match) => Number(match[1]));
    expect(positions).toEqual([246, 354]);
    expect(positions.every((x) => Math.abs(x - 300) <= 60)).toBe(true);
  });
});
