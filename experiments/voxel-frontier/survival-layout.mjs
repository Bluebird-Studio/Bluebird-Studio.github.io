export function mountLayout() {
  const root = document.createElement('div');
  root.id = 'survival-layer';
  root.innerHTML = `
    <div id="expedition-hud" aria-live="polite">
      <button id="pack-toggle" type="button" aria-controls="pack-panel" aria-expanded="false">PACK <kbd>E</kbd></button>
      <div class="expedition-status"><span id="day-clock">DAYLIGHT</span><span id="quest-line">Gather stone and wood to craft your first tool</span></div>
    </div>
    <aside id="pack-panel" aria-label="Expedition backpack and crafting" hidden>
      <div class="pack-heading"><div><span class="eyebrow">FIELD JOURNAL / 01</span><h2>EXPEDITION</h2></div><button id="pack-close" aria-label="Close backpack">x</button></div>
      <div class="pack-subheading">SUPPLIES <span id="mined-total">0 MINED</span></div>
      <div id="resource-grid" class="resource-grid"></div>
      <div class="pack-subheading">WORKBENCH <span>CRAFT TO ADVANCE</span></div>
      <div id="craft-grid" class="craft-grid"></div>
      <div class="pack-subheading">EXPEDITION GOALS <span id="goal-count">0 / 3</span></div>
      <div class="progress-track"><div id="goal-progress"></div></div>
      <ol id="goal-list" class="goal-list"></ol>
      <div class="pack-help">WASD MOVE / SPACE JUMP / SHIFT SPRINT<br>LEFT CLICK MINE / RIGHT CLICK BUILD / 1-3 SELECT</div>
      <div class="pack-footer"><button id="sound-toggle">SOUND: ON</button><button id="reset-world">RESET WORLD</button></div>
      <button id="resume-game" class="resume-game">RETURN TO WORLD</button>
    </aside>
    <div id="mobile-controls" aria-label="Touch game controls">
      <div class="touch-pad"><button data-code="KeyW" aria-label="Move forward">UP</button><div><button data-code="KeyA" aria-label="Move left">LEFT</button><button data-code="KeyS" aria-label="Move backward">DOWN</button><button data-code="KeyD" aria-label="Move right">RIGHT</button></div><button data-code="Space" aria-label="Jump">JUMP</button></div>
      <div class="touch-actions"><button data-action="mine">MINE</button><button data-action="place">BUILD</button></div>
    </div>`;
  document.querySelector('#game').append(root);
  return root;
}
