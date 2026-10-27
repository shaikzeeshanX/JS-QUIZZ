/**
 * The 10 FIXED foundation questions — transcribed 1:1 from
 * "JavaScript_Foundations_10_Question_Quiz.pptx" (slides 2–11).
 * Options stay in the deck's original A–D order; these never change.
 */

export const FOUNDATION = [
  {
    id: "f1",
    topic: "Variables",
    concept: "Variables in JavaScript",
    question: "Which keyword can be reassigned?",
    code: 'let age = 19;\nage = 20;\nconsole.log(age);',
    options: ["const", "let", "function", "return"],
    answerIndex: 1,
    explanation:
      "A variable declared with let can be assigned a new value. The output is 20.",
  },
  {
    id: "f2",
    topic: "Numbers",
    concept: "Addition with numbers",
    question: "What is the output?",
    code: "console.log(8 + 6);",
    options: ["86", "14", "2", "48"],
    answerIndex: 1,
    explanation:
      "Both values are numbers, so + performs arithmetic addition: 8 + 6 = 14.",
  },
  {
    id: "f3",
    topic: "Strings",
    concept: "String concatenation",
    question: "What is the output?",
    code: 'let x = "7";\nlet y = "4";\nconsole.log(x + y);',
    options: ['11', '"74"', '"11"', "74"],
    answerIndex: 1,
    explanation:
      "Both values are strings, so + joins their text instead of adding them numerically.",
  },
  {
    id: "f4",
    topic: "Data types",
    concept: "Boolean values",
    question: "What is the data type?",
    code: 'let isLoggedIn = false;\nconsole.log(typeof isLoggedIn);',
    options: ["String", "Number", "Boolean", "Array"],
    answerIndex: 2,
    explanation:
      "The value false is a Boolean. Booleans represent true or false.",
  },
  {
    id: "f5",
    topic: "Comparisons",
    concept: "Comparison operators",
    question: "What is the output?",
    code: "console.log(12 < 5);",
    options: ["true", "false", "12", "5"],
    answerIndex: 1,
    explanation: "12 is not less than 5, so the comparison evaluates to false.",
  },
  {
    id: "f6",
    topic: "Conditions",
    concept: "if / else conditions",
    question: "What will be printed?",
    code: 'let score = 45;\nif (score >= 50) {\n  console.log("Pass");\n} else {\n  console.log("Try again");\n}',
    options: ['"Pass"', '"Try again"', "45", "Nothing"],
    answerIndex: 1,
    explanation: "45 >= 50 is false, so the else block runs.",
  },
  {
    id: "f7",
    topic: "Functions",
    concept: "Functions, parameters & return",
    question: "What is the output?",
    code: "function multiply(a, b) {\n  return a * b;\n}\nconsole.log(multiply(3, 4));",
    options: ["7", "12", "34", "undefined"],
    answerIndex: 1,
    explanation:
      "The arguments 3 and 4 are passed to a and b. The function returns 3 x 4 = 12.",
  },
  {
    id: "f8",
    topic: "Arrays",
    concept: "Arrays and zero-based indexing",
    question: "What is the output?",
    code: 'let colors = ["Red", "Blue", "Green"];\nconsole.log(colors[2]);',
    options: ['"Red"', '"Blue"', '"Green"', "2"],
    answerIndex: 2,
    explanation:
      "Array positions start at 0: Red is 0, Blue is 1, and Green is 2.",
  },
  {
    id: "f9",
    topic: "Operators",
    concept: "Increment operator",
    question: "What does i++ do?",
    code: "let i = 5;\ni++;\nconsole.log(i);",
    options: ["Decreases by 1", "Increases by 1", "Multiplies by 2", "Sets to 0"],
    answerIndex: 1,
    explanation:
      "The increment operator adds one to the variable. Here, the output is 6.",
  },
  {
    id: "f10",
    topic: "DOM events",
    concept: "DOM events",
    question: "How do you respond to a button click?",
    code: 'const button = document.querySelector("button");\nbutton.addEventListener("click", () => {\n  document.querySelector("h1").textContent = "Hello!";\n});',
    options: [
      'addEventListener("click", ...)',
      "console.log()",
      'let heading = "Hello"',
      "Math.random()",
    ],
    answerIndex: 0,
    explanation:
      "A click event listener runs a callback when the button is clicked. The callback changes the heading text.",
  },
].map((q) => ({
  ...q,
  kind: "foundation",
  source: "PPT · JavaScript Foundations",
}));
