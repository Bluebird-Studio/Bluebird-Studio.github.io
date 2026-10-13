# Voxel Frontier survival integration handoff

Branch: `feat/voxel-survival-crafting-mobile` (VF-B). Do not merge before VF-A's engine branch `feat/voxel-core-physics-ready` (or its consolidated successor).

The game entrypoint now imports `survival-app.mjs` and `survival.css`. On boot the survival app waits for `window.voxelFrontier`, which VF-A's engine exposes. It wraps `api.world.set` to debit placements and credit mining, then renders inventory, Stone Pickaxe crafting, Signal Beacon crafting and manual beacon placement/victory. Touch movement/look/mine/place, world reset and local persistence are wired.

Tests: 11 inventory/event tests from prior handoff passed locally; a reconstructed browser fixture using Chromium/Playwright passed mine→craft pickaxe→craft beacon→place beacon→victory, resource persistence writes and mobile touch mining/look. **This was a mocked engine fixture, not a real-world or hosted browser smoke test.** GitHub Actions PR-head checks have not run because PR creation is blocked by connector safety checks.

Next: VF-A engine merges first; create PR for this branch against latest main, verify JS and unit CI, run real hosted desktop/mobile browser tests, then self-merge only if all green. Avoid direct main pushes.
