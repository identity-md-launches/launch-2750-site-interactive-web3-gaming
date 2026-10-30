# Squeek Play

A responsive Squeekchain companion with a live WHEELY9000 wheel, a playable four-lane derby, a SqueekFi power calculator and merge simulator, and an OBS browser source.

The finished static site is in **`dist/`**. It includes its fonts, wallet marks, favicon, and share image. Vite uses `base: './'`; hash navigation and relative assets work under a static-hosting subpath.

## Install, preview, rebuild

Validated with Node.js 24 and npm 11.

```sh
npm ci
npm run dev
```

To check and rebuild the production export:

```sh
npm run typecheck
npm run build
npm run preview
```

`npm run preview` serves `dist/` (normally at port 4173). You can also serve the existing export with any static HTTP server, for example `python3 -m http.server 4173 --directory dist`. Open it through HTTP rather than opening `index.html` as a file.

After changing the source, rebuild and include the complete new `dist/`. Do not submit dependency directories, caches, or old hashed build files. `dist/` is a required deliverable; no ignore-file change was made.

## How it works

- **Live header:** browser requests go directly to [status](https://api.squeekchain.com/v1/status) every 2 seconds and [economy state](https://api.squeekchain.com/v1/economy/state) every 10 seconds. The documented device state `ACTIVE` maps to the requested SPINNING label (`SPINNING` is also supported); `IDLE` stays idle, and `COUNTER_FAULT` stops the hardware visualization and racer. Requests have an 8-second timeout. Polling pauses in a hidden document and resumes on return. No recorded or generated telemetry is shown as live.
- **Derby:** start the 5-metre race, then repeatedly press Space or select Sprint. Squeektoshi travels at `measurement.speedMmPerSecond`; the other two opponents are explicitly AI. Player speed increases with each sprint and decays between presses. Pause, resume, reset, and replay work locally. Leaving the Derby tab resets its race; hiding the document pauses it. No prizes, shared leaderboard, or transactions are implied.
- **Canvas:** angular velocity is `rpmMilli / 1000 × 2π / 60` radians/second, integrated using animation timestamps. Zero RPM produces no wheel rotation. Stale, faulted, or unavailable hardware stops the live racer and wheel. Device state and numeric readings remain distinct: the API can report IDLE with nonzero RPM. Animation can be paused; reduced-motion preference stops the decorative motion while retaining numeric updates and game functionality.
- **SqueekFi:** `W = P + S × (1 + P/1000) / c`. The NFT power range covers all displayed protocol tiers with integer steps; the adjacent numeric field accepts exact powers and stays synchronized with the slider. The live `staking.sqkPerPower` determines `c`. Pool share adds the hypothetical weight to current NFT + SQK pool power. The next-24-hour estimate uses the remaining funded stream, its expiry, and pause state. It does not promise a future deposit or subtract an existing wallet position. An unfunded stream correctly estimates zero.
- **Merge tree:** all ten live `nft.basePower` tiers and `nft.cooldownBlocks` are selectable. Each merge consumes two equal-level inputs in the simulation; the view shows combined-input boost, required level-1 NFTs, and tier cooldown. These are previews, never on-chain merge transactions. When economy data is missing or stale, reference parameters from the public API on 2026-10-30 are identified as such, and reward estimates become unavailable.
- **Streamer HUD:** configure dark/light/transparent appearance, compact layout, and the block counter. Copy the generated URL into an OBS Browser Source at 800 × 300 px (480 × 320 compact). The `#overlay=1` view hides the companion UI and has a transparent page. It displays the same direct feed with no playback buffer. HTTP polling and network/API delays mean literal zero latency cannot be guaranteed.
- **Wallet:** one connection sheet uses wagmi EIP-6963 discovery, an injected browser fallback, Coinbase Wallet/Smart Wallet, and mobile links for MetaMask, Coinbase Wallet, Rabby, and Phantom. The connected address, disconnect action, and Sepolia switch use wagmi. This companion never requests a signature, transfers assets, or sends a transaction. No relay or project ID is required.

Sepolia block height is `economy.chain.indexedThroughBlock`, so it is the API's indexed height, not an independently queried chain tip. Squeek block progress is `builder.projected.blockProgress / 1e7` percent (falling back to the settled anchor). Work units are cumulative within the API's hardware counter epoch. The HUD's optional block is the Squeek block, distinctly labeled. Field definitions and device states are in the [official API documentation](https://docs.squeekchain.com/developers/api/). The wallet's public Sepolia transport is configured in `src/wallet.tsx`.

## Validation

```sh
npx playwright install chromium webkit
npm run check:interactions
```

On Linux, Playwright may also need its documented browser system dependencies. The check script starts and closes its own bounded HTTP server, tests the production export under `/preview/`, and writes only to `test/scratch/validation/`. Its synthetic API/provider fixtures exist exclusively in the test process. They are not shipped as application data.

Revision results on 2026-10-30 (the five reopened findings were reproduced before fixing):

| Check | Result |
| --- | --- |
| TypeScript `tsc --noEmit` | Passed |
| Vite production build | Passed |
| Browser interaction checks | **25/25 passed**, including exact power entry for all ten tiers, clipboard invalidation for all three HUD settings, and a mobile WebKit race/tab flow |
| axe scans | No reported violations in Derby, SqueekFi, HUD settings, or the wallet dialog states tested |
| Responsive reflow | No horizontal overflow across all three sections at 320, 390, 768, and 1440 px |
| First screen at 390 × 844 | All four lanes, Start race and full 44px Sprint visible; Sprint bottom at 838.8 px, before and after Start race at scrollY=0 |
| Pinned taste@1 probe | Derby **14/16**, SqueekFi **15/16** raw passes. Required status emoji remain; Derby also counts the new factual local-race disclaimer as a slogan. Calculator chrome passes with zero nested cards |
| Live integration | Both named API endpoints returned HTTP 200; the browser displayed real idle hardware and updating indexed Sepolia heights |

The build emits a dependency warning about `node:worker_threads` in an unused Tempo path of `ox`. The tested browser flows had no uncaught script errors or failed local resources. Checks ran from an isolated temporary mirror using the unchanged lockfile, and the rebuilt export was copied back. Browser dependencies and temporary runtime libraries stayed outside the submission; no browser binaries or package archives are included. The first WebKit attempt could not launch with the default runtime; a temporary launcher using the available libraries and software graphics completed the final WebKit check. These are emulated browser checks, not a physical iPhone test.

Real wallet approvals, passkey creation, network switching with a real wallet, physical mobile apps, actual OBS broadcasting, native 200% browser zoom, and a screen-reader session were not performed. The transparent HUD's contrast depends on the stream underneath it. See [the consolidated validation record](artifacts/validation.md), [raw interaction results](artifacts/interaction-results.json), and [design documentation](DESIGN.md) for coverage and limits. These are worker observations, not independent certification.

## Source map and attribution

`src/App.tsx` contains the header and hash tabs; `src/telemetry.ts` handles live polling; `src/model.ts` contains race and calculation logic. Feature views are `Derby.tsx`, `Wheel.tsx`, `SqueekFi.tsx`, and `Hud.tsx`. `wallet.tsx` contains the sole wallet configuration and connection UI. `src/styles.css` defines the visual system. `scripts/validate.mjs` exercises the production export.

The wheel, hamster illustrations, UI icons, favicon, and share artwork are local SVG/Canvas artwork created for this companion. Font license notices are beside the fonts in `src/assets/`. Mobile wallet marks come from RainbowKit's wallet artwork. Better Interface and Impeccable guidance attribution/licenses are retained in `artifacts/design-guidance-LICENSE`.
