# Equation Hi-Lo

The HayzGames product website at https://equation-hi-lo.github.io/.
Plain HTML, CSS, and JavaScript; no package install or build step required.

## Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173. Refresh after editing files.

## Files

- `index.html`: product page, gameplay overview, family math-practice section, reviews, and FAQ.
- `styles.css`: shared design and responsive layouts.
- `site.js`: mobile navigation and interactive example.
- `equation-optimizer.html` and `script.js`: legal four-card equation optimizer, sharing the online game’s search.
- `play.html`, `play.css`, and `play.js`: a three-player table against two computer opponents.
- `game-engine.mjs`: card dealing, legal equation search, betting turns, tie breakers, and pot settlement.
- `images/`: local Etsy product photos, source notes, and favicon.
- `fonts/`: self-hosted DM Sans and Fraunces with their licenses.

## Verify

```sh
node tests/optimizer.test.cjs
node --test tests/game-engine.test.mjs
```

The optimizer accepts exactly four whole numbers from 0 to 10, including repeated values. It starts with +, −, and ÷, using each number and operation once. Selecting × clears previous results and disables calculation until the player unchecks + or −; ÷ cannot be removed. Turning × off restores the starting operations. No parentheses or repeated binary operations are allowed. The square-root checkbox represents one √ card, which must apply to exactly one number. The solver shares the online game’s precedence and legal-equation search. Input changes clear stale results; division by zero is excluded. Each search evaluates the legal hand once and ranks both low (1) and high (20), keeping the eight closest distinct result values for each. Both sides state the displayed count and full distinct-result count; equations with the same answer count once, so this is not a count of permutations. Each side initially shows only its best equation, with the remaining suggestions collapsed. An exact swing message appears only when the same hand and selected operations can make both 1 and 20 (within the game engine’s floating-point tolerance); this does not guarantee winning tie breakers. Each new search starts collapsed.

## Online game

The online table follows the supplied Equation Hi-Lo rulebook, with the owner's clarifications: starting operations are +, −, and ÷; numbers are 0–10 in four colors; an uncontested side takes the whole pot; if every swing fails, the pot carries into the next hand.

Each player receives a separate hidden number and two open numbers before the first bet, then a final open number. Drawn × cards replace a discardable operation (never ÷). Drawn √ cards are retained. Further specials drawn as replacements are discarded until a number appears. Every number and held operation is required once. Square roots attach to distinct individual number cards; expressions use normal precedence without parentheses. Division by zero is invalid.

Players ante one chip and must hold at least five to enter a hand. Betting uses check, call, raise, and fold, capped at the smallest remaining stack at the start of each betting round. Each raise reopens action until all remaining players match the bet. Equations lock before the final bet; low/high/swing choices stay hidden until the reveal. Swing players supply two legal arrangements and must beat the original field on both sides. Failed swings receive nothing; the remaining eligible players win. High/low split the pot, discarding an odd chip. Ties use the highest/lowest raw number, then its highest/lowest color. Color rank is Pink Mouse < Orange Tiger < Grey Elephant < Yellow Giraffe.

Online settings and interpretations:

- 20 play chips per player, two computer opponents, rotating first seat; play continues while you and at least one opponent can enter.
- The 44 number cards leave eight specials in the 52-card deck. The current implementation assumes four × and four √; their exact split has not been explicitly confirmed.
- Multiple square roots apply to separate numbers (no nested roots).
- Each betting round has a fixed cap set by the shortest starting stack; there are no side pots.
- Multiple swings qualify against the original field simultaneously; removing one failed swing cannot rescue another failed swing.
- The first betting round may be skipped, as allowed by the rulebook.

Friendly opponents choose from their three closest distinct results. Challenge opponents choose a closest result. Computers plan using only their own cards and commit before the human locks an equation or picks a marker. Betting varies with hand strength; they can check, call, raise, or fold. Optional hints search only your own legal hand, and the reveal includes arithmetic steps and the closest available low/high equations.

Tests cover the rulebook's examples, zero cards, special-card replacement, mandatory operations, square roots, betting turn order, raises, chip limits, folds, color ties, odd pots, successful/failed swings, carried pots, and simulated matches with chip conservation. The optimizer retains its separate regression tests.

Everything runs locally in the browser: no account, server-side state, real-money wagering, or saved personal data. Refreshing resets the match. The family section describes opportunities to practice arithmetic and reasoning without promising measured learning outcomes; the recommended age remains 10+.

## Publishing

Push the reviewed changes to the repository's GitHub Pages source branch to publish. Local previewing does not update the public website.

Product photos and review excerpts came from the supplied Etsy listing. The developer story comes from the original website. See `images/README.md` for provenance and the one unresolved component-count discrepancy.
