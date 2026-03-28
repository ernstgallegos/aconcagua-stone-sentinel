# Character portraits (Part 1)

This folder contains the canonical PNG portraits used by the **Part 1** character carousel in `prototype/web-v1`.

## Runtime usage

- Source path in code: `../../art/characters/<filename>.png`.
- Resolver function: `getCharacterImagePath(charId, { part2: false })` in `prototype/web-v1/ui/screens.js`.
- This is the default source for the expedition setup carousel (`screen-expedition-setup`).

## Naming contract

Use lowercase kebab-case filenames and keep one portrait per character ID:

- `francisco-aguirre.png` → `francisco`
- `laura-kim.png` → `laura`
- `erik-lundvall.png` → `erik`
- `daniela-de-rossi.png` → `daniela`
- `blake-harris.png` → `blake`
- `irina-orlova.png` → `irina`
- `random.png` → random card in Part 1 setup

## Format recommendations

- Preferred format: square PNG (1024×1024 recommended).
- Keep subject centered so `object-fit: contain` renders consistently across breakpoints.
- Avoid changing filenames unless code mapping is updated in the same commit.
