const assert = require('node:assert/strict');
const vm = require('node:vm');
const test = require('node:test');
const optimizer = import('../script.js');
const defaults = ['add', 'subtract', 'divide'];

// Evaluate the displayed expression independently of the game's arithmetic engine.
function valueOf(expression) {
  return vm.runInNewContext(expression.replaceAll('×', '*').replaceAll('÷', '/')
    .replaceAll('−', '-').replace(/√(\d+)/g, 'Math.sqrt($1)'));
}

test('accepts zeros and repeated cards, but requires four whole numbers from 0 to 10', async () => {
  const { parseNumbers, analyzeHand } = await optimizer;
  assert.deepEqual(parseNumbers('0, 3 4, 10'), [0, 3, 4, 10]);
  assert.deepEqual(parseNumbers('0 0 0 0'), [0, 0, 0, 0]);
  assert.deepEqual(parseNumbers('2,2,2,2'), [2, 2, 2, 2]);
  for (const input of ['', '1x,2,3,4', '0,3', '1,2,3,11', '1,2.5,3,4', '1,2,3,4,5', '-2,3,4,5', '1,2,3,4,']) {
    assert.equal(parseNumbers(input), null, input);
  }
  for (const numbers of [[0, 1], [0, 1, 2, 3, 4], [0, 1, 2, NaN], [0, 1, 2, 11], [0, 1, 2, -1]]) {
    assert.throws(() => analyzeHand(numbers, defaults), /four whole numbers/);
  }
});

test('default cards are +, −, ÷; multiplication requires discarding + or −', async () => {
  const { operationError, analyzeHand } = await optimizer;
  assert.equal(operationError(defaults), '');
  const fourOperators = [...defaults, 'multiply'];
  assert.match(operationError(fourOperators), /Uncheck \+ Add or − Subtract/);
  assert.throws(() => analyzeHand([0, 3, 4, 8], fourOperators), /Uncheck/);
  for (const retained of ['add', 'subtract']) {
    const operations = [retained, 'multiply', 'divide'];
    assert.equal(operationError(operations), '');
    assert.ok(analyzeHand([0, 3, 4, 8], operations).total);
  }
  assert.match(operationError(['multiply', 'divide']), /Keep either/);
  assert.match(operationError(['add', 'subtract', 'multiply']), /division card/);
  assert.match(operationError(['add', 'divide']), /Start with/);
  assert.match(operationError(['add', 'add', 'divide']), /at most once/);
  assert.match(operationError([...defaults, 'invented']), /at most once/);
});

test('both targets use every card once, with standard precedence and no parentheses', async () => {
  const { analyzeHand } = await optimizer;
  const symbols = { add: '+', subtract: '−', multiply: '×', divide: '÷', sqrt: '√' };
  const hands = [[0, 3, 4, 8], [0, 0, 0, 1], [1, 3, 4, 8], [8, 3, 1, 4], [2, 2, 2, 2], [4, 7, 9, 8], [10, 6, 4, 9]];
  for (const numbers of hands) {
    for (const binary of [defaults, ['add', 'multiply', 'divide'], ['subtract', 'multiply', 'divide']]) {
      for (const operations of [binary, [...binary, 'sqrt']]) {
        const analysis = analyzeHand(numbers, operations);
        for (const [side, target] of [['low', 1], ['high', 20]]) {
          const rows = analysis[side];
          assert.equal(rows.length, Math.min(8, analysis.total));
          assert.ok(rows.length > 0);
          assert.equal(new Set(rows.map(row => row.value.toPrecision(13))).size, rows.length);
          for (const [index, row] of rows.entries()) {
            assert.doesNotMatch(row.expression, /[()]/);
            assert.equal(row.value, valueOf(row.expression), row.expression);
            assert.ok(Number.isFinite(row.value));
            assert.deepEqual(row.expression.match(/\d+/g).map(Number).sort((a, b) => a - b), [...numbers].sort((a, b) => a - b));
            for (const [name, symbol] of Object.entries(symbols)) {
              assert.equal([...row.expression].filter(character => character === symbol).length, operations.includes(name) ? 1 : 0, `${row.expression}: ${name}`);
            }
            assert.equal(row.distance, Math.abs(row.value - target));
            if (index) assert.ok(rows[index - 1].distance <= row.distance);
          }
        }
      }
    }
  }
});

test('reports the full distinct-result count while limiting each side to eight', async () => {
  const { analyzeHand } = await optimizer;
  const normal = analyzeHand([0, 3, 4, 8], defaults);
  const rooted = analyzeHand([0, 3, 4, 8], [...defaults, 'sqrt']);
  assert.equal(normal.total, 23);
  assert.equal(rooted.total, 89);
  for (const result of [normal, rooted]) {
    assert.equal(result.low.length, 8);
    assert.equal(result.high.length, 8);
  }
});

test('identifies an exact swing using the same numbers and selected operations', async () => {
  const { analyzeHand } = await optimizer;
  const result = analyzeHand([8, 3, 1, 4], ['subtract', 'multiply', 'divide']);
  assert.equal(result.low[0].value, 1);
  assert.equal(result.high[0].value, 20);
  assert.equal(result.swing, true);
  const rooted = analyzeHand([8, 3, 1, 4], ['subtract', 'multiply', 'divide', 'sqrt']);
  assert.equal(rooted.swing, true);
  assert.equal(valueOf(rooted.low[0].expression), 1);
  assert.equal(valueOf(rooted.high[0].expression), 20);
});

test('an exact low alone or two near misses do not trigger a swing', async () => {
  const { analyzeHand } = await optimizer;
  const lowOnly = analyzeHand([0, 3, 4, 8], defaults);
  assert.equal(lowOnly.low[0].distance, 0);
  assert.ok(lowOnly.high[0].distance > 0);
  assert.equal(lowOnly.swing, false);
  const near = analyzeHand([1, 3, 4, 8], defaults);
  assert.equal(near.low[0].distance, 0.125);
  assert.ok(Math.abs(near.high[0].value - (8 + 4 - 1 / 3)) < 1e-12);
  assert.equal(near.swing, false);
});

test('a single distinct answer has honest counts for both targets', async () => {
  const { analyzeHand } = await optimizer;
  const result = analyzeHand([1, 1, 1, 1], defaults);
  assert.equal(result.total, 1);
  assert.equal(result.low.length, 1);
  assert.equal(result.high.length, 1);
  assert.equal(result.low[0].distance, 0);
  assert.equal(result.high[0].distance, 19);
  assert.equal(result.swing, false);
});

test('all-zero cards have no legal results or swing opportunity', async () => {
  const { analyzeHand } = await optimizer;
  for (const operations of [defaults, ['add', 'multiply', 'divide'], ['subtract', 'multiply', 'divide'], [...defaults, 'sqrt']]) {
    assert.deepEqual(analyzeHand([0, 0, 0, 0], operations), { total: 0, low: [], high: [], swing: false });
  }
});
