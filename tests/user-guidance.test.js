import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

it('places user reviews inline after the catalog instead of in a popup', () => {
  const section = html.indexOf('id="learningReviewsSection"');
  expect(section).toBeGreaterThan(html.indexOf('id="learningCatalog"'));
  expect(section).toBeLessThan(html.indexOf('id="sharingPage"'));
  expect(html).toContain('id="learnAdminReviewsHost"');
  expect(html).not.toContain('learningReviewsDialog');
  expect(main).not.toContain('learningReviewsDialog');
  expect(main).not.toContain("reviewsButton.setAttribute('aria-haspopup', 'dialog')");
});

it('explains all five fruit/content states in an accessible disclosure', () => {
  const guide = html.match(/<details class="fruit-status-guide">([\s\S]*?)<\/details>/)?.[1];
  expect(guide).toContain('<summary>Panduan status konten &amp; buah</summary>');
  expect([...guide.matchAll(/<th scope="row">(.*?)<\/th>/g)].map((match) => match[1]))
    .toEqual(['Menunggu review', 'ACC / relevan', 'Basi', 'Tidak relevan', 'Duplikat']);
  expect(guide).toContain('Level 3');
  expect(guide).toContain('Slot kosong');
  expect(guide).toContain('tanpa reward Air/Pupuk kedua kali');
});

it('presents fruit states in a labelled table with color names and keyboard scrolling', () => {
  const guide = html.match(/<details class="fruit-status-guide">([\s\S]*?)<\/details>/)?.[1];
  expect([...guide.matchAll(/<th scope="col">(.*?)<\/th>/g)].map((match) => match[1]))
    .toEqual(['Status konten', 'Warna / kondisi buah', 'Posisi buah', 'Artinya']);
  expect(guide).toContain('<caption class="sr-only">');
  expect(guide).toContain('aria-describedby="fruitGuideScrollHint" tabindex="0"');
  expect(guide).toContain('is-ripe" aria-hidden="true"></span>Merah matang');
  expect(guide).toContain('is-rotten" aria-hidden="true"></span>Cokelat busuk');
  expect(guide).toContain('is-empty" aria-hidden="true"></span>Belum ada buah');
  expect(guide).not.toContain('<dl');
});
