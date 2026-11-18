import { findEquations as findLegalEquations } from './game-engine.mjs?v=fdd35bb469e1';

const symbols = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
const numberHelp = 'Enter exactly four whole numbers from 0 to 10, separated by commas or spaces.';
const initialMessage = 'Select “Find equations” to see your closest low and high plays.';

export function parseNumbers(input) {
  const parts = input.trim().split(/[\s,]+/);
  if (parts.length !== 4 || parts.some(part => !/^(?:[0-9]|10)$/.test(part))) return null;
  return parts.map(Number);
}

export function operationError(selected) {
  if (new Set(selected).size !== selected.length || selected.some(name => !Object.hasOwn(symbols, name) && name !== 'sqrt')) {
    return 'Choose each operation card at most once.';
  }
  if (!selected.includes('divide')) return 'Keep your division card; it cannot be discarded.';
  const add = selected.includes('add');
  const subtract = selected.includes('subtract');
  if (selected.includes('multiply')) {
    if (add && subtract) return 'You added ×. Uncheck + Add or − Subtract before finding equations.';
    if (!add && !subtract) return 'Keep either + Add or − Subtract alongside × and ÷.';
  } else if (!add || !subtract) return 'Start with +, −, and ÷. Select × to replace + or −.';
  return '';
}

export function analyzeHand(numbers, selected) {
  if (numbers.length !== 4 || numbers.some(number => !Number.isInteger(number) || number < 0 || number > 10)) throw new Error(numberHelp);
  const error = operationError(selected);
  if (error) throw new Error(error);
  const hand = {
    cards: numbers.map((value, index) => ({ id: `number-${index}`, value })),
    operators: selected.filter(name => Object.hasOwn(symbols, name)).map(name => ({ id: name, symbol: symbols[name] })),
    roots: selected.includes('sqrt') ? [{ id: 'sqrt', symbol: '√' }] : []
  };
  const candidates = findLegalEquations(hand);
  const closest = target => candidates.map(equation => ({
    expression: equation.text, value: equation.value, distance: Math.abs(equation.value - target)
  })).sort((a, b) => a.distance - b.distance).slice(0, 8);
  const low = closest(1);
  const high = closest(20);
  return {
    total: candidates.length, low, high,
    swing: low[0]?.distance < 1e-9 && high[0]?.distance < 1e-9
  };
}

function formatNumber(value) {
  if (Math.abs(value) < 1e-10) return '0';
  return Number(value.toPrecision(7)).toString();
}

const optimizerForm = typeof document === 'undefined' ? null : document.querySelector('#optimizer-form');
if (optimizerForm) {
  const input = document.querySelector('#numbers');
  const results = document.querySelector('#results');
  const operationHelp = document.querySelector('#operation-help');
  const submit = optimizerForm.querySelector('button[type="submit"]');
  const selectedOperations = () => [...optimizerForm.querySelectorAll('input[name="operation"]:checked')].map(input => input.value);

  function updateOperations() {
    const multiply = document.querySelector('#multiply').checked;
    for (const id of ['add', 'subtract']) {
      const checkbox = document.querySelector(`#${id}`);
      if (!multiply) checkbox.checked = true;
      checkbox.disabled = !multiply;
    }
    const error = operationError(selectedOperations());
    operationHelp.textContent = error || (multiply ? 'Ready: × replaces the unchecked card. Keep ÷.' : 'Start with +, −, and ÷. To use ×, select it and uncheck + or −.');
    operationHelp.classList.toggle('operation-error', Boolean(error));
    submit.disabled = Boolean(error);
    results.textContent = error || initialMessage;
  }

  optimizerForm.addEventListener('change', event => {
    if (event.target.name === 'operation') updateOperations();
    else results.textContent = initialMessage;
  });
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    results.textContent = operationError(selectedOperations()) || initialMessage;
  });
  optimizerForm.addEventListener('submit', event => {
    event.preventDefault();
    const selected = selectedOperations();
    const error = operationError(selected);
    results.textContent = error;
    if (error) return;
    const numbers = parseNumbers(input.value);
    input.removeAttribute('aria-invalid');
    if (!numbers) {
      results.textContent = numberHelp;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    const analysis = analyzeHand(numbers, selected);
    results.replaceChildren();
    if (!analysis.total) {
      results.textContent = 'No legal equation for this hand: every arrangement divides by zero.';
      return;
    }
    if (analysis.swing) {
      const message = document.createElement('aside');
      message.className = 'swing-opportunity';
      const title = document.createElement('h3');
      title.textContent = 'An exact swing is possible!';
      const description = document.createElement('p');
      description.textContent = 'Make both 1 and 20 with these same number and operation cards. A swing still needs to win both sides, including any tie breakers.';
      message.append(title, description);
      results.append(message);
    }
    const note = document.createElement('p');
    note.className = 'result-count';
    note.textContent = 'Each equation uses every card once. Different equations with the same answer count as one distinct result.';
    results.append(note);
    const targets = document.createElement('div');
    targets.className = 'optimizer-targets';
    for (const [side, target] of [['low', 1], ['high', 20]]) {
      const equations = analysis[side];
      const section = document.createElement('section');
      section.className = 'target-results';
      section.setAttribute('aria-labelledby', `${side}-heading`);
      const heading = document.createElement('h3');
      heading.id = `${side}-heading`;
      heading.textContent = `${side === 'low' ? 'Low' : 'High'} · ${target}`;
      const count = document.createElement('p');
      count.className = 'target-result-count';
      count.textContent = `${equations.length} closest out of ${analysis.total} distinct result${analysis.total === 1 ? '' : 's'}`;
      section.append(heading, count);
      const alternatives = equations.length > 1 ? document.createElement('details') : null;
      if (alternatives) {
        alternatives.className = 'alternative-equations';
        const toggle = document.createElement('summary');
        toggle.textContent = `Show ${equations.length - 1} more ${side} matches`;
        alternatives.append(toggle);
      }
      for (const [index, equation] of equations.entries()) {
        const row = document.createElement('div');
        row.className = index === 0 ? 'equation-result best-equation' : 'equation-result';
        const expression = document.createElement('div');
        expression.className = 'equation-text';
        const formatted = formatNumber(equation.value);
        const relation = Number(formatted) === equation.value ? '=' : '≈';
        expression.textContent = `${equation.expression} ${relation} ${formatted}`;
        const detail = document.createElement('div');
        detail.className = 'equation-value';
        if (equation.distance < 1e-9) {
          detail.classList.add('exact-match');
          detail.textContent = 'Right on target';
        } else detail.textContent = `Distance from ${target}: ${formatNumber(equation.distance)}`;
        row.append(expression, detail);
        (index === 0 ? section : alternatives).append(row);
      }
      if (alternatives) section.append(alternatives);
      targets.append(section);
    }
    results.append(targets);
  });
  updateOperations();
}
