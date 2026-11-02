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
  expect([...guide.matchAll(/<dt>(.*?)<\/dt>/g)].map((match) => match[1]))
    .toEqual(['Menunggu review', 'ACC / relevan', 'Basi', 'Tidak relevan', 'Duplikat']);
  expect(guide).toContain('Level 3');
  expect(guide).toContain('Slotnya kosong');
  expect(guide).toContain('tanpa reward Air/Pupuk kedua kali');
});
