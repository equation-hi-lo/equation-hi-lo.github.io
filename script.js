// Equation HI-LO Optimizer
class EquationOptimizer {
    constructor() {
        this.operations = {
            add: (a, b) => a + b,
            subtract: (a, b) => a - b,
            multiply: (a, b) => a * b,
            divide: (a, b) => b !== 0 ? a / b : null,
            sqrt: (a) => a >= 0 ? Math.sqrt(a) : null
        };
        
        this.operationSymbols = {
            add: '+',
            subtract: '-',
            multiply: '×',
            divide: '÷',
            sqrt: '√'
        };

        this.init();
    }

    init() {
        const optimizeButton = document.getElementById('optimize');
        if (optimizeButton) {
            optimizeButton.addEventListener('click', () => this.optimizeEquations());
        }

        // Smooth scrolling for navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    parseNumbers(input) {
        return input.split(',')
            .map(num => parseFloat(num.trim()))
            .filter(num => !isNaN(num) && num >= 1 && num <= 10);
    }

    getSelectedOperations() {
        const operations = [];
        if (document.getElementById('add').checked) operations.push('add');
        if (document.getElementById('subtract').checked) operations.push('subtract');
        if (document.getElementById('multiply').checked) operations.push('multiply');
        if (document.getElementById('divide').checked) operations.push('divide');
        if (document.getElementById('sqrt').checked) operations.push('sqrt');
        return operations;
    }

    generateCombinations(numbers, maxNumbers = 4) {
        const combinations = [];
        
        // Generate all possible combinations of numbers (1 to maxNumbers)
        for (let len = 1; len <= Math.min(maxNumbers, numbers.length); len++) {
            this.getCombinations(numbers, len).forEach(combo => {
                combinations.push(combo);
            });
        }
        
        return combinations;
    }

    getCombinations(array, length) {
        if (length === 1) {
            return array.map(item => [item]);
        }
        
        const combinations = [];
        for (let i = 0; i <= array.length - length; i++) {
            const head = array[i];
            const tailCombinations = this.getCombinations(array.slice(i + 1), length - 1);
            tailCombinations.forEach(tail => {
                combinations.push([head, ...tail]);
            });
        }
        
        return combinations;
    }

    evaluateExpression(numbers, operations, operationsList) {
        const results = [];
        
        // Try different arrangements of numbers and operations
        this.generateExpressions(numbers, operationsList).forEach(expr => {
            try {
                const result = this.calculateExpression(expr);
                if (result !== null && !isNaN(result) && isFinite(result)) {
                    results.push({
                        expression: expr.display,
                        value: result,
                        numbers: expr.numbers
                    });
                }
            } catch (e) {
                // Skip invalid expressions
            }
        });

        return results;
    }

    generateExpressions(numbers, operations) {
        const expressions = [];
        
        if (numbers.length === 1) {
            // Single number expressions
            expressions.push({
                display: numbers[0].toString(),
                value: numbers[0],
                numbers: [numbers[0]]
            });
            
            // Square root of single number
            if (operations.includes('sqrt')) {
                const sqrtVal = this.operations.sqrt(numbers[0]);
                if (sqrtVal !== null) {
                    expressions.push({
                        display: `√${numbers[0]}`,
                        value: sqrtVal,
                        numbers: [numbers[0]]
                    });
                }
            }
        } else if (numbers.length === 2) {
            // Two number expressions
            const [a, b] = numbers;
            
            operations.forEach(op => {
                if (op !== 'sqrt') {
                    const result = this.operations[op](a, b);
                    if (result !== null) {
                        expressions.push({
                            display: `${a} ${this.operationSymbols[op]} ${b}`,
                            value: result,
                            numbers: [a, b]
                        });
                    }
                    
                    // Also try b op a for non-commutative operations
                    if (op === 'subtract' || op === 'divide') {
                        const result2 = this.operations[op](b, a);
                        if (result2 !== null) {
                            expressions.push({
                                display: `${b} ${this.operationSymbols[op]} ${a}`,
                                value: result2,
                                numbers: [b, a]
                            });
                        }
                    }
                }
            });
            
            // Square root variations
            if (operations.includes('sqrt')) {
                const sqrtA = this.operations.sqrt(a);
                const sqrtB = this.operations.sqrt(b);
                
                if (sqrtA !== null) {
                    expressions.push({
                        display: `√${a}`,
                        value: sqrtA,
                        numbers: [a]
                    });
                    
                    // √a + b, √a - b, etc.
                    operations.forEach(op => {
                        if (op !== 'sqrt') {
                            const result = this.operations[op](sqrtA, b);
                            if (result !== null) {
                                expressions.push({
                                    display: `√${a} ${this.operationSymbols[op]} ${b}`,
                                    value: result,
                                    numbers: [a, b]
                                });
                            }
                        }
                    });
                }
                
                if (sqrtB !== null) {
                    expressions.push({
                        display: `√${b}`,
                        value: sqrtB,
                        numbers: [b]
                    });
                }
            }
        } else if (numbers.length >= 3) {
            // More complex expressions with 3+ numbers
            const [a, b, c] = numbers;
            
            // Try various combinations
            operations.forEach(op1 => {
                if (op1 !== 'sqrt') {
                    operations.forEach(op2 => {
                        if (op2 !== 'sqrt') {
                            // a op1 b op2 c
                            const intermediate = this.operations[op1](a, b);
                            if (intermediate !== null) {
                                const final = this.operations[op2](intermediate, c);
                                if (final !== null) {
                                    expressions.push({
                                        display: `${a} ${this.operationSymbols[op1]} ${b} ${this.operationSymbols[op2]} ${c}`,
                                        value: final,
                                        numbers: [a, b, c]
                                    });
                                }
                            }
                            
                            // (a op1 b) op2 c with parentheses for clarity when needed
                            if (this.needsParentheses(op1, op2)) {
                                const intermediate2 = this.operations[op1](a, b);
                                if (intermediate2 !== null) {
                                    const final2 = this.operations[op2](intermediate2, c);
                                    if (final2 !== null) {
                                        expressions.push({
                                            display: `(${a} ${this.operationSymbols[op1]} ${b}) ${this.operationSymbols[op2]} ${c}`,
                                            value: final2,
                                            numbers: [a, b, c]
                                        });
                                    }
                                }
                            }
                        }
                    });
                }
            });
        }
        
        return expressions;
    }

    needsParentheses(op1, op2) {
        const precedence = { multiply: 2, divide: 2, add: 1, subtract: 1 };
        return precedence[op1] < precedence[op2];
    }

    calculateExpression(expr) {
        return expr.value;
    }

    findBestEquations(results, target, maxResults = 10) {
        // Sort by distance from target
        const sorted = results
            .map(result => ({
                ...result,
                distance: Math.abs(result.value - target)
            }))
            .sort((a, b) => a.distance - b.distance);

        // Remove duplicates and limit results
        const unique = [];
        const seen = new Set();
        
        for (const result of sorted) {
            const key = `${result.expression}_${result.value.toFixed(4)}`;
            if (!seen.has(key) && unique.length < maxResults) {
                seen.add(key);
                unique.push(result);
            }
        }

        return unique;
    }

    optimizeEquations() {
        const numbersInput = document.getElementById('numbers');
        const targetSelect = document.getElementById('target');
        const resultsContainer = document.getElementById('results');

        // Get input values
        const numbers = this.parseNumbers(numbersInput.value);
        const operations = this.getSelectedOperations();
        const target = parseFloat(targetSelect.value);

        // Validate inputs
        if (numbers.length === 0) {
            resultsContainer.innerHTML = '<p>Please enter valid numbers between 1 and 10.</p>';
            return;
        }

        if (operations.length === 0) {
            resultsContainer.innerHTML = '<p>Please select at least one operation.</p>';
            return;
        }

        // Show loading message
        resultsContainer.innerHTML = '<p>Calculating optimal equations...</p>';

        // Generate combinations and evaluate expressions
        setTimeout(() => {
            const combinations = this.generateCombinations(numbers);
            let allResults = [];

            combinations.forEach(combo => {
                const results = this.evaluateExpression(combo, operations, operations);
                allResults = allResults.concat(results);
            });

            // Find best equations
            const bestEquations = this.findBestEquations(allResults, target);

            // Display results
            this.displayResults(bestEquations, target, resultsContainer);
        }, 100);
    }

    displayResults(equations, target, container) {
        if (equations.length === 0) {
            container.innerHTML = '<p>No valid equations found with the given numbers and operations.</p>';
            return;
        }

        const targetText = target === 1 ? 'Low (1)' : 'High (20)';
        let html = `<h4>Best equations for ${targetText}:</h4>`;

        equations.slice(0, 8).forEach((eq, index) => {
            const accuracy = ((1 - eq.distance / Math.abs(target)) * 100).toFixed(1);
            html += `
                <div class="equation-result">
                    <div class="equation-text">${eq.expression} = ${eq.value.toFixed(3)}</div>
                    <div class="equation-value">Distance from ${target}: ${eq.distance.toFixed(3)} • Accuracy: ${accuracy}%</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }
}

// Initialize the optimizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new EquationOptimizer();
});

// Add smooth scrolling to all anchor links
document.addEventListener('DOMContentLoaded', () => {
    // Update active navigation link on scroll
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('section');
        const navLinks = document.querySelectorAll('.nav-link');
        
        let currentSection = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.scrollY >= sectionTop) {
                currentSection = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    });
});
