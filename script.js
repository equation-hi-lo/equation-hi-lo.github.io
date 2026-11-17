const operations = {
  add: { symbol: '+', apply: (a, b) => a + b },
  subtract: { symbol: '−', apply: (a, b) => a - b },
  multiply: { symbol: '×', apply: (a, b) => a * b },
  divide: { symbol: '÷', apply: (a, b) => b === 0 ? NaN : a / b }
};

function parseNumbers(input) {
  const parts = input.trim().split(/[\s,]+/);
  if (parts.length > 4 || parts.some(part => !/^(?:[1-9]|10)$/.test(part))) return null;
  return parts.map(Number);
}

function findEquations(numbers, selected, target) {
  const cache = new Map();

  function build(mask) {
    if (cache.has(mask)) return cache.get(mask);
    const results = new Map();
    // One expression per value keeps the four-card search small without losing reachable results.
    function keep(value, expression) {
      if (Number.isFinite(value) && !results.has(value)) results.set(value, { value, expression });
    }
    if ((mask & (mask - 1)) === 0) {
      const number = numbers[Math.log2(mask)];
      keep(number, String(number));
      if (selected.includes('sqrt')) keep(Math.sqrt(number), `√${number}`);
    } else {
      // Disjoint masks distinguish repeated cards and ensure every number is used exactly once.
      for (let left = (mask - 1) & mask; left; left = (left - 1) & mask) {
        const right = mask ^ left;
        for (const a of build(left).values()) {
          for (const b of build(right).values()) {
            for (const name of selected) {
              const operation = operations[name];
              if (operation) keep(operation.apply(a.value, b.value), `(${a.expression} ${operation.symbol} ${b.expression})`);
            }
          }
        }
      }
    }
    cache.set(mask, results);
    return results;
  }

  return [...build((1 << numbers.length) - 1).values()]
    .map(result => ({ ...result, distance: Math.abs(result.value - target) }))
    .sort((a, b) => a.distance - b.distance || a.expression.length - b.expression.length)
    .slice(0, 8);
}

function formatNumber(value) {
  if (Math.abs(value) < 1e-10) return '0';
  return Number(value.toPrecision(7)).toString();
}

const optimizerForm = document.querySelector('#optimizer-form');
optimizerForm?.addEventListener('submit', event => {
  event.preventDefault();
  const input = document.querySelector('#numbers');
  const results = document.querySelector('#results');
  const numbers = parseNumbers(input.value);
  const selected = [...optimizerForm.querySelectorAll('input[name="operation"]:checked')].map(input => input.value);
  const target = Number(document.querySelector('#target').value);
  input.removeAttribute('aria-invalid');
  if (!numbers) {
    results.textContent = 'Enter 1–4 whole numbers from 1 to 10, separated by commas or spaces.';
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  if (numbers.length > 1 && !selected.some(name => operations[name])) {
    results.textContent = 'Choose at least one of +, −, ×, or ÷ to connect your number cards.';
    return;
  }

  const equations = findEquations(numbers, selected, target);
  results.replaceChildren();
  const summary = document.createElement('p');
  summary.className = 'result-count';
  summary.textContent = equations.length ? `Closest results to ${target}, using all ${numbers.length} number card${numbers.length === 1 ? '' : 's'}.` : 'No valid equations with these numbers and operations. Try another hand.';
  results.append(summary);
  for (const equation of equations) {
    const row = document.createElement('div');
    row.className = 'equation-result';
    const expression = document.createElement('div');
    expression.className = 'equation-text';
    const display = equation.expression.startsWith('(') ? equation.expression.slice(1, -1) : equation.expression;
    const formatted = formatNumber(equation.value);
    const relation = Number(formatted) === equation.value ? '=' : '≈';
    expression.textContent = `${display} ${relation} ${formatted}`;
    const detail = document.createElement('div');
    detail.className = 'equation-value';
    if (equation.distance < 1e-9) {
      detail.classList.add('exact-match');
      detail.textContent = 'Right on target';
    } else {
      detail.textContent = `Distance from ${target}: ${formatNumber(equation.distance)}`;
    }
    row.append(expression, detail);
    results.append(row);
  }
});
