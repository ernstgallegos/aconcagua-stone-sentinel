# Character portraits alternatives (Part 2)

This folder is reserved for **Part 2 alternative portraits** used by the Part 2 character carousel (`screen-part2-character`).

## Runtime usage

- Preferred source path in code: `../../art/characters/part-2/<filename>.png`.
- Resolver function: `getCharacterImagePath(charId, { part2: true })` in `prototype/web-v1/ui/screens.js`.
- If a Part 2 portrait is missing, runtime falls back automatically to Part 1 image in `../../art/characters/<filename>.png`.

## Naming contract

Part 2 filenames must match the same base names as Part 1 to preserve automatic mapping:

- `francisco-aguirre.png`
- `laura-kim.png`
- `erik-lundvall.png`
- `daniela-de-rossi.png`
- `blake-harris.png`
- `irina-orlova.png`

## Practical workflow

1. Export the Part 2 variant portrait with the exact same filename as Part 1.
2. Save it in this `part-2/` directory.
3. Reload the prototype: Part 2 carousel will pick the variant automatically.
4. Remove/rename the file to verify fallback behavior to Part 1.

> Note: `random.png` is not used in the current Part 2 carousel flow.
