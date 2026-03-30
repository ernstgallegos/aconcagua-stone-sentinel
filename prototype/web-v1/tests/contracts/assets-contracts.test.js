import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const charactersPath = new URL('../../../../data/characters.json', import.meta.url);

async function fileExists(url) {
  try {
    await access(url);
    return true;
  } catch {
    return false;
  }
}

test('critical web-v1 visual assets exist in repository', async () => {
  const criticalAssets = [
    new URL('../../../../art/cover/cover-concept-1.png', import.meta.url),
    new URL('../../../../art/characters/random.png', import.meta.url),
    new URL('../../../../art/concept-art/curated/concept-curated-4.webp', import.meta.url),
  ];

  for (const assetUrl of criticalAssets) {
    assert.equal(await fileExists(assetUrl), true, `Missing required visual asset: ${assetUrl.pathname}`);
  }
});

test('all declared character portraits have a matching art asset', async () => {
  const characters = JSON.parse(await readFile(charactersPath, 'utf8'));
  const nameMap = {
    francisco: 'francisco-aguirre',
    laura: 'laura-kim',
    erik: 'erik-lundvall',
    daniela: 'daniela-de-rossi',
    blake: 'blake-harris',
    irina: 'irina-orlova',
  };
  for (const character of characters) {
    const filename = nameMap[character.id];
    assert.ok(filename, `Character id '${character.id}' is missing from image mapping.`);
    const part1Asset = new URL(`../../../../art/characters/${filename}.png`, import.meta.url);
    const part2Asset = new URL(`../../../../art/characters/part-2/${filename}.png`, import.meta.url);

    const hasPart1 = await fileExists(part1Asset);
    const hasPart2 = await fileExists(part2Asset);
    assert.equal(hasPart1 || hasPart2, true, `Missing portrait for character '${character.id}'`);
  }
});
