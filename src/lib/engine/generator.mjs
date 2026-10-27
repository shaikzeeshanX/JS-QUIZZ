/**
 * AI ENGINE v2 — deterministic, seeded JavaScript question generator.
 *
 * Every login produces a NEW seed, so every login produces a NEW set of
 * questions: fresh mixes, fresh numbers, fresh variable names, fresh
 * option orders. The same seed always rebuilds the exact same set, so a
 * session can be verified / resumed without any drift.
 *
 * Pure functions, zero external calls — it can never fail because of a
 * network outage, which keeps the API 100% reliable.
 */

/** Fast deterministic PRNG (mulberry32). */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
const int = (r, min, max) => min + Math.floor(r() * (max - min + 1));

function shuffle(r, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Merge an answer with distractors into a clean, unique, shuffled option list. */
function finalize(r, answerText, distractors) {
  const answer = String(answerText);
  const seen = new Set([answer]);
  const ds = [];
  for (const d of distractors) {
    const t = String(d);
    if (!seen.has(t)) {
      seen.add(t);
      ds.push(t);
      if (ds.length === 3) break;
    }
  }
  let pad = 1;
  while (ds.length < 3) {
    const filler = `not this one #${pad++}`;
    if (!seen.has(filler)) {
      seen.add(filler);
      ds.push(filler);
    }
  }
  const options = shuffle(r, [answer, ...ds]);
  return { options, answerIndex: options.indexOf(answer) };
}

/* ------------------------------------------------------------------ */
/* Template generators — each builds one randomized question.          */
/* ------------------------------------------------------------------ */

const VARS = ["v", "x", "zap", "val", "n", "w", "counter", "msg"];

const TEMPLATES = [
  // 1 — string + number coercion through concatenation
  (r) => {
    const v = pick(r, VARS);
    const n = int(r, 2, 50);
    const s = pick(r, ["java", "script", "brutal", "quiz", "web", "node"]);
    const answer = `${n}${s}1`;
    const { options, answerIndex } = finalize(r, answer, [
      "NaN",
      `${n + 1}${s}`,
      `${n}${s}`,
      `${n}${s} 1`,
      String(n * 2 + 1),
    ]);
    return {
      topic: "Coercion",
      difficulty: "medium",
      question: "What is the output?",
      code: `let ${v} = ${n};\n${v} = ${v} + "${s}";\nconsole.log(${v} + 1);`,
      options,
      answerIndex,
      explanation: `"${s}" makes ${v} a string, so + keeps concatenating: "${n}${s}" + 1 becomes "${n}${s}1".`,
    };
  },

  // 2 — pop() vs shift()
  (r) => {
    const set = shuffle(r, [10, 20, 30, 40, 50, 60, 70, 80]).slice(0, 3);
    const m = pick(r, ["pop", "shift"]);
    const answer = m === "pop" ? set[2] : set[0];
    const { options, answerIndex } = finalize(r, String(answer), [
      m === "pop" ? String(set[0]) : String(set[2]),
      String(set[1]),
      "undefined",
      "0",
      "null",
    ]);
    return {
      topic: "Array methods",
      difficulty: "easy",
      question: `What does this print?`,
      code: `const stack = [${set.join(", ")}];\nconsole.log(stack.${m}());`,
      options,
      answerIndex,
      explanation: `${m}() removes from the ${m === "pop" ? "END" : "START"} of the array and returns the removed element.`,
    };
  },

  // 3 — template literals evaluate expressions
  (r) => {
    const price = int(r, 2, 9);
    const k = pick(r, [2, 3, 4]);
    const answer = `Total: ${price * k} USD`;
    const { options, answerIndex } = finalize(r, answer, [
      `Total: ${price}${k} USD`,
      `Total: ${price * k + 1} USD`,
      `Total: \${price * ${k}} USD`,
      `Total: ${price * k}USD`,
      `NaN USD`,
    ]);
    return {
      topic: "Template literals",
      difficulty: "easy",
      question: "What is the output?",
      code: `const price = ${price};\nconsole.log(\`Total: \${price * ${k}} USD\`);`,
      options,
      answerIndex,
      explanation: `Inside backticks, price * ${k} is evaluated first: ${price} x ${k} = ${price * k}.`,
    };
  },

  // 4 — nullish coalescing with a missing property
  (r) => {
    const name = pick(r, ["Ada", "Zoe", "Lin", "Max", "Rex"]);
    const hasName = r() < 0.5;
    const answer = hasName ? `"${name}"` : `"anon"`;
    const { options, answerIndex } = finalize(r, answer, [
      hasName ? `"anon"` : `"${name}"`,
      "undefined",
      "null",
      "ReferenceError",
      "user.name",
    ]);
    return {
      topic: "Operators",
      difficulty: "medium",
      question: "What is logged?",
      code: `const user = ${hasName ? `{ name: "${name}" }` : "{}"};\nconsole.log(user.name ?? "anon");`,
      options,
      answerIndex,
      explanation: hasName
        ? `?? only falls back for null/undefined. user.name is "${name}", so "${name}" is printed.`
        : `user.name is undefined, so ?? returns the fallback "anon".`,
    };
  },

  // 5 — String.prototype.slice
  (r) => {
    const word = pick(r, ["brutalism", "javascript", "webcode", "typewrite"]);
    const i = int(r, 0, 3);
    const j = int(r, i + 2, Math.min(word.length, i + 5));
    const answer = word.slice(i, j);
    const { options, answerIndex } = finalize(r, `"${answer}"`, [
      `"${word.slice(0, j)}"`,
      `"${word.slice(i)}"`,
      `"${word.slice(j, i)}"`,
      `"${word.toUpperCase().slice(i, j)}"`,
      "undefined",
    ]);
    return {
      topic: "Strings",
      difficulty: "medium",
      question: "What is the output?",
      code: `console.log("${word}".slice(${i}, ${j}));`,
      options,
      answerIndex,
      explanation: `slice(${i}, ${j}) copies from index ${i} up to (not including) index ${j} → "${answer}".`,
    };
  },

  // 6 — parseInt stops at the first non-digit
  (r) => {
    const digits = String(int(r, 11, 999));
    const suffix = pick(r, ["px", "%", "em", "pt"]);
    const { options, answerIndex } = finalize(r, digits, [
      `${digits}${suffix}`,
      "NaN",
      "undefined",
      digits[0],
      String(Number(digits) + 1),
    ]);
    return {
      topic: "Type conversion",
      difficulty: "easy",
      question: "What is the output?",
      code: `console.log(parseInt("${digits}${suffix}"));`,
      options,
      answerIndex,
      explanation: `parseInt reads digits from the start and stops at "${suffix}" — it returns ${digits}.`,
    };
  },

  // 7 — event loop: sync → microtask → macrotask
  (r) => {
    const [s1, timer, promise, s2] = shuffle(r, ["A", "B", "C", "D"]);
    const answer = `${s1} ${s2} ${promise} ${timer}`;
    const { options, answerIndex } = finalize(r, answer, [
      `${s1} ${timer} ${promise} ${s2}`,
      `${s1} ${promise} ${s2} ${timer}`,
      `${s1} ${promise} ${timer} ${s2}`,
      `${timer} ${promise} ${s1} ${s2}`,
      `${s1} ${s2} ${timer} ${promise}`,
    ]);
    return {
      topic: "Event loop",
      difficulty: "hard",
      question: "In what order are the letters printed?",
      code: `console.log("${s1}");\nsetTimeout(() => console.log("${timer}"), 0);\nPromise.resolve().then(() => console.log("${promise}"));\nconsole.log("${s2}");`,
      options,
      answerIndex,
      explanation: `Synchronous code runs first (${s1}, ${s2}), then the microtask (Promise) ${promise}, and the setTimeout macrotask ${timer} always comes last.`,
    };
  },

  // 8 — temporal dead zone with let
  (r) => {
    const v = pick(r, VARS);
    const n = int(r, 1, 99);
    const { options, answerIndex } = finalize(r, "ReferenceError", [
      "undefined",
      String(n),
      "null",
      "0",
      "TypeError",
    ]);
    return {
      topic: "Scope",
      difficulty: "hard",
      question: "What happens?",
      code: `console.log(${v});\nlet ${v} = ${n};`,
      options,
      answerIndex,
      explanation: `let declarations live in the temporal dead zone until their line runs — reading ${v} before that throws a ReferenceError.`,
    };
  },

  // 9 — equality quirks (picks one classic)
  (r) => {
    const classics = [
      { code: 'console.log([] == "");', answer: "true", why: '[] becomes "" and "" == "" is true.' },
      { code: "console.log(null == undefined);", answer: "true", why: "null and undefined are loosely equal to each other (and only to each other)." },
      { code: "console.log(NaN === NaN);", answer: "false", why: "NaN is the only value not equal to itself." },
      { code: 'console.log(0 == "0");', answer: "true", why: '"0" is coerced to the number 0, and 0 == 0 is true.' },
      { code: 'console.log(!!"false");', answer: "true", why: '"false" is a non-empty string — every non-empty string is truthy.' },
      { code: 'console.log("" == "0");', answer: "false", why: "Both sides are strings, so no coercion happens and the texts differ." },
    ];
    const c = pick(r, classics);
    const { options, answerIndex } = finalize(r, c.answer, [
      c.answer === "true" ? "false" : "true",
      "TypeError",
      "undefined",
      "NaN",
    ]);
    return {
      topic: "Equality",
      difficulty: "medium",
      question: "What is the output?",
      code: c.code,
      options,
      answerIndex,
      explanation: c.why,
    };
  },

  // 10 — sort() compares as strings
  (r) => {
    const nums = shuffle(r, [1, 2, 10, 11, 20, 25, 100]).slice(0, 3);
    const strSorted = [...nums].map(String).sort();
    const numSorted = [...nums].sort((a, b) => a - b);
    const answer = `[ ${strSorted.join(", ")} ]`;
    const { options, answerIndex } = finalize(r, answer, [
      `[ ${numSorted.join(", ")} ]`,
      `[ ${[...nums].sort((a, b) => b - a).join(", ")} ]`,
      `[ ${nums.join(", ")} ]`,
      "undefined",
      "TypeError",
    ]);
    return {
      topic: "Array methods",
      difficulty: "hard",
      question: "What is the output?",
      code: `console.log([${nums.join(", ")}].sort());`,
      options,
      answerIndex,
      explanation: `sort() converts elements to strings and compares UTF-16 order — so the numbers print as ${answer}.`,
    };
  },

  // 11 — "-" converts, "+" concatenates with strings
  (r) => {
    const str = pick(r, ['"6"', '"12"', '"9"', '"40"']);
    const digit = Number(str.slice(1, -1));
    const op = pick(r, ["+", "-"]);
    const k = int(r, 2, 5);
    const answer = op === "-" ? String(digit - k) : `${digit}${k}`;
    const { options, answerIndex } = finalize(r, answer, [
      op === "-" ? `${digit}${k}` : String(digit - k),
      op === "-" ? `${digit} - ${k}` : `${digit + k}`,
      "NaN",
      "null",
      "undefined",
    ]);
    return {
      topic: "Coercion",
      difficulty: "medium",
      question: "What is the output?",
      code: `console.log(${str} ${op} ${k});`,
      options,
      answerIndex,
      explanation:
        op === "-"
          ? `- only does arithmetic, so ${str} is converted to the number ${digit}: ${digit} - ${k} = ${digit - k}.`
          : `+ with a string prefers concatenation: ${str} + ${k} joins the text → "${digit}${k}".`,
    };
  },

  // 12 — spread creates a copy, not a reference
  (r) => {
    const a = [int(r, 1, 5), int(r, 6, 9)];
    const extra = int(r, 10, 99);
    const answer = "2 3";
    const { options, answerIndex } = finalize(r, answer, [
      "2 2",
      "3 3",
      "3 2",
      "2 undefined",
      "6 3",
    ]);
    return {
      topic: "Spread & copies",
      difficulty: "medium",
      question: "What is the output?",
      code: `const a = [${a[0]}, ${a[1]}];\nconst b = [...a];\nb.push(${extra});\nconsole.log(a.length, b.length);`,
      options,
      answerIndex,
      explanation: `[...a] makes a shallow copy — pushing to b leaves a untouched: 2 3.`,
    };
  },
];

/* ------------------------------------------------------------------ */
/* Bank of fixed AI-authored questions (order of options gets shuffled */
/* per seed by the engine).                                            */
/* ------------------------------------------------------------------ */

const BANK = [
  { topic: "Types", difficulty: "medium", question: "What does `typeof null` return?", options: ['"null"', '"object"', '"undefined"', '"number"'], answerIndex: 1, explanation: "typeof null returns \"object\" — a historical bug kept for backwards compatibility." },
  { topic: "Types", difficulty: "easy", question: "Which of these is NOT a primitive type?", options: ["string", "boolean", "Array", "symbol"], answerIndex: 2, explanation: "Arrays are objects. Primitives are string, number, boolean, undefined, null, symbol and bigint." },
  { topic: "Arrays", difficulty: "easy", question: "Which method adds an item to the END of an array and returns the new length?", options: ["push()", "pop()", "shift()", "concat()"], answerIndex: 0, explanation: "push() appends to the end and returns the array's new length." },
  { topic: "Array methods", difficulty: "medium", question: "What is the output?", code: "console.log([1, 2, 3].map(x => x * 2).join('-'));", options: ["2-4-6", "1-2-3", "[2, 4, 6]", "246"], answerIndex: 0, explanation: "map doubles each item → [2, 4, 6], then join('-') glues them with dashes." },
  { topic: "const", difficulty: "medium", question: "const obj = { a: 1 }; obj.a = 5; — what happens?", options: ["Works fine", "TypeError", "Silently ignored", "obj becomes frozen"], answerIndex: 0, explanation: "const locks the BINDING, not the value — object properties can still change." },
  { topic: "Types", difficulty: "easy", question: "What does Boolean(\"\") return?", options: ["false", "true", "undefined", "TypeError"], answerIndex: 0, explanation: "The empty string is one of JS's falsy values → false." },
  { topic: "Async", difficulty: "medium", question: "setTimeout(fn, 0) runs fn…", options: ["Immediately", "After the current synchronous code", "Before Promises", "On the next frame exactly"], answerIndex: 1, explanation: "Even with 0 ms, callbacks wait until the call stack is empty (and after microtasks)." },
  { topic: "Type conversion", difficulty: "medium", question: "What does Number(\"abc\") return?", options: ["NaN", "0", "undefined", "throws an error"], answerIndex: 0, explanation: "Number() on unparseable text gives NaN (Not a Number)." },
  { topic: "Spread", difficulty: "easy", question: "What does [...arr] create?", options: ["A shallow copy", "A reference to the same array", "A deep clone", "An iterator"], answerIndex: 0, explanation: "Spread expands arr into a NEW array (top-level shallow copy)." },
  { topic: "Template literals", difficulty: "easy", question: "What does `${2 + 3}` evaluate to inside backticks?", options: ['"5"', '"${2 + 3}"', "23", "2 + 3"], answerIndex: 0, explanation: "Inside ${ } expressions are evaluated, then stringified → \"5\"." },
  { topic: "Variables", difficulty: "easy", question: "Which keyword creates a block-scoped binding that CANNOT be reassigned?", options: ["const", "let", "var", "function"], answerIndex: 0, explanation: "const is block-scoped and its binding cannot be reassigned." },
  { topic: "Objects", difficulty: "easy", question: "What is Object.keys({ a: 1, b: 2 }).length?", options: ["2", "1", "0", "undefined"], answerIndex: 0, explanation: "Object.keys returns the two own enumerable keys: a and b." },
  { topic: "Math", difficulty: "easy", question: "What does Math.floor(4.9) return?", options: ["4", "5", "4.9", "0"], answerIndex: 0, explanation: "Math.floor always rounds DOWN → 4." },
  { topic: "Strings", difficulty: "easy", question: "What is \"abc\".toUpperCase()?", options: ['"ABC"', '"abc"', '"Abc"', "undefined"], answerIndex: 0, explanation: "toUpperCase returns a NEW string — original strings are never mutated." },
  { topic: "Operators", difficulty: "medium", question: "What does null ?? \"fallback\" evaluate to?", options: ['"fallback"', "null", "undefined", "TypeError"], answerIndex: 0, explanation: "?? falls back only for null/undefined — and null qualifies." },
  { topic: "Operators", difficulty: "medium", question: "What does 0 || \"default\" evaluate to?", options: ['"default"', "0", "false", "null"], answerIndex: 0, explanation: "0 is falsy, so || returns the right operand \"default\"." },
  { topic: "Array methods", difficulty: "medium", question: "What does [10, 20, 30].filter(n => n > 15) return?", options: ["[20, 30]", "[10, 20, 30]", "[30]", "true"], answerIndex: 0, explanation: "filter keeps elements that pass the test → [20, 30]." },
  { topic: "Loops", difficulty: "medium", question: "Which loop can iterate over the characters of a string?", options: ["for...of", "forEach", "map", "while...in"], answerIndex: 0, explanation: "Strings are iterable — for...of walks their characters." },
  { topic: "Functions", difficulty: "easy", question: "A function with no return statement returns…", options: ["undefined", "null", "0", "NaN"], answerIndex: 0, explanation: "Every function returns undefined unless you return something." },
  { topic: "Errors", difficulty: "medium", question: "JSON.parse(\"{bad\") does what?", options: ["Throws a SyntaxError", "Returns null", "Returns {}", "Returns the string"], answerIndex: 0, explanation: "Invalid JSON throws a SyntaxError — wrap parse calls in try/catch." },
  { topic: "Operators", difficulty: "medium", question: "What does 2 ** 3 evaluate to?", options: ["8", "6", "9", "23"], answerIndex: 0, explanation: "** is the exponent operator: 2 to the power of 3 = 8." },
  { topic: "Coercion", difficulty: "medium", question: "What is \"5\" * 2?", options: ["10", '"52"', "NaN", "undefined"], answerIndex: 0, explanation: "* only does math, so \"5\" is coerced to the number 5 → 10." },
  { topic: "Arrays", difficulty: "easy", question: "let arr = [9]; arr.push(1, 2, 3); — what is arr.length?", options: ["4", "2", "3", "1"], answerIndex: 0, explanation: "push accepts multiple items: [9, 1, 2, 3] → length 4." },
  { topic: "DOM", difficulty: "easy", question: "Which API selects the FIRST matching element?", options: ["document.querySelector()", "document.querySelectorAll()", "document.getElement()", "document.findAll()"], answerIndex: 0, explanation: "querySelector returns the first match; querySelectorAll returns all of them." },
];

/** Self-check the bank at startup so bad data can never reach the API. */
function validateBank() {
  BANK.forEach((q, i) => {
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`Bank question ${i} must have exactly 4 options`);
    }
    if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) {
      throw new Error(`Bank question ${i} has an invalid answerIndex`);
    }
  });
}
validateBank();

function shuffleBankOptions(r, q) {
  const correct = q.options[q.answerIndex];
  const options = shuffle(r, q.options);
  return { ...q, options, answerIndex: options.indexOf(correct) };
}

/**
 * Build a fresh 10-question set from a numeric seed.
 * Mix: 5 randomized templates + 5 bank picks, interleaved, distinct.
 */
export function generateDynamicSet(seed) {
  const r = mulberry32(seed >>> 0);
  const templateOrder = shuffle(r, TEMPLATES.map((_, i) => i));
  const bankOrder = shuffle(r, BANK.map((_, i) => i));

  const chosen = [];
  for (let i = 0; i < 5; i++) {
    chosen.push({ type: "template", gen: TEMPLATES[templateOrder[i]] });
    chosen.push({ type: "bank", index: bankOrder[i] });
  }
  // Interleave: templates and bank alternate, then shuffle lightly.
  const ordered = shuffle(r, chosen);

  return ordered.map((item, i) => {
    const raw =
      item.type === "template" ? item.gen(r) : shuffleBankOptions(r, BANK[item.index]);
    return {
      id: `d${i + 1}`,
      kind: "dynamic",
      source: "AI ENGINE v2",
      ...raw,
    };
  });
}
