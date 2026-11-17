const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
}

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
});
navigation?.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});

document.querySelectorAll('[data-year]').forEach(element => {
  element.textContent = new Date().getFullYear();
});

const examples = {
  low: { numbers: [3, 8, 4, 1], operators: ['−', '÷', '×'], answer: 1, label: '3 minus 8 divided by 4 times 1 equals 1', caption: 'Right on target. That’s a low worth backing.' },
  high: { numbers: [8, 3, 4, 1], operators: ['×', '−', '÷'], answer: 20, label: '8 times 3 minus 4 divided by 1 equals 20', caption: 'Twenty, exactly. Same numbers. A whole new move.' }
};

document.querySelectorAll('[data-target]').forEach(button => {
  button.addEventListener('click', () => {
    const example = examples[button.dataset.target];
    const equation = document.querySelector('#demo-equation');
    document.querySelectorAll('[data-target]').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
    equation.querySelectorAll('.number-card').forEach((card, index) => { card.textContent = example.numbers[index]; });
    equation.querySelectorAll('.operator').forEach((operator, index) => { operator.textContent = example.operators[index] || '='; });
    equation.querySelector('.equation-answer').textContent = example.answer;
    equation.setAttribute('aria-label', example.label);
    document.querySelector('#demo-caption').textContent = example.caption;
  });
});
