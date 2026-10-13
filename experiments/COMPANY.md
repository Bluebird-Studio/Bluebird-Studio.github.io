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
- **C**: cross-project technical lead, integrator, CI reviewer, rescue coder, PR merger and task dispatcher.
- Every agent owns **the entire product outcome**, not a token-sized task. Its assigned scope is a *conflict-avoidance preference*; if idle, take the best unclaimed, shippable work without clobbering in-flight changes.
- On every execution read `main`, PRs, recent commits, CI, and these acceptance criteria; then **write actual code** and run available verification. Prefer one sizeable coherent PR per substantial increment. Avoid duplicate PRs and repetitive planning-only runs.
- Merge a verified end-to-end increment at the first safe opportunity. Do not delay integration till morning. Do not merge known broken code. CI green alone is not proof of browser interactivity.
- Coordination in a shared repo: each game stays exclusively within its corresponding directory. Within each game, coordinate changed filenames and PR authorship to avoid branch divergence; don't rewrite a teammate's files without inspecting current work.
- If a worker stalls, lead must diagnose logs and unblock first. After **two materially unproductive executions** with no concrete blocker fix, research factual gameplay systems online (official docs/tutorials and encyclopedic descriptions only, do not copy copyrighted assets/content) and add a **small concrete gameplay feature** with a test and acceptance criteria. Examples: crafting and survival mechanics for voxel; varied deliveries, timed missions, police pursuit for city.
- On last scheduled cycle, lead must merge **only verified** PRs, check hosted URLs or clearly report missing access, record actual test/build statuses, leave next-actions. Do not deactivate schedules prematurely; schedules expire by COUNT automatically. Do not modify unrelated existing automations.

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
