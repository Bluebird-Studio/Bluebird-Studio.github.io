export function renderGoals(root, state) {
  const $ = id => root.querySelector('#' + id);
  const goals = [
    ['Gather 3 stone and 2 wood', state.pickaxe || state.inventory.stone >= 3 && state.inventory.wood >= 2],
    ['Craft Stone Pickaxe', state.pickaxe],
    ['Craft Signal Beacon', state.beacon],
    ['Place Signal Beacon', !!state.beaconPosition]
  ];
  $('goal-list').innerHTML = goals.map(([label, done]) =>
    '<li class="' + (done ? 'complete' : '') + '">' + (done ? '✓' : '○') + ' ' + label + '</li>').join('');
  const completed = goals.filter(([, done]) => done).length;
  $('goal-count').textContent = completed + '/4';
  $('goal-progress').style.width = completed * 25 + '%';
  $('quest-line').textContent = state.beaconPosition ? 'EXPEDITION COMPLETE · SIGNAL LIT' :
    state.beacon ? 'PLACE THE SIGNAL BEACON FROM YOUR PACK' :
    state.pickaxe ? 'GATHER 8 STONE, 4 WOOD, 2 GRASS' : 'MINE STONE AND WOOD · CRAFT A PICKAXE';
  $('place-beacon').hidden = !state.beacon || !!state.beaconPosition;
  $('victory').hidden = !state.beaconPosition;
}
