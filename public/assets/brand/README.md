# Brand assets — naming rules

Drop logo files in **this folder** (`public/assets/brand/`). Files in `public/` are
served from the site root, so a file here is reachable at
`https://fxlab.partykeys.ai/assets/brand/<filename>` — **no import or rebuild needed**,
just drop it in and refresh.

The app looks for a fixed set of filenames (see "Required / used by the app" below). Match
those names exactly and the logo appears automatically; otherwise the app falls back to the
gradient "P" mark.

## Naming convention

```
logo-<type>[-<variant>][@<density>].<ext>
```

Lowercase, kebab-case, always prefixed with `logo-`.

| Part | Allowed values | Meaning |
|------|----------------|---------|
| `<type>` | `mark` · `wordmark` · `lockup` | `mark` = square icon only · `wordmark` = the word "PartyKeys" only · `lockup` = mark + word together |
| `<variant>` | `-dark` · `-light` · `-mono` | optional. `-dark` for use on light bg, `-light` for dark bg, `-mono` = single-color |
| `<density>` | `@2x` · `@3x` | optional, **raster only** (PNG). Omit for 1x and for SVG |
| `<ext>` | `svg` (preferred) · `png` · `webp` | prefer **SVG**; use PNG/WebP only for raster art |

### Examples
```
logo-mark.svg            ✅ primary square icon (what the header + gate use)
logo-mark@2x.png         ✅ raster fallback at 2x
logo-wordmark.svg        ✅ just the "PartyKeys" word
logo-lockup-light.svg    ✅ mark + word, light version for dark backgrounds
favicon.svg              ✅ browser tab icon
PartyKeys_Logo_FINAL.png ❌ no caps, no underscores, no "final"
```

## Required / used by the app

| Filename | Where it's used | Notes |
|----------|-----------------|-------|
| **`logo-mark.svg`** | header + audio-gate icon | **the one to add first.** Square-ish, ~1:1. Transparent background recommended. If missing → gradient "P" fallback. |
| `favicon.svg` | browser tab | optional. Linked from `index.html`. |
| `logo-wordmark.svg` | (reserved) | optional, for future full-logo placements |

## Guidelines
- **Square mark** should look good at 44px (header) and 64px (gate). Test small.
- Transparent background — the app applies its own rounded corners / glow.
- Keep SVGs optimized (run through SVGO) and under ~50 KB.
- Don't hard-code colors that clash with the dark UI; the mark sits on a near-black bg.
