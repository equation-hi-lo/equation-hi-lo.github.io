# Equation Hi-Lo

The HayzGames product website at https://equation-hi-lo.github.io/.
Plain HTML, CSS, and JavaScript; no package install or build step required.

## Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173. Refresh after editing files.

## Files

- `index.html`: product page, gameplay overview, interactive example, reviews, and FAQ.
- `styles.css`: shared design and responsive layouts.
- `site.js`: mobile navigation and interactive example.
- `equation-optimizer.html` and `script.js`: arithmetic practice tool.
- `images/`: local Etsy product photos, source notes, and favicon.
- `fonts/`: self-hosted DM Sans and Fraunces with their licenses.

## Verify the optimizer

```sh
node tests/optimizer.test.cjs
```

The sandbox uses each supplied number once, supports repeated numbers, and searches binary arithmetic expressions with parentheses. Operators may repeat; optional square roots apply to individual cards. It is a practice tool, not an implementation of every physical-game rule. The interface states these boundaries.

## Publishing

Push the reviewed changes to the repository's GitHub Pages source branch to publish. Local previewing does not update the public website.

Product photos and review excerpts came from the supplied Etsy listing. The developer story comes from the original website. See `images/README.md` for provenance and the one unresolved component-count discrepancy.
