// Character management for web-v2.

const CHAR_ACCENT = {
  francisco: 'var(--ridge)',
  laura: 'var(--sky)',
  erik: 'var(--glacier)',
  daniela: 'var(--moss)',
  blake: 'var(--summit)',
  irina: 'var(--alert)',
};

const CHAR_STARS = {
  francisco: 3,
  laura: 2,
  erik: 4,
  daniela: 4,
  blake: 5,
  irina: 4,
};

export async function loadCharacters() {
  const res = await fetch('../../data/characters.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load characters.json: HTTP ${res.status}`);
  const raw = await res.json();
  return raw.map((c) => ({
    ...c,
    accent: CHAR_ACCENT[c.id] || 'var(--summit)',
    stars: CHAR_STARS[c.id] || 3,
  }));
}

export function getCharacterById(characters, id) {
  return characters.find((c) => c.id === id) || null;
}

export function selectRandomCharacter(characters) {
  const pool = characters.filter((c) => c.id !== 'random');
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
