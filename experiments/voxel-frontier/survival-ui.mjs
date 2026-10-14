import { RECIPES, canCraft } from './inventory.mjs';
import { renderGoals } from './survival-progress.mjs';
export function makeUI(root, state) {
  const $ = id => root.querySelector('#' + id);
  const panel = $('pack-panel');
  const place = document.createElement('button');
  place.id = 'place-beacon';
  place.className = 'resume-game';
  place.textContent = 'PLACE SIGNAL BEACON';
  panel.insertBefore(place, $('resume-game'));
  const victory = document.createElement('p');
  victory.id = 'victory';
  victory.textContent = 'EXPEDITION COMPLETE — YOUR SIGNAL LIGHTS THE FRONTIER!';
  victory.hidden = true;
  panel.insertBefore(victory, $('resume-game'));
  function render() {
    $('mined-total').textContent = state.mined + ' MINED';
    $('resource-grid').innerHTML = ['grass','stone','wood'].map(type =>
      '<div class="resource ' + type + '"><b>' + state.inventory[type] + '</b><span>' + type.toUpperCase() + '</span></div>').join('');
    $('craft-grid').innerHTML = Object.entries(RECIPES).map(([id, recipe]) =>
      '<div class="recipe"><div><b>' + recipe.name + '</b><small>' +
      Object.entries(recipe.cost).map(([type,n]) => n + ' ' + type).join(' · ') +
      '</small></div><button data-recipe="' + id + '" ' + (canCraft(state,id) ? '' : 'disabled') +
      '>' + (state[id] ? 'CRAFTED' : 'CRAFT') + '</button></div>').join('');
    renderGoals(root, state);
    document.querySelectorAll('#hotbar [data-block]').forEach(button => {
      let count = button.querySelector('.hotbar-count');
      if (!count) { count = document.createElement('span'); count.className = 'hotbar-count'; button.append(count); }
      count.textContent = state.inventory[button.dataset.block] || 0;
    });
  }
  return { render, $ };
}
