# Web Vertical Slice v1

HTML-first prototype that replays bundled MRA v0 runs with an expanded summary panel and turn timeline.

## Files

- `index.html`: static UI shell
- `styles.css`: visual style for the vertical slice
- `app.js`: scenario selection, run loading, rendering and API/static fallback

## Local preview

From repository root:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/prototype/web-v1/`.

## Deployment

`vercel.json` rewrites `/` to this prototype entrypoint (`/prototype/web-v1/index.html`) and keeps `/api/run` available for serverless data loading.
