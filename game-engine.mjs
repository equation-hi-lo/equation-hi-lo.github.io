export const COLORS = [
  { name: 'Pink', animal: 'Mouse', rank: 0 },
  { name: 'Orange', animal: 'Tiger', rank: 1 },
  { name: 'Grey', animal: 'Elephant', rank: 2 },
  { name: 'Yellow', animal: 'Giraffe', rank: 3 }
];
export const STARTING_CHIPS = 20;
export const MINIMUM_CHIPS = 5;
const BINARY = ['+', '−', '×', '÷'];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
export const formatValue = value => Math.abs(value) < 1e-10 ? '0' : Number(value.toPrecision(8)).toString();

export function createDeck() {
  const deck = COLORS.flatMap(color => Array.from({ length: 11 }, (_, value) => ({
    id: `n-${color.rank}-${value}`, type: 'number', value, color: color.rank
  })));
  for (const symbol of ['×', '√']) {
    for (let index = 0; index < 4; index++) deck.push({ id: `${symbol}-${index}`, type: 'symbol', symbol });
  }
  return deck;
}

export function shuffle(cards, random = Math.random) {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

export function evaluateEquation(player, draft) {
  assert(draft && Array.isArray(draft.order) && Array.isArray(draft.operators) && Array.isArray(draft.roots), 'Build a complete equation.');
  assert(player.cards.length === 4 && player.operators.length === 3, 'Finish the deal and operation exchanges first.');
  const cards = new Map(player.cards.map(card => [card.id, card]));
  const operators = new Map(player.operators.map(card => [card.id, card.symbol]));
  assert(draft.order.length === 4 && new Set(draft.order).size === 4 && draft.order.every(id => cards.has(id)), 'Use each of your four number cards once.');
  assert(draft.operators.length === 3 && new Set(draft.operators).size === 3 && draft.operators.every(id => operators.has(id)), 'Use each dealt operation card once.');
  assert(draft.roots.length === player.roots.length && new Set(draft.roots).size === draft.roots.length && draft.roots.every(id => cards.has(id)), 'Place every square root on a separate number card.');
  const steps = [];
  const values = draft.order.map(id => {
    const value = cards.get(id).value;
    if (!draft.roots.includes(id)) return value;
    const result = Math.sqrt(value);
    steps.push({ left: value, operator: '√', result });
    return result;
  });
  const symbols = draft.operators.map(id => operators.get(id));
  assert(symbols.every(symbol => BINARY.includes(symbol)), 'Unknown operation card.');
  const terms = [values[0]];
  const additions = [];
  for (let index = 0; index < 3; index++) {
    const operator = symbols[index];
    const right = values[index + 1];
    if (operator === '×' || operator === '÷') {
      assert(operator !== '÷' || right !== 0, 'Division by zero is not allowed. Move the zero to a different position.');
      const left = terms.pop();
      const result = operator === '×' ? left * right : left / right;
      terms.push(result);
      steps.push({ left, operator, right, result });
    } else {
      additions.push(operator);
      terms.push(right);
    }
  }
  let value = terms[0];
  for (let index = 0; index < additions.length; index++) {
    const left = value;
    const operator = additions[index];
    const right = terms[index + 1];
    value = operator === '+' ? left + right : left - right;
    steps.push({ left, operator, right, result: value });
  }
  const text = draft.order.map((id, index) => `${draft.roots.includes(id) ? '√' : ''}${cards.get(id).value}${symbols[index] ? ` ${symbols[index]} ` : ''}`).join('');
  return { value, text, steps, draft: { order: [...draft.order], operators: [...draft.operators], roots: [...draft.roots] } };
}

function permutations(values) {
  if (!values.length) return [[]];
  return values.flatMap((value, index) => permutations(values.filter((_, other) => index !== other)).map(tail => [value, ...tail]));
}

function combinations(values, count) {
  if (count === 0) return [[]];
  return values.flatMap((value, index) => combinations(values.slice(index + 1), count - 1).map(tail => [value, ...tail]));
}

export function findEquations(player) {
  assert(player.cards.length === 4 && player.operators.length === 3, 'Finish the deal and exchanges before searching.');
  const candidates = new Map();
  const roots = combinations(player.cards.map(card => card.id), player.roots.length);
  const operators = permutations(player.operators.map(card => card.id));
  for (const order of permutations(player.cards.map(card => card.id))) {
    for (const operationOrder of operators) {
      for (const rooted of roots) {
        try {
          const equation = evaluateEquation(player, { order, operators: operationOrder, roots: rooted });
          const key = equation.value.toPrecision(13);
          if (!candidates.has(key)) candidates.set(key, equation);
        } catch (error) {
          if (!error.message.startsWith('Division by zero')) throw error;
        }
      }
    }
  }
  return [...candidates.values()];
}

export function closestEquations(player, target) {
  assert(target === 1 || target === 20, 'Choose 1 or 20.');
  return findEquations(player).sort((a, b) => Math.abs(a.value - target) - Math.abs(b.value - target));
}

export function compareHands(first, second, side) {
  const target = side === 'low' ? 1 : 20;
  const difference = Math.abs(first.value - target) - Math.abs(second.value - target);
  if (Math.abs(difference) > 1e-9) return difference;
  const extreme = cards => side === 'low' ? Math.min(...cards.map(card => card.value)) : Math.max(...cards.map(card => card.value));
  const firstNumber = extreme(first.cards);
  const secondNumber = extreme(second.cards);
  if (firstNumber !== secondNumber) return side === 'low' ? firstNumber - secondNumber : secondNumber - firstNumber;
  const rank = (cards, value) => {
    const colors = cards.filter(card => card.value === value).map(card => card.color);
    return side === 'low' ? Math.min(...colors) : Math.max(...colors);
  };
  return side === 'low' ? rank(first.cards, firstNumber) - rank(second.cards, secondNumber) : rank(second.cards, secondNumber) - rank(first.cards, firstNumber);
}

export function settleShowdown(players, pot) {
  assert(Number.isInteger(pot) && pot >= 0, 'The pot must contain whole chips.');
  const active = players.filter(player => !player.folded && player.declaration);
  const entry = (player, side) => ({ id: player.id, cards: player.cards, value: player.declaration[side].value });
  const pick = (side, excluded = []) => active
    .filter(player => !excluded.includes(player.id) && (player.declaration.side === side || player.declaration.side === 'swing'))
    .map(player => entry(player, side)).sort((a, b) => compareHands(a, b, side))[0]?.id ?? null;
  const initialLow = pick('low');
  const initialHigh = pick('high');
  // All swings qualify against the original field. Removing one failed swing must not rescue another.
  const failedSwings = active.filter(player => player.declaration.side === 'swing' && (initialLow !== player.id || initialHigh !== player.id)).map(player => player.id);
  const low = pick('low', failedSwings);
  const high = pick('high', failedSwings);
  const payouts = Object.fromEntries(players.map(player => [player.id, 0]));
  let discarded = 0;
  let carried = 0;
  if (low === null && high === null) carried = pot;
  else if (low === null || high === null) payouts[low ?? high] = pot;
  else {
    payouts[low] += Math.floor(pot / 2);
    payouts[high] += Math.floor(pot / 2);
    discarded = pot % 2;
  }
  return { low, high, failedSwings, payouts, discarded, carried, pot };
}

const playing = game => game.players.filter(player => player.inHand && !player.folded);
const playerById = (game, id) => {
  const player = game.players.find(candidate => candidate.id === id);
  assert(player, 'Unknown player.');
  return player;
};
function log(game, message) {
  game.log.push(message.replace(/^You (bets|raises|checks|calls|folds|wins)\b/, (_, verb) => `You ${verb.slice(0, -1)}`));
}

export function createGame({ difficulty = 'friendly', skipFirstBet = false } = {}) {
  assert(['friendly', 'challenge'].includes(difficulty), 'Choose a supported opponent.');
  return {
    phase: 'setup', handNumber: 0, firstSeat: 0, difficulty, skipFirstBet, pot: 0, discardedChips: 0,
    players: ['You', 'Milo', 'Pip'].map((name, id) => ({ id, name, chips: STARTING_CHIPS, inHand: false })),
    log: [], result: null, betting: null, deck: [], discards: []
  };
}

function hiddenCard(game) {
  // Hidden cards must be numeric; rejected specials return to the shuffled deck before open dealing.
  const rejected = [];
  let card;
  while (game.deck.length) {
    card = game.deck.pop();
    if (card.type === 'number') break;
    rejected.push(card);
    card = null;
  }
  assert(card, 'The deck has no number cards left.');
  game.deck.push(...rejected);
  if (rejected.length) game.deck = shuffle(game.deck, game.random);
  return { ...card, hidden: true };
}

export function dealOpenCard(game, id) {
  const player = playerById(game, id);
  assert(game.deck.length > 0, 'The deck is empty.');
  let card = game.deck.pop();
  if (card.type === 'symbol') {
    if (card.symbol === '√') {
      player.roots.push(card);
      log(game, `${player.name} received √ and a replacement number.`);
    } else {
      player.operators.push(card);
      player.exchanges++;
      log(game, `${player.name} received × and must discard an operation.`);
    }
    do {
      assert(game.deck.length > 0, 'The deck has no replacement number.');
      card = game.deck.pop();
      if (card.type === 'symbol') game.discards.push(card);
    } while (card.type !== 'number');
  }
  player.cards.push({ ...card, hidden: false });
}

function afterExchanges(game) {
  if (playing(game).some(player => player.exchanges > 0)) { game.phase = 'exchange'; return; }
  if (game.dealStage === 1 && !game.skipFirstBet) startBetting(game, 1);
  else if (game.dealStage === 1) dealFinalCards(game);
  else game.phase = 'building';
}

export function startHand(game, random = Math.random) {
  assert(['setup', 'showdown'].includes(game.phase), 'Finish the current hand first.');
  const eligible = game.players.filter(player => player.chips >= MINIMUM_CHIPS);
  if (!eligible.some(player => player.id === 0) || eligible.length < 2) { game.phase = 'finished'; return; }
  game.random = random;
  game.handNumber++;
  game.firstSeat = (game.handNumber - 1) % game.players.length;
  game.deck = shuffle(createDeck(), random);
  game.discards = [];
  game.betting = null;
  game.result = null;
  game.log = [];
  game.dealStage = 1;
  for (const player of game.players) {
    player.inHand = player.chips >= MINIMUM_CHIPS;
    player.folded = false;
    player.cards = [];
    player.operators = ['+', '−', '÷'].map((symbol, index) => ({ id: `base-${player.id}-${index}`, type: 'symbol', symbol }));
    player.roots = [];
    player.exchanges = 0;
    player.contribution = 0;
    player.primary = null;
    player.declaration = null;
    if (player.inHand) { player.chips--; player.contribution++; game.pot++; }
  }
  log(game, `Hand ${game.handNumber}: each player antes 1 chip.`);
  for (const player of playing(game)) player.cards.push(hiddenCard(game));
  for (let count = 0; count < 2; count++) {
    for (const player of playing(game)) dealOpenCard(game, player.id);
  }
  afterExchanges(game);
}

export function discardOperation(game, id, operationId) {
  assert(game.phase === 'exchange', 'There is no operation exchange now.');
  const player = playerById(game, id);
  assert(player.inHand && !player.folded && player.exchanges > 0, 'This player has no exchange to make.');
  const index = player.operators.findIndex(operation => operation.id === operationId);
  assert(index !== -1 && player.operators[index].symbol !== '÷', 'You may discard +, −, or ×; keep ÷.');
  const [card] = player.operators.splice(index, 1);
  game.discards.push(card);
  player.exchanges--;
  log(game, `${player.name} discarded ${card.symbol}.`);
  afterExchanges(game);
}

function dealFinalCards(game) {
  game.dealStage = 2;
  for (const player of playing(game)) dealOpenCard(game, player.id);
  log(game, 'The final open number cards are dealt.');
  afterExchanges(game);
}

function nextPending(game, fromSeat) {
  for (let offset = 1; offset <= game.players.length; offset++) {
    const id = (fromSeat + offset) % game.players.length;
    if (game.betting.pending.includes(id)) return id;
  }
  return null;
}

function startBetting(game, street) {
  const players = playing(game);
  game.phase = 'betting';
  game.betting = {
    street, current: 0, cap: Math.min(...players.map(player => player.chips)),
    paid: Object.fromEntries(players.map(player => [player.id, 0])), pending: players.map(player => player.id),
    turn: null, raises: 0
  };
  game.betting.turn = nextPending(game, (game.firstSeat + game.players.length - 1) % game.players.length);
  log(game, `${street === 1 ? 'First' : 'Final'} betting round. Limit: ${game.betting.cap} chips per player.`);
  if (game.betting.cap === 0) completeBetting(game);
}

function completeBetting(game) {
  const street = game.betting.street;
  game.betting.turn = null;
  if (street === 1) dealFinalCards(game);
  else { game.phase = 'choosing'; log(game, 'Choose low, high, or swing. Markers stay secret until the reveal.'); }
}

function uncontested(game) {
  const winner = playing(game)[0];
  const pot = game.pot;
  winner.chips += pot;
  game.pot = 0;
  game.phase = 'showdown';
  game.result = { uncontested: winner.id, pot, payouts: Object.fromEntries(game.players.map(player => [player.id, player.id === winner.id ? pot : 0])), discarded: 0, carried: 0, failedSwings: [] };
  if (game.betting) game.betting.turn = null;
  log(game, `${winner.name} wins ${pot} chips after the others fold.`);
}

export function bettingActions(game, id) {
  assert(game.phase === 'betting' && game.betting.turn === id, 'It is not this player’s betting turn.');
  return {
    call: game.betting.current - game.betting.paid[id],
    minimumRaise: game.betting.current + 1, maximumRaise: game.betting.cap,
    canRaise: game.betting.current < game.betting.cap, current: game.betting.current, paid: game.betting.paid[id]
  };
}

export function actBet(game, id, action, raiseTo) {
  const options = bettingActions(game, id);
  const player = playerById(game, id);
  assert(['check', 'call', 'raise', 'fold'].includes(action), 'Choose check, call, raise, or fold.');
  assert(action !== 'check' || options.call === 0, 'Match the open bet or fold.');
  if (action === 'raise') assert(options.canRaise && Number.isInteger(raiseTo) && raiseTo >= options.minimumRaise && raiseTo <= options.maximumRaise, 'Raise within the table limit.');
  if (action === 'fold') {
    player.folded = true;
    log(game, `${player.name} folds.`);
  } else {
    const total = action === 'raise' ? raiseTo : game.betting.current;
    const cost = total - game.betting.paid[id];
    assert(cost <= player.chips, 'Not enough chips.');
    player.chips -= cost;
    player.contribution += cost;
    game.pot += cost;
    game.betting.paid[id] = total;
    if (action === 'raise') {
      game.betting.current = total;
      game.betting.raises++;
      game.betting.pending = playing(game).filter(other => other.id !== id).map(other => other.id);
      log(game, `${player.name} ${options.current === 0 ? 'bets' : 'raises to'} ${total} chips.`);
    } else log(game, cost === 0 ? `${player.name} checks.` : `${player.name} calls ${cost} chip${cost === 1 ? '' : 's'}.`);
  }
  game.betting.pending = game.betting.pending.filter(other => other !== id && !playerById(game, other).folded);
  if (playing(game).length === 1) { uncontested(game); return; }
  if (!game.betting.pending.length) completeBetting(game);
  else game.betting.turn = nextPending(game, id);
}

export function foldHand(game, id) {
  assert(game.phase === 'building', 'Use fold during your betting turn or while building.');
  const player = playerById(game, id);
  assert(player.inHand && !player.folded, 'This player is not in the hand.');
  player.folded = true;
  log(game, `${player.name} folds instead of building an equation.`);
  if (playing(game).length === 1) uncontested(game);
  else if (playing(game).every(other => other.primary)) startBetting(game, 2);
}

export function lockEquation(game, id, draft) {
  assert(game.phase === 'building', 'Equations are locked before the final betting round.');
  const player = playerById(game, id);
  assert(player.inHand && !player.folded && !player.primary, 'This player cannot lock another equation.');
  player.primary = evaluateEquation(player, draft);
  if (playing(game).every(other => other.primary)) startBetting(game, 2);
}

export function declareSide(game, id, side, drafts) {
  assert(game.phase === 'choosing', 'Choose your marker after the final bet.');
  assert(['low', 'high', 'swing'].includes(side), 'Choose low, high, or swing.');
  const player = playerById(game, id);
  assert(player.inHand && !player.folded && !player.declaration, 'This player cannot declare a marker.');
  assert(player.primary, 'Lock an equation first.');
  const declaration = { side };
  if (side === 'swing') {
    declaration.low = evaluateEquation(player, drafts?.low);
    declaration.high = evaluateEquation(player, drafts?.high);
  } else declaration[side] = player.primary;
  player.declaration = declaration;
  if (!playing(game).every(other => other.declaration)) return;
  game.result = settleShowdown(playing(game), game.pot);
  for (const other of game.players) other.chips += game.result.payouts[other.id] || 0;
  game.discardedChips += game.result.discarded;
  game.pot = game.result.carried;
  game.phase = 'showdown';
  log(game, game.result.carried ? `Every swing failed. ${game.result.carried} chips carry into the next hand.` : 'Equations and markers are revealed.');
}

export function chooseComputerPlan(player, difficulty, random = Math.random) {
  const equations = findEquations(player);
  if (!equations.length) return null;
  const choose = target => {
    const sorted = [...equations].sort((a, b) => Math.abs(a.value - target) - Math.abs(b.value - target));
    return sorted[difficulty === 'challenge' ? 0 : Math.floor(random() * Math.min(3, sorted.length))];
  };
  const low = choose(1);
  const high = choose(20);
  const lowDistance = Math.abs(low.value - 1);
  const highDistance = Math.abs(high.value - 20);
  let side = lowDistance < highDistance ? 'low' : highDistance < lowDistance ? 'high' : random() < 0.5 ? 'low' : 'high';
  if (lowDistance <= 0.35 && highDistance <= 0.35 && random() < (difficulty === 'challenge' ? 0.75 : 0.25)) side = 'swing';
  return { side, low, high, primary: side === 'high' ? high : low, confidence: 1 / (1 + Math.min(lowDistance, highDistance)) };
}

export function chooseComputerBet(options, confidence, random = Math.random) {
  const roll = random();
  if (options.call > 0 && confidence < 0.4 && roll < 0.38) return { action: 'fold' };
  if (options.canRaise && roll < 0.12 + confidence * 0.25) {
    return { action: 'raise', amount: Math.min(options.maximumRaise, options.minimumRaise + Math.floor(confidence * 2)) };
  }
  return { action: options.call === 0 ? 'check' : 'call' };
}

export function chooseComputerDiscard(player) {
  const discardable = player.operators.filter(operation => operation.symbol !== '÷');
  assert(discardable.length, 'No operation can be discarded.');
  if (player.cards.length !== 4) {
    const duplicate = discardable.find(operation => player.operators.filter(other => other.symbol === operation.symbol).length > 1);
    return (duplicate || discardable.find(operation => operation.symbol === '−') || discardable[0]).id;
  }
  let best = discardable[0].id;
  let distance = Infinity;
  for (const operation of discardable) {
    const candidate = { ...player, operators: player.operators.filter(other => other.id !== operation.id) };
    if (candidate.operators.length !== 3) return operation.id;
    const equations = findEquations(candidate);
    const closest = Math.min(...equations.map(equation => Math.min(Math.abs(equation.value - 1), Math.abs(equation.value - 20))));
    if (closest < distance) { distance = closest; best = operation.id; }
  }
  return best;
}
