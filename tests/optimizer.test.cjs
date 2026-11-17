const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const optimizer = vm.createContext({ document: { querySelector: () => null } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8'), optimizer);

for (const input of ['', '1x, 2', '0, 3', '11', '2.5', '1,2,3,4,5', '-2,3']) {
  assert.equal(optimizer.parseNumbers(input), null, input);
}
assert.deepEqual(Array.from(optimizer.parseNumbers('1, 3 4, 8')), [1, 3, 4, 8]);
assert.deepEqual(Array.from(optimizer.parseNumbers('2,2,2,2')), [2, 2, 2, 2]);

const arithmetic = ['add', 'subtract', 'multiply', 'divide'];
let checked = 0;
for (const numbers of [[1,3,4,8], [2,5,8,10], [2,2,2,2], [1,1,1,1], [3,7,9,10], [1], [10]]) {
  for (const target of [1, 20]) {
    for (const operations of [arithmetic, ['divide'], [...arithmetic, 'sqrt']]) {
      const rows = optimizer.findEquations(numbers, operations, target);
      for (const row of rows) {
        const expression = row.expression.replaceAll('×', '*').replaceAll('÷', '/')
          .replaceAll('−', '-').replace(/√(\d+)/g, 'Math.sqrt($1)');
        assert.ok(Math.abs(vm.runInNewContext(expression) - row.value) < 1e-9, row.expression);
        assert.ok(Number.isFinite(row.value));
        const used = row.expression.match(/\d+/g).map(Number).sort((a, b) => a - b);
        assert.deepEqual(used, [...numbers].sort((a, b) => a - b));
        checked++;
      }
    }
  }
}
for (const target of [1, 20]) {
  assert.equal(optimizer.findEquations([1, 3, 4, 8], arithmetic, target)[0].distance, 0);
}
assert.equal(optimizer.findEquations([1, 2], ['sqrt'], 1).length, 0);
console.log(`Passed input validation, exact-target, repeated-card, and arithmetic checks (${checked} results).`);
