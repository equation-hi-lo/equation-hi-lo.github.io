import {
  COLORS, MINIMUM_CHIPS, createGame, startHand, discardOperation,
  bettingActions, actBet, foldHand, lockEquation, declareSide, evaluateEquation,
  closestEquations, chooseComputerPlan, chooseComputerBet, chooseComputerDiscard, formatValue
} from './game-engine.mjs';

const $ = selector => document.querySelector(selector);
const table = $('#match');
let game;
let plans = new Map();
let draft;
let swingDrafts;
let swingSide = 'low';
let marker = 'low';
let hintTarget = 20;
let hint = null;
let best = null;
const cloneDraft = value => ({ order: [...value.order], operators: [...value.operators], roots: [...value.roots] });
const you = () => game.players[0];
const active = player => player.inHand && !player.folded;
const sideName = side => ({ low: 'Low · 1', high: 'High · 20', swing: 'Swing · 1 & 20' })[side];
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function attempt(action) {
  $('#game-error').hidden = true;
  try { action(); advance(); render(); }
  catch (error) { $('#game-error').textContent = error.message; $('#game-error').hidden = false; }
}

function nextHand() {
  plans = new Map();
  draft = null;
  swingDrafts = null;
  swingSide = 'low';
  marker = 'low';
  hint = null;
  best = null;
  startHand(game);
}

function advance() {
  // Computers commit from their own cards before the human locks an equation or reveals a marker.
  for (let step = 0; step < 500; step++) {
    if (game.phase === 'exchange') {
      const player = game.players.find(player => player.id && active(player) && player.exchanges);
      if (!player) return;
      discardOperation(game, player.id, chooseComputerDiscard(player));
    } else if (game.phase === 'building') {
      const player = game.players.find(player => player.id && active(player) && !player.primary);
      if (!player) return;
      const plan = chooseComputerPlan(player, game.difficulty);
      if (!plan) { foldHand(game, player.id); continue; }
      plans.set(player.id, plan);
      lockEquation(game, player.id, plan.primary.draft);
    } else if (game.phase === 'betting') {
      const id = game.betting.turn;
      if (id === 0) return;
      const options = bettingActions(game, id);
      const move = chooseComputerBet({ ...options, canRaise: options.canRaise && game.betting.raises < 2 }, plans.get(id)?.confidence ?? 0.5);
      actBet(game, id, move.action, move.amount);
    } else if (game.phase === 'choosing') {
      const player = game.players.find(player => player.id && active(player) && !player.declaration);
      if (!player) return;
      const plan = plans.get(player.id);
      declareSide(game, player.id, plan.side, { low: plan.low.draft, high: plan.high.draft });
    } else return;
  }
  throw new Error('The table could not finish this turn. Start a new match to try again.');
}

function currentDraft() { return game.phase === 'choosing' ? swingDrafts[swingSide] : draft; }
function resultFor(value) {
  try { return { equation: evaluateEquation(you(), value) }; }
  catch (error) { return { error: error.message }; }
}
function ensureDrafts() {
  if (!draft && you().cards.length === 4 && you().operators.length === 3) {
    draft = { order: [], operators: you().operators.map(card => card.id), roots: [] };
  }
  if (game.phase === 'choosing' && !swingDrafts) {
    swingDrafts = { low: cloneDraft(you().primary.draft), high: cloneDraft(you().primary.draft) };
    marker = Math.abs(you().primary.value - 1) < Math.abs(you().primary.value - 20) ? 'low' : 'high';
  }
}

function numberCard(card, { hidden = false, interactive = false, used = false } = {}) {
  if (hidden) return '<span class="number-card card-back" aria-label="Hidden number card"><strong aria-hidden="true">?</strong><small>Hidden</small></span>';
  const color = COLORS[card.color];
  const tag = interactive ? 'button' : 'span';
  return `<${tag} class="number-card color-${card.color}${used ? ' is-used' : ''}" ${interactive ? `type="button" data-card="${card.id}" ${used ? 'disabled' : ''}` : ''} aria-label="${color.name} ${card.value}, ${color.animal}${card.hidden ? ', hidden card' : ''}">${card.hidden ? '<span class="private-card">PRIVATE</span>' : ''}<strong>${card.value}</strong><small>${color.animal}</small></${tag}>`;
}
function operations(player) {
  return `<div class="operations">${[...player.operators, ...player.roots].map(card => `<span class="operation-card">${card.symbol}</span>`).join('')}<small>${player.id ? 'Their' : 'Your'} operations</small></div>`;
}
function ownHand(interactive = false) {
  return `<p class="hand-label">YOUR CARDS · ${you().cards.length}/4 NUMBERS</p><div class="hand" role="group" aria-label="Your number cards">${you().cards.map(card => numberCard(card, { interactive, used: interactive && currentDraft().order.includes(card.id) })).join('')}</div>${operations(you())}`;
}
function opponents() {
  return `<aside aria-label="Computer opponents"><div class="opponents">${game.players.slice(1).map(player => {
    const revealed = game.phase === 'showdown' && !player.folded && game.result.uncontested === undefined;
    const status = !player.inHand ? 'Needs 5 chips to rejoin' : player.folded ? 'Folded this hand' : revealed ? sideName(player.declaration.side) : 'Hidden card & marker stay secret';
    return `<section class="opponent${player.folded ? ' folded' : ''}"><h3>${player.name}<small>COMPUTER</small></h3><div class="hand" aria-label="${player.name}’s cards">${player.cards.map(card => numberCard(card, { hidden: card.hidden && !revealed })).join('')}</div>${player.inHand ? operations(player) : ''}<p class="opponent-status">${status}</p></section>`;
  }).join('')}</div><details class="table-log" open><summary>This hand’s action</summary><ol>${game.log.map(line => `<li>${escape(line)}</li>`).join('')}</ol></details></aside>`;
}
function heading(kicker, title, description) {
  return `<div class="phase-heading"><p class="eyebrow">${kicker}</p><h2 tabindex="-1" id="phase-heading">${title}</h2><p>${description}</p></div>`;
}
function builder() {
  const value = currentDraft();
  const result = resultFor(value);
  const slots = Array.from({ length: 4 }, (_, index) => {
    const card = you().cards.find(card => card.id === value.order[index]);
    const rooted = card && value.roots.includes(card.id);
    const slot = `<button type="button" class="card-slot${card ? ` is-filled color-${card.color}` : ''}" data-slot="${index}" ${card ? '' : 'disabled'} aria-label="${card ? `Remove ${COLORS[card.color].name} ${card.value} from position ${index + 1}` : `Empty position ${index + 1}`}">${card ? `${rooted ? '√' : ''}${card.value}` : `${index + 1}`}</button>`;
    const picker = index === 3 ? '' : `<label class="operation-picker"><span class="sr-only">Operation ${index + 1}</span><select data-operation="${index}">${you().operators.map(operation => `<option value="${operation.id}" ${value.operators[index] === operation.id ? 'selected' : ''}>${operation.symbol}</option>`).join('')}</select></label>`;
    return slot + picker;
  }).join('');
  const roots = you().roots.length ? `<div class="root-options"><p>Place every √ on a number · ${value.roots.length}/${you().roots.length} placed</p><div>${you().cards.map(card => `<button type="button" class="root-button" data-root="${card.id}" aria-pressed="${value.roots.includes(card.id)}">√ ${card.value} · ${COLORS[card.color].animal}</button>`).join('')}</div></div>` : '';
  return `<div class="builder"><div class="build-label"><span>${game.phase === 'choosing' ? `${swingSide.toUpperCase()} SWING EQUATION` : 'YOUR EQUATION'}</span><span>Tap a placed card to remove it.</span></div><div class="equation-slots" role="group" aria-label="Build your equation">${slots}</div>${roots}<div class="live-result" role="status" aria-live="polite">${result.equation ? `<strong>= ${formatValue(result.equation.value)}</strong><small>${formatValue(Math.abs(result.equation.value - 1))} from low (1) · ${formatValue(Math.abs(result.equation.value - 20))} from high (20)</small>` : `<span>${value.order.length < 4 ? 'Tap your cards in the order you want to play them.' : escape(result.error)}</span><small>${value.order.length}/4 cards placed · Each operation is used once.</small>`}</div><div class="builder-tools"><button type="button" class="quiet-button" data-action="undo" ${value.order.length ? '' : 'disabled'}>↶ Undo</button><button type="button" class="quiet-button" data-action="clear">Clear</button><label>Hint for <select id="hint-target"><option value="1" ${hintTarget === 1 ? 'selected' : ''}>Low · 1</option><option value="20" ${hintTarget === 20 ? 'selected' : ''}>High · 20</option></select></label><button type="button" class="quiet-button" data-action="hint">Show a hint ✳</button></div>${hint ? `<div class="hint-message">Try ${hint.text} = ${formatValue(hint.value)}.<br><button type="button" class="quiet-button" data-action="use-hint">Use this arrangement ↗</button></div>` : ''}<p class="order-reminder">Square roots first, then × and ÷ from left to right, then + and −. Changing an operation swaps its place with the other card.</p></div>`;
}
function lockedEquation() {
  if (!you().primary) return '';
  return `<div class="locked-equation"><p>YOUR LOCKED EQUATION</p><strong>${you().primary.text} = ${formatValue(you().primary.value)}</strong><p>${formatValue(Math.abs(you().primary.value - 1))} from low · ${formatValue(Math.abs(you().primary.value - 20))} from high</p></div>`;
}
function workspace() {
  if (game.phase === 'exchange') return heading('A NEW OPERATION.', 'Make room for ×.', `You drew multiplication. Discard ${you().exchanges === 1 ? 'one operation' : `${you().exchanges} operations`}; your division card stays.`) + ownHand() + `<div class="table-actions"><p>Choose a card to discard.</p><div class="action-row">${you().operators.filter(card => card.symbol !== '÷').map(card => `<button type="button" class="discard-button" data-discard="${card.id}" aria-label="Discard ${card.symbol}">${card.symbol}</button>`).join('')}</div></div>`;
  if (game.phase === 'betting') {
    const options = bettingActions(game, 0);
    return heading(game.betting.street === 1 ? 'FIRST BETTING ROUND.' : 'FINAL BETTING ROUND.', options.call ? 'Your move. Call or raise?' : 'A little confidence?', game.betting.street === 1 ? 'Two cards are open. One more arrives after this bet.' : 'Your equation is locked. After this bet, choose your marker.') + ownHand() + lockedEquation() + `<div class="table-actions"><p>${options.call ? `It costs ${options.call} chips to call.` : 'You can check without adding chips.'} You’ve put ${options.paid} into this betting round. Table limit: ${options.maximumRaise} each.</p><div class="action-row"><button type="button" class="button" data-bet="${options.call ? 'call' : 'check'}">${options.call ? `Call ${options.call}` : 'Check'} ↗</button><button type="button" class="quiet-button" data-bet="fold">Fold this hand</button></div>${options.canRaise ? `<form id="raise-form" class="raise-form"><label for="raise-amount">${options.current ? 'Raise total to' : 'Bet'}<input id="raise-amount" type="number" min="${options.minimumRaise}" max="${options.maximumRaise}" value="${options.minimumRaise}" step="1" required></label><button type="submit" class="secondary-button">${options.current ? 'Raise' : 'Bet'} chips</button><small>Maximum ${options.maximumRaise}</small></form>` : ''}</div>`;
  }
  if (game.phase === 'building') return heading('FOUR CARDS. YOUR POSSIBILITIES.', 'What can you make?', 'Use every number and operation once. Aim near 1 or 20; you’ll pick your marker after the final bet.') + ownHand(true) + builder() + `<div class="action-row"><button type="button" class="button reveal-button" data-action="lock" ${resultFor(draft).equation ? '' : 'disabled'}>Lock equation & continue ↗</button><button type="button" class="quiet-button" data-action="fold-building">Fold this hand</button></div>`;
  if (game.phase === 'choosing') {
    const valid = marker !== 'swing' || (resultFor(swingDrafts.low).equation && resultFor(swingDrafts.high).equation);
    return heading('KEEP THEM GUESSING.', 'Low, high, or both?', 'Everyone’s choice stays secret until the reveal. A swing must win both sides to receive any chips.') + `<div class="marker-options" role="group" aria-label="Choose your marker">${['low', 'high', 'swing'].map(side => `<button type="button" class="marker-button" data-marker="${side}" aria-pressed="${marker === side}"><strong>${side === 'low' ? '1' : side === 'high' ? '20' : '↙↗'}</strong>${side === 'swing' ? 'Swing' : side === 'low' ? 'Go low' : 'Go high'}</button>`).join('')}</div>` + (marker === 'swing' ? `<div class="swing-tabs" role="group" aria-label="Swing equations">${['low', 'high'].map(side => `<button type="button" class="secondary-button" data-swing="${side}" aria-pressed="${swingSide === side}">${sideName(side)} · ${resultFor(swingDrafts[side]).equation ? formatValue(resultFor(swingDrafts[side]).equation.value) : 'Build'}</button>`).join('')}</div>` + ownHand(true) + builder() : lockedEquation()) + `<div class="action-row"><button type="button" class="button reveal-button" data-action="declare" ${valid ? '' : 'disabled'}>Choose ${marker} & reveal ↗</button></div>`;
  }
  return heading('THE CARDS ARE ON THE TABLE.', you().folded ? 'You sat this one out.' : 'The reveal.', you().folded ? 'Your chips are safe for the next hand. See how the table played out below.' : 'Compare the equations, see who takes the pot, and try another hand.') + ownHand() + lockedEquation();
}
function resultPanel() {
  const result = game.result;
  if (!result) return '';
  const name = id => game.players[id].name;
  const winners = result.uncontested !== undefined ? `${name(result.uncontested)} ${result.uncontested === 0 ? 'take' : 'takes'} the pot.` : result.carried ? 'The pot carries forward.' : result.low === result.high ? `${name(result.low)} ${result.low === 0 ? 'win' : 'wins'} the swing!` : [result.low !== null ? `${name(result.low)} ${result.low === 0 ? 'win' : 'wins'} low` : '', result.high !== null ? `${name(result.high)} ${result.high === 0 ? 'win' : 'wins'} high` : ''].filter(Boolean).join(' · ');
  const chipText = result.carried ? `All swing bets failed. ${result.carried} chips stay in the pot for the next hand.` : `${result.pot} chips in the pot.${result.discarded ? ' One odd chip is discarded after the split.' : ''}${result.uncontested !== undefined ? ' The other players folded.' : result.low === null || result.high === null ? ' With only one qualifying side, its winner receives the whole pot.' : ''}`;
  const cards = game.players.filter(player => player.inHand).map(player => {
    const declaration = player.declaration;
    const side = player.folded ? 'Folded' : result.uncontested !== undefined ? 'Won without a reveal' : sideName(declaration.side);
    const equations = declaration ? ['low', 'high'].filter(side => declaration[side]).map(side => `<p>${side === 'low' ? '↙' : '↗'} ${declaration[side].text} = <strong>${formatValue(declaration[side].value)}</strong></p>`).join('') : '';
    return `<article class="result-player"><h3>${player.name}</h3><small>${side}</small>${equations}<p class="payout">${result.payouts[player.id] || 0} chips received</p>${result.failedSwings.includes(player.id) ? '<small>Swing failed: it must win both sides.</small>' : ''}</article>`;
  }).join('');
  let learning = '';
  if (you().primary) {
    if (!best) best = { low: closestEquations(you(), 1)[0], high: closestEquations(you(), 20)[0] };
    learning = `<div class="learning-result"><div><h3>Your equation, step by step.</h3><ol>${you().primary.steps.map(step => `<li>${step.operator === '√' ? `√${formatValue(step.left)}` : `${formatValue(step.left)} ${step.operator} ${formatValue(step.right)}`} = ${formatValue(step.result)}</li>`).join('')}</ol></div><div><h3>Another way to play.</h3><p>Closest low: ${best.low.text} = ${formatValue(best.low.value)}</p><p>Closest high: ${best.high.text} = ${formatValue(best.high.value)}</p><p>Equal distances are settled by number and color.</p></div></div>`;
  }
  return `<section class="showdown" aria-labelledby="result-heading"><p class="eyebrow">HAND ${game.handNumber} · RESULTS</p><h2 id="result-heading" tabindex="-1">${winners}</h2><p>${chipText}</p><div class="result-players">${cards}</div><p>Tied distance? High uses the highest number, then Yellow → Grey → Orange → Pink. Low uses the lowest number and the reverse color order.</p>${learning}<div class="action-row"><button type="button" class="button" data-action="next-hand">${you().chips < MINIMUM_CHIPS || game.players.slice(1).every(player => player.chips < MINIMUM_CHIPS) ? 'Finish match' : 'Next hand'} ↗</button></div></section>`;
}
function render() {
  ensureDrafts();
  const phase = { exchange: 'Operation exchange', building: 'Build your equation', betting: `${game.betting?.street === 1 ? 'First' : 'Final'} bet`, choosing: 'Choose your marker', showdown: 'Hand complete', finished: 'Match complete' }[game.phase];
  const scoreboard = `<div class="round-heading"><strong>Hand ${game.handNumber}</strong><span class="phase-label">${phase}</span><button type="button" class="quiet-button" data-action="restart">New match ↺</button></div><div class="scoreboard">${game.players.map(player => `<div class="player-score${player.id === 0 ? ' active' : ''}"><strong>${player.chips}</strong><span>${player.name}<small>PLAY CHIPS${player.folded ? ' · FOLDED' : !player.inHand ? ' · OUT' : ''}</small></span></div>`).join('')}<div class="pot-score"><small>${game.phase === 'showdown' && !game.pot ? 'POT AWARDED' : 'IN THE POT'}</small><strong>${game.phase === 'showdown' && !game.pot ? game.result.pot : game.pot}</strong></div></div>`;
  table.innerHTML = scoreboard + (game.phase === 'finished' ? `<section class="finished-message"><p class="eyebrow">THANKS FOR PLAYING.</p><h2>${you().chips >= MINIMUM_CHIPS ? 'You have the table!' : 'That’s a match.'}</h2><p>${you().chips < MINIMUM_CHIPS ? 'You need at least five chips to enter another hand.' : 'Your opponents don’t have the five chips needed to enter another hand.'} You finished with ${you().chips} play chips.${game.pot ? ` The unclaimed pot holds ${game.pot} chips.` : ''}</p><button type="button" class="button" data-action="restart">Play again ↗</button></section>` : `<div class="play-layout"><section class="table-workspace" aria-label="Your turn">${workspace()}</section>${opponents()}</div>${game.phase === 'showdown' ? resultPanel() : ''}`);
}

$('#match-settings').addEventListener('submit', event => {
  event.preventDefault();
  attempt(() => {
    game = createGame({ difficulty: $('#difficulty').value, skipFirstBet: $('#skip-first-bet').checked });
    nextHand();
    $('#setup').hidden = true;
    table.hidden = false;
  });
  $('#phase-heading')?.focus({ preventScroll: true });
});
table.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled || button.type === 'submit') return;
  if (button.dataset.action === 'restart') { $('#restart-dialog').showModal(); return; }
  const previousPhase = game.phase;
  attempt(() => {
    const data = button.dataset;
    if (data.card) currentDraft().order.push(data.card);
    else if (data.slot !== undefined) currentDraft().order.splice(Number(data.slot), 1);
    else if (data.root) {
      const value = currentDraft();
      if (value.roots.includes(data.root)) value.roots = value.roots.filter(id => id !== data.root);
      else if (you().roots.length === 1) value.roots = [data.root];
      else if (value.roots.length < you().roots.length) value.roots.push(data.root);
      else throw new Error('Remove a square root before moving it to another number.');
    } else if (data.discard) discardOperation(game, 0, data.discard);
    else if (data.bet) actBet(game, 0, data.bet);
    else if (data.marker) { marker = data.marker; hint = null; }
    else if (data.swing) { swingSide = data.swing; hintTarget = swingSide === 'low' ? 1 : 20; hint = null; }
    else if (data.action === 'undo') currentDraft().order.pop();
    else if (data.action === 'clear') { currentDraft().order = []; currentDraft().roots = []; }
    else if (data.action === 'hint') {
      hint = closestEquations(you(), hintTarget)[0];
      if (!hint) throw new Error('This hand has no valid equation. You can fold this hand.');
    } else if (data.action === 'use-hint') {
      if (game.phase === 'choosing') swingDrafts[swingSide] = cloneDraft(hint.draft);
      else draft = cloneDraft(hint.draft);
    } else if (data.action === 'lock') { lockEquation(game, 0, draft); hint = null; }
    else if (data.action === 'fold-building') foldHand(game, 0);
    else if (data.action === 'declare') declareSide(game, 0, marker, swingDrafts);
    else if (data.action === 'next-hand') nextHand();
  });
  if (game.phase !== previousPhase) (game.phase === 'showdown' ? $('#result-heading') : $('#phase-heading'))?.focus();
  else {
    const key = Object.keys(button.dataset)[0];
    const replacement = table.querySelector(`button[data-${key}="${button.dataset[key]}"]:not(:disabled)`);
    (replacement || table.querySelector('[data-card]:not(:disabled)') || table.querySelector('.operation-picker select'))?.focus({ preventScroll: true });
  }
});
table.addEventListener('change', event => {
  if (event.target.id === 'hint-target') { hintTarget = Number(event.target.value); hint = null; render(); return; }
  if (event.target.dataset.operation === undefined) return;
  const index = Number(event.target.dataset.operation);
  const selected = event.target.value;
  attempt(() => {
    const value = currentDraft();
    const other = value.operators.indexOf(selected);
    [value.operators[index], value.operators[other]] = [value.operators[other], value.operators[index]];
  });
  table.querySelector(`[data-operation="${index}"]`)?.focus();
});
table.addEventListener('submit', event => {
  if (event.target.id !== 'raise-form') return;
  event.preventDefault();
  const amount = Number($('#raise-amount').value);
  attempt(() => actBet(game, 0, 'raise', amount));
  (game.phase === 'showdown' ? $('#result-heading') : $('#phase-heading'))?.focus();
});
$('#restart-dialog').addEventListener('close', () => {
  if ($('#restart-dialog').returnValue !== 'restart') return;
  table.hidden = true;
  $('#setup').hidden = false;
  $('#game-error').hidden = true;
  $('#difficulty').focus({ preventScroll: true });
});
