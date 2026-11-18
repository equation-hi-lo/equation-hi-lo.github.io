import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeck, createGame, startHand, dealOpenCard, discardOperation, evaluateEquation,
  findEquations, closestEquations, compareHands, settleShowdown, bettingActions,
  actBet, foldHand, lockEquation, declareSide, chooseComputerPlan, chooseComputerBet,
  chooseComputerDiscard
} from '../game-engine.mjs';

function random(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function hand(numbers, symbols = ['+', '−', '÷'], rootCount = 0, id = 0) {
  return {
    id, name: `Player ${id}`, cards: numbers.map((value, index) => ({ id: `n${id}-${index}`, value, color: index % 4, type: 'number' })),
    operators: symbols.map((symbol, index) => ({ id: `o${id}-${index}`, symbol, type: 'symbol' })),
    roots: Array.from({ length: rootCount }, (_, index) => ({ id: `r${index}`, symbol: '√' })),
    inHand: true, folded: false, chips: 19, primary: null, declaration: null, exchanges: 0, contribution: 1
  };
}
function draft(player, roots = []) {
  return { order: player.cards.map(card => card.id), operators: player.operators.map(card => card.id), roots: roots.map(index => player.cards[index].id) };
}
function settlePlayer(id, side, low, high, numbers = [2, 4, 6, 8]) {
  const player = hand(numbers, undefined, 0, id);
  player.declaration = { side, ...(low !== null ? { low: { value: low } } : {}), ...(high !== null ? { high: { value: high } } : {}) };
  return player;
}
function resolveExchanges(game) {
  while (game.phase === 'exchange') {
    const player = game.players.find(player => player.inHand && !player.folded && player.exchanges);
    discardOperation(game, player.id, chooseComputerDiscard(player));
  }
}
function firstBet(seed = 1) {
  const game = createGame();
  startHand(game, random(seed));
  resolveExchanges(game);
  assert.equal(game.phase, 'betting');
  return game;
}
function checkThrough(game) {
  while (game.phase === 'betting') {
    const options = bettingActions(game, game.betting.turn);
    actBet(game, game.betting.turn, options.call ? 'call' : 'check');
  }
  resolveExchanges(game);
}

test('52 unique cards: 0–10 in four colors, four × and four √', () => {
  const deck = createDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map(card => card.id)).size, 52);
  for (let color = 0; color < 4; color++) assert.deepEqual(deck.filter(card => card.color === color).map(card => card.value), Array.from({ length: 11 }, (_, value) => value));
  for (const symbol of ['×', '√']) assert.equal(deck.filter(card => card.symbol === symbol).length, 4);
});
test('PDF examples use precedence and square roots without parentheses', () => {
  const high = hand([8, 3, 1, 4], ['×', '÷', '−']);
  assert.equal(evaluateEquation(high, draft(high)).value, 20);
  const low = hand([4, 7, 9, 8], ['÷', '+', '−'], 1);
  assert.ok(Math.abs(evaluateEquation(low, draft(low, [0])).value - 9 / 7) < 1e-12);
  const swing = hand([10, 6, 4, 9], ['×', '÷', '−'], 1);
  assert.equal(evaluateEquation(swing, draft(swing, [2])).value, 21);
  const value = { order: [swing.cards[3].id, swing.cards[1].id, swing.cards[0].id, swing.cards[2].id], operators: [swing.operators[1].id, swing.operators[0].id, swing.operators[2].id], roots: [swing.cards[3].id] };
  assert.equal(evaluateEquation(swing, value).value, 1);
});
test('× and ÷ share precedence and evaluate left to right', () => {
  const player = hand([8, 2, 3, 4], ['÷', '×', '−']);
  assert.equal(evaluateEquation(player, draft(player)).value, 8);
});
test('every physical number and operation card is required exactly once', () => {
  const player = hand([4, 4, 4, 4]);
  const value = draft(player);
  assert.doesNotThrow(() => evaluateEquation(player, value));
  assert.throws(() => evaluateEquation(player, { ...value, order: [value.order[0], value.order[0], ...value.order.slice(2)] }), /four number/);
  assert.throws(() => evaluateEquation(player, { ...value, operators: [value.operators[0], value.operators[0], value.operators[2]] }), /dealt operation/);
  assert.throws(() => evaluateEquation(player, { ...value, operators: ['invented', ...value.operators.slice(1)] }), /dealt operation/);
});
test('all square roots must be placed, on distinct number cards', () => {
  const player = hand([4, 9, 1, 1], undefined, 2);
  assert.throws(() => evaluateEquation(player, draft(player)), /every square root/);
  assert.throws(() => evaluateEquation(player, draft(player, [0, 0])), /every square root/);
  assert.equal(evaluateEquation(player, draft(player, [0, 1])).value, 4);
});
test('zero is allowed except as a divisor; all-zero hand has no valid equation', () => {
  const player = hand([0, 2, 4, 1]);
  assert.equal(evaluateEquation(player, draft(player)).value, -2);
  const zeroDivisor = hand([2, 3, 1, 0]);
  assert.throws(() => evaluateEquation(zeroDivisor, draft(zeroDivisor)), /Division by zero/);
  assert.equal(findEquations(hand([0, 0, 0, 0])).length, 0);
});
test('search uses only the dealt operators and all square roots', () => {
  const player = hand([10, 6, 4, 9], ['×', '÷', '−'], 1);
  const equations = findEquations(player);
  assert.ok(equations.length > 20);
  for (const equation of equations) assert.deepEqual(evaluateEquation(player, equation.draft), equation);
  assert.equal(closestEquations(player, 1)[0].value, 1);
});
test('dealing starts with three numbers, one private, and conserves the 52-card deck', () => {
  for (let seed = 1; seed <= 80; seed++) {
    const game = firstBet(seed);
    const allocated = [...game.deck, ...game.discards.filter(card => !card.id.startsWith('base-'))];
    for (const player of game.players) {
      assert.equal(player.cards.length, 3);
      assert.equal(player.cards.filter(card => card.hidden).length, 1);
      assert.equal(player.operators.length, 3);
      assert.equal(player.operators.filter(card => card.symbol === '÷').length, 1);
      assert.equal(player.chips, 19);
      allocated.push(...player.cards, ...player.roots, ...player.operators.filter(card => !card.id.startsWith('base-')));
    }
    assert.equal(game.pot, 3);
    assert.equal(allocated.length, 52);
    assert.equal(new Set(allocated.map(card => card.id)).size, 52);
  }
});
test('replacement specials are discarded instead of gaining another effect', () => {
  const game = createGame();
  game.players[0] = hand([]);
  game.deck = [{ id: 'n', type: 'number', value: 4, color: 1 }, { id: 'extra', type: 'symbol', symbol: '×' }, { id: 'root', type: 'symbol', symbol: '√' }];
  dealOpenCard(game, 0);
  assert.equal(game.players[0].cards[0].value, 4);
  assert.equal(game.players[0].roots.length, 1);
  assert.equal(game.players[0].operators.length, 3);
  assert.equal(game.discards[0].id, 'extra');
});
test('multiplication exchanges cannot discard division', () => {
  const game = createGame();
  game.players[0] = hand([1, 2]);
  game.deck = [{ id: 'n', type: 'number', value: 3, color: 1 }, { id: 'multiply', type: 'symbol', symbol: '×' }];
  dealOpenCard(game, 0);
  game.phase = 'exchange';
  game.dealStage = 2;
  const division = game.players[0].operators.find(card => card.symbol === '÷');
  assert.throws(() => discardOperation(game, 0, division.id), /keep ÷/);
  assert.equal(game.players[0].exchanges, 1);
  discardOperation(game, 0, 'multiply');
  assert.equal(game.players[0].exchanges, 0);
  assert.equal(game.players[0].operators.length, 3);
});
test('checks complete the first bet; final number arrives before building', () => {
  const game = firstBet();
  checkThrough(game);
  assert.equal(game.phase, 'building');
  for (const player of game.players) assert.equal(player.cards.length, 4);
});
test('a raise reopens action and every caller pays only the difference', () => {
  const game = firstBet();
  actBet(game, 0, 'check');
  actBet(game, 1, 'raise', 2);
  actBet(game, 2, 'raise', 4);
  assert.equal(game.betting.turn, 0);
  actBet(game, 0, 'call');
  assert.equal(bettingActions(game, 1).call, 2);
  actBet(game, 1, 'call');
  assert.equal(game.pot, 15);
  assert.deepEqual(game.players.map(player => player.chips), [15, 15, 15]);
});
test('invalid raises and out-of-turn bets do not mutate chips or the pot', () => {
  const game = firstBet();
  const before = JSON.stringify(game);
  assert.throws(() => actBet(game, 1, 'check'), /not this player/);
  for (const amount of [-1, 0, 20, 1.5, NaN]) assert.throws(() => actBet(game, 0, 'raise', amount), /table limit/);
  assert.equal(JSON.stringify(game), before);
  actBet(game, 0, 'raise', 3);
  assert.throws(() => actBet(game, 1, 'check'), /Match the open bet/);
});
test('the shortest stack caps the bet and all-in players can still declare', () => {
  const game = createGame({ skipFirstBet: true });
  game.players[2].chips = 5;
  startHand(game, random(1));
  resolveExchanges(game);
  for (const player of game.players) lockEquation(game, player.id, closestEquations(player, 1)[0].draft);
  assert.equal(game.betting.cap, 4);
  actBet(game, 0, 'raise', 4);
  actBet(game, 1, 'call');
  actBet(game, 2, 'call');
  assert.equal(game.players[2].chips, 0);
  assert.equal(game.phase, 'choosing');
  for (const player of game.players) declareSide(game, player.id, 'low');
  assert.equal(game.phase, 'showdown');
});
test('folding to one remaining player awards the entire pot immediately', () => {
  const game = firstBet();
  actBet(game, 0, 'raise', 2);
  actBet(game, 1, 'fold');
  actBet(game, 2, 'fold');
  assert.equal(game.phase, 'showdown');
  assert.equal(game.result.uncontested, 0);
  assert.equal(game.players[0].chips, 22);
  assert.equal(game.pot, 0);
});
test('equations are locked before final betting and ordinary markers use that equation', () => {
  const game = createGame({ skipFirstBet: true });
  startHand(game, random(42));
  resolveExchanges(game);
  assert.equal(game.phase, 'building');
  const plan = closestEquations(game.players[0], 20)[0];
  lockEquation(game, 0, plan.draft);
  assert.throws(() => lockEquation(game, 0, plan.draft), /another equation/);
  assert.throws(() => declareSide(game, 0, 'high'), /after the final bet/);
  for (const player of game.players.slice(1)) lockEquation(game, player.id, closestEquations(player, 1)[0].draft);
  checkThrough(game);
  declareSide(game, 0, 'high', { high: closestEquations(game.players[0], 1)[0].draft });
  assert.equal(game.players[0].declaration.high.value, plan.value);
});
test('tie breaking uses highest/lowest raw card, then its color in opposite directions', () => {
  const first = { value: 20, cards: [{ value: 10, color: 0 }, { value: 0, color: 3 }] };
  const second = { value: 20, cards: [{ value: 9, color: 3 }, { value: 1, color: 0 }] };
  assert.ok(compareHands(first, second, 'high') < 0);
  first.value = second.value = 1;
  assert.ok(compareHands(first, second, 'low') < 0);
  second.cards = [{ value: 10, color: 3 }, { value: 0, color: 0 }];
  assert.ok(compareHands(first, second, 'high') > 0);
  assert.ok(compareHands(first, second, 'low') > 0);
});
test('high and low split an odd pot and discard its spare chip', () => {
  const result = settleShowdown([settlePlayer(0, 'low', 1, null), settlePlayer(1, 'high', null, 20)], 11);
  assert.deepEqual(result.payouts, { 0: 5, 1: 5 });
  assert.equal(result.discarded, 1);
});
test('an uncontested side receives the entire pot, including an odd chip', () => {
  const result = settleShowdown([settlePlayer(0, 'low', 1, null), settlePlayer(1, 'low', 2, null)], 11);
  assert.deepEqual(result.payouts, { 0: 11, 1: 0 });
  assert.equal(result.discarded, 0);
});
test('a winning swing takes both halves; a failed swing receives nothing', () => {
  let result = settleShowdown([settlePlayer(0, 'swing', 1, 20), settlePlayer(1, 'low', 2, null), settlePlayer(2, 'high', null, 21)], 12);
  assert.deepEqual(result.payouts, { 0: 12, 1: 0, 2: 0 });
  result = settleShowdown([settlePlayer(0, 'swing', 1, 22), settlePlayer(1, 'low', 2, null), settlePlayer(2, 'high', null, 20)], 12);
  assert.deepEqual(result.failedSwings, [0]);
  assert.deepEqual(result.payouts, { 0: 0, 1: 6, 2: 6 });
});
test('a failed swing does not block the remaining side taking the whole pot', () => {
  const result = settleShowdown([settlePlayer(0, 'swing', 1, 21), settlePlayer(1, 'high', null, 20)], 9);
  assert.deepEqual(result.payouts, { 0: 0, 1: 9 });
});
test('opposing swings both fail; neither is rescued and the whole pot carries', () => {
  const result = settleShowdown([settlePlayer(0, 'swing', 1, 21), settlePlayer(1, 'swing', 2, 20)], 11);
  assert.deepEqual(result.failedSwings, [0, 1]);
  assert.equal(result.carried, 11);
  assert.equal(result.discarded, 0);
  assert.deepEqual(result.payouts, { 0: 0, 1: 0 });
});
test('carried pots survive the next ante and players need five chips to enter', () => {
  const game = createGame();
  game.pot = 7;
  game.players[2].chips = 4;
  startHand(game, random(5));
  assert.equal(game.pot, 9);
  assert.equal(game.players[2].inHand, false);
  assert.equal(game.players[2].chips, 4);
  game.phase = 'showdown';
  game.players[0].chips = 4;
  startHand(game);
  assert.equal(game.phase, 'finished');
  assert.equal(game.pot, 9);
});
test('computer plans are legal and use only their own hand', () => {
  const player = hand([10, 6, 4, 9], ['×', '÷', '−'], 1);
  const plan = chooseComputerPlan(player, 'challenge', () => 0);
  assert.equal(plan.low.value, closestEquations(player, 1)[0].value);
  assert.equal(plan.high.value, closestEquations(player, 20)[0].value);
  assert.equal(evaluateEquation(player, plan.primary.draft).value, plan.primary.value);
});
test('simulated matches conserve all chips, terminate turns, and use legal computer moves', () => {
  let completed = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const rng = random(seed);
    const game = createGame({ difficulty: seed % 2 ? 'challenge' : 'friendly', skipFirstBet: seed % 3 === 0 });
    for (let round = 0; round < 12; round++) {
      startHand(game, rng);
      if (game.phase === 'finished') break;
      const plans = new Map();
      let steps = 0;
      while (game.phase !== 'showdown') {
        assert.ok(++steps < 180, `stuck in ${game.phase}, seed ${seed}`);
        if (game.phase === 'exchange') resolveExchanges(game);
        else if (game.phase === 'building') {
          const player = game.players.find(player => player.inHand && !player.folded && !player.primary);
          const plan = chooseComputerPlan(player, game.difficulty, rng);
          if (!plan) foldHand(game, player.id);
          else { plans.set(player.id, plan); lockEquation(game, player.id, plan.primary.draft); }
        } else if (game.phase === 'betting') {
          const id = game.betting.turn;
          const options = bettingActions(game, id);
          const move = chooseComputerBet(options, plans.get(id)?.confidence ?? 0.5, rng);
          actBet(game, id, move.action, move.amount);
        } else if (game.phase === 'choosing') {
          const player = game.players.find(player => player.inHand && !player.folded && !player.declaration);
          const plan = plans.get(player.id);
          declareSide(game, player.id, plan.side, { low: plan.low.draft, high: plan.high.draft });
        } else assert.fail(`unexpected phase: ${game.phase}`);
        assert.equal(game.players.reduce((sum, player) => sum + player.chips, 0) + game.pot + game.discardedChips, 60);
        assert.ok(game.players.every(player => Number.isInteger(player.chips) && player.chips >= 0));
      }
      completed++;
    }
  }
  assert.ok(completed >= 100);
});
