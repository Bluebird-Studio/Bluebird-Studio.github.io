# Bluebird Studio — Overnight game company experiment

**Timebox:** night of 2026-10-13/14 (Europe/Bucharest). Four hourly development agents, one hourly cross-project technical lead. No indefinite schedules.

**Goal:** minimize elapsed time to TWO real, enjoyable, visually polished, verifiably playable browser releases; then prepare distribution-ready Android/iOS packaging wherever practical. Actual App Store publication requires owner-owned accounts, signing, review, compliant metadata and real-device testing. Never equate a web deployment with app-store approval.

## Workspaces

- `experiments/voxel-frontier/`: original voxel-world survival/building prototype, inspired by sandbox building games, NOT Minecraft-branded or using copied assets/code.
- `experiments/neon-streets/`: original retro top-down driving/adventure prototype, inspired by classic city-driving games, NOT GTA-branded or using copied assets/code.

Both are independent static web applications published beneath the existing studio Pages site. Do **not** modify the homepage, unrelated projects, or existing Pages deployment workflow. Do not introduce dependencies that require a build step unless the shared Pages workflow is extended correctly. Use the public browser preview as primary integration target.

## Agent schedule and decision principles

- **VF-A**: Voxel world/controls/gameplay; **VF-B**: Voxel gameplay systems/UI/polish.
- **NS-A**: City simulation/driving/traffic; **NS-B**: City missions, interaction, UI/polish.
- **C**: cross-project technical lead, post-merge QA auditor, rescue coder and adaptive task dispatcher; not a routine pre-merge bottleneck.
- Every agent owns **the entire product outcome**, not a token-sized task. Its assigned scope is a *conflict-avoidance preference*; if idle, take the best unclaimed, shippable work without clobbering in-flight changes.
- On every execution read `main`, PRs, recent commits, CI, and these acceptance criteria; then **write actual code** and run available verification. Prefer one sizeable coherent PR per substantial increment. Avoid duplicate PRs and repetitive planning-only runs.
- **Worker-owned integration:** Each of the four developers creates and merges its OWN verified PR into `main` as soon as it is safe. Never push a raw commit directly to `main`. Inspect the PR file diff and scope, validate actual passing GitHub Actions against its current head, confirm no known severe gameplay regression and no merge conflict against current `main`; squash-merge with expected head SHA; verify main and continue developing. If these checks are unavailable, pending, failed or conflicted, leave PR open and fix or hand off exact blocker. No forced merges, bypasses or changes to the site homepage or other game. CI green alone is not proof of browser interactivity.
- Coordination in a shared repo: each game stays exclusively within its corresponding directory. Within each game, coordinate changed filenames and PR authorship to avoid branch divergence; don't rewrite a teammate's files without inspecting current work.
- **Adaptive lead:** After ONE demonstrably unproductive worker execution, investigate the actual changes, logs and blockers; distinguish pending external checks from inactivity; fix integration issues hands-on and, if permitted, rewrite only that worker's scheduled task prompt with a measurable higher-impact goal while preserving its timing and expiry. Research factual gameplay patterns when the next valuable increment is unclear (without copying copyrighted assets/content). The lead audits already merged changes, tests hosted game behavior and rapidly repairs regressions rather than rubber-stamping each worker's PR.
- **Throughput principle:** A commit, PR or passing test is a checkpoint, not permission to end the execution. Continue with the next largest safe game improvement while session capacity permits. Measure verified playable capability integrated into main per elapsed time, not amount of code or administration. On the final scheduled cycle, lead reconciles only verified outstanding PRs, checks URLs or clearly reports missing access, records actual build/runtime test status and next actions. Do not deactivate schedules prematurely; schedules expire by COUNT automatically. Do not modify unrelated existing automations.

## Minimum playable slice — Voxel Frontier

A scene with deterministic terrain; useful first-person camera and movement; mine/place with clear selection; inventory/resource accounting; simple crafting (at least 2 recipes); save/load; visible world variety; helpful onboarding; mouse + mobile touch input; pause/restart; accessible UI where possible; frame-rate acceptable on typical desktop/mobile; no runaway draw-call explosion.

## Minimum playable slice — Neon Streets

Scrolling top-down city; controllable vehicles with believable acceleration/braking/collisions; traffic/pedestrians; missions with clear pickup, destination and completion; basic missions variety (delivery, timed route, chase); score/cash/progression persisted; map/minimap/navigation cues; keyboard + touch; polished UI, sound toggles and responsive layout; pause/restart; no copied GTA IP.

## Release gates for each game

1. Game opens and is **actually playable in the browser** at its route, not just a loading screen.
2. Core mechanic, progression, failure/restart, input and storage work, backed by repeatable tests and a human-followable smoke-test checklist.
3. Static files and assets deploy via Pages; error-free JS parse; no obvious missing references; CI green.
4. Visually cohesive, responsive desktop and mobile layout with readable instructions and controls.
5. Store-submission packaging **reported separately** from live web status: at minimum document Android/iOS build/release steps; only claim an AAB/IPA and store submission if genuinely built/signed/tested, and never invent credentials.

## Operational rule

Don't spend iterations producing performance reports, giant speculative design docs or new issue taxonomies. Code, integrate, verify, ship, then polish. Keep each run's GitHub comment factual and short: PR/commit, checks, visible progress, blocker, next most valuable task.
