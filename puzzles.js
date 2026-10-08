/**
 * Number Sense Lab — puzzle generation & validation (shared by app + node tests)
 * Offline only. No network.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.NSLPuzzles = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { const t = b; b = a % b; a = t; }
    return a || 1;
  }

  function simplifyFrac(n, d) {
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }

  function fracKey(f) { return f.n + '/' + f.d; }

  function fracEqual(a, b) {
    return a.n * b.d === b.n * a.d;
  }

  function fracAdd(a, b) {
    const n = a.n * b.d + b.n * a.d;
    const d = a.d * b.d;
    return simplifyFrac(n, d);
  }

  function fracToString(f) {
    if (f.d === 1) return String(f.n);
    return f.n + '/' + f.d;
  }

  /** Count valid sum answers in a number list. Returns {answers: [{value, i, j, k}], ...} */
  function findSumAnswers(nums) {
    const answers = [];
    const n = nums.length;
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        if (i === k) continue;
        for (let j = i + 1; j < n; j++) {
          if (j === k) continue;
          if (nums[i] + nums[j] === nums[k]) {
            answers.push({ value: nums[k], i, j, k, eq: nums[i] + ' + ' + nums[j] + ' = ' + nums[k] });
          }
        }
      }
    }
    // unique by answer index k
    const byK = {};
    answers.forEach(a => { byK[a.k] = byK[a.k] || a; });
    return Object.keys(byK).map(k => byK[k]);
  }

  function findProductAnswers(nums) {
    const answers = [];
    const n = nums.length;
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        if (i === k) continue;
        for (let j = i + 1; j < n; j++) {
          if (j === k) continue;
          if (nums[i] * nums[j] === nums[k]) {
            answers.push({ value: nums[k], i, j, k, eq: nums[i] + ' × ' + nums[j] + ' = ' + nums[k] });
          }
        }
      }
    }
    const byK = {};
    answers.forEach(a => { byK[a.k] = byK[a.k] || a; });
    return Object.keys(byK).map(k => byK[k]);
  }

  function findFracSumAnswers(fracs) {
    const answers = [];
    const n = fracs.length;
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        if (i === k) continue;
        for (let j = i + 1; j < n; j++) {
          if (j === k) continue;
          const s = fracAdd(fracs[i], fracs[j]);
          if (fracEqual(s, fracs[k])) {
            answers.push({
              value: fracs[k],
              i, j, k,
              eq: fracToString(fracs[i]) + ' + ' + fracToString(fracs[j]) + ' = ' + fracToString(fracs[k])
            });
          }
        }
      }
    }
    const byK = {};
    answers.forEach(a => { byK[a.k] = byK[a.k] || a; });
    return Object.keys(byK).map(k => byK[k]);
  }

  function uniqueValues(nums) {
    return new Set(nums).size === nums.length;
  }

  /**
   * Generate one Kakooma-style puzzle with exactly one valid answer.
   * mode: 'add25' | 'add99' | 'neg' | 'times9' | 'times12' | 'times20' | 'frac'
   * groupSize: 4–9
   */
  function generateKakooma(mode, groupSize, maxAttempts) {
    maxAttempts = maxAttempts || 120;
    groupSize = Math.max(4, Math.min(9, groupSize | 0));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let puzzle;
      if (mode === 'frac') puzzle = tryFrac(groupSize);
      else if (mode.indexOf('times') === 0) puzzle = tryTimes(mode, groupSize);
      else puzzle = tryAdd(mode, groupSize);

      if (puzzle) return puzzle;
    }
    return null;
  }

  function tryAdd(mode, groupSize) {
    let minN, maxN;
    if (mode === 'add12') { minN = 1; maxN = 11; }
    else if (mode === 'add25') { minN = 1; maxN = 24; }
    else if (mode === 'add99') { minN = 1; maxN = 90; }
    else if (mode === 'neg') { minN = -15; maxN = 15; }
    else { minN = 1; maxN = 24; }

    // pick two addends and sum
    let a, b, sum;
    if (mode === 'neg') {
      a = randInt(minN, maxN);
      b = randInt(minN, maxN);
      sum = a + b;
      if (sum < -15 || sum > 15) return null;
      if (sum === a || sum === b) return null;
    } else {
      const sumCap = mode === 'add99' ? 99 : (mode === 'add12' ? 12 : 25);
      a = randInt(1, Math.min(maxN, sumCap - 1));
      b = randInt(1, Math.min(maxN, sumCap - a));
      sum = a + b;
      if (sum > sumCap) return null;
    }

    const nums = [a, b, sum];
    const used = new Set(nums);

    // distractors: near-misses preferred (bounded attempts)
    let guard = 0;
    while (nums.length < groupSize) {
      if (++guard > 400) return null;
      let d;
      if (mode === 'neg') d = randInt(minN, maxN);
      else {
        const roll = Math.random();
        const sumCap = mode === 'add99' ? 99 : (mode === 'add12' ? 12 : 25);
        if (roll < 0.4) d = randInt(Math.max(1, sum - 8), Math.min(sumCap, sum + 8));
        else if (roll < 0.7) d = a + randInt(1, 6);
        else d = randInt(1, mode === 'add99' ? 90 : (mode === 'add12' ? 12 : 24));
        if (d < 1 || d > sumCap) continue;
      }
      if (used.has(d)) continue;
      const trial = nums.concat([d]);
      if (!uniqueValues(trial)) continue;
      const answers = findSumAnswers(trial);
      if (answers.length > 1) continue;
      nums.push(d);
      used.add(d);
    }

    if (!uniqueValues(nums)) return null;
    const answers = findSumAnswers(nums);
    if (answers.length !== 1) return null;
    if (answers[0].value !== sum) return null;

    return {
      mode: mode,
      op: 'sum',
      numbers: shuffle(nums),
      answer: sum,
      equation: a + ' + ' + b + ' = ' + sum,
      parts: [a, b],
      groupSize: groupSize
    };
  }

  function tryTimes(mode, groupSize) {
    let maxF = 9;
    if (mode === 'times12') maxF = 12;
    if (mode === 'times20') maxF = 20;

    const a = randInt(2, maxF);
    const b = randInt(2, maxF);
    const prod = a * b;
    if (a === b || a === prod || b === prod) return null;

    const nums = [a, b, prod];
    const used = new Set(nums);

    let guard = 0;
    while (nums.length < groupSize) {
      if (++guard > 400) return null;
      let d;
      const roll = Math.random();
      if (roll < 0.35) d = randInt(2, maxF) * randInt(2, Math.min(maxF, 6));
      else if (roll < 0.6) d = randInt(2, maxF);
      else d = prod + randInt(-6, 6);
      if (d < 2 || d > maxF * maxF) continue;
      if (used.has(d)) continue;
      const trial = nums.concat([d]);
      if (!uniqueValues(trial)) continue;
      const answers = findProductAnswers(trial);
      if (answers.length > 1) continue;
      nums.push(d);
      used.add(d);
    }

    if (!uniqueValues(nums)) return null;
    const answers = findProductAnswers(nums);
    if (answers.length !== 1) return null;
    if (answers[0].value !== prod) return null;

    return {
      mode: mode,
      op: 'product',
      numbers: shuffle(nums),
      answer: prod,
      equation: a + ' × ' + b + ' = ' + prod,
      parts: [a, b],
      groupSize: groupSize
    };
  }

  function tryFrac(groupSize) {
    // common denominators: 2,3,4,6,8,12
    const base = [6, 8, 12][randInt(0, 2)];
    const dens = [2, 3, 4, 6, 8, 12].filter(x => base % x === 0);
    const d1 = dens[randInt(0, dens.length - 1)];
    const d2 = dens[randInt(0, dens.length - 1)];
    const n1 = randInt(1, d1 - 1);
    const n2 = randInt(1, d2 - 1);
    const f1 = simplifyFrac(n1, d1);
    const f2 = simplifyFrac(n2, d2);
    const sum = fracAdd(f1, f2);
    if (sum.n >= sum.d * 2) return null; // keep reasonable
    if (fracEqual(sum, f1) || fracEqual(sum, f2) || fracEqual(f1, f2)) return null;

    const fracs = [f1, f2, sum];
    const keys = new Set(fracs.map(fracKey));

    let guard = 0;
    while (fracs.length < groupSize) {
      if (++guard > 400) return null;
      const d = dens[randInt(0, dens.length - 1)];
      const n = randInt(1, d);
      const f = simplifyFrac(n, d);
      if (keys.has(fracKey(f))) continue;
      const trial = fracs.concat([f]);
      const answers = findFracSumAnswers(trial);
      if (answers.length > 1) continue;
      fracs.push(f);
      keys.add(fracKey(f));
    }

    const answers = findFracSumAnswers(fracs);
    if (answers.length !== 1) return null;
    if (!fracEqual(answers[0].value, sum)) return null;

    const display = shuffle(fracs.map(fracToString));
    return {
      mode: 'frac',
      op: 'sum',
      numbers: display,
      answer: fracToString(sum),
      answerFrac: sum,
      equation: fracToString(f1) + ' + ' + fracToString(f2) + ' = ' + fracToString(sum),
      parts: [fracToString(f1), fracToString(f2)],
      commonDen: base,
      groupSize: groupSize,
      isFraction: true
    };
  }

  function randInt(lo, hi) {
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }

  /** Verify a puzzle has exactly one valid answer */
  function validatePuzzle(p) {
    if (!p || !p.numbers || p.numbers.length < 3) return false;
    if (p.isFraction) {
      const fracs = p.numbers.map(s => {
        const parts = String(s).split('/');
        if (parts.length === 1) return { n: +parts[0], d: 1 };
        return simplifyFrac(+parts[0], +parts[1]);
      });
      const ans = findFracSumAnswers(fracs);
      return ans.length === 1 && fracToString(ans[0].value) === String(p.answer);
    }
    const nums = p.numbers.map(Number);
    if (p.op === 'product') {
      const ans = findProductAnswers(nums);
      return ans.length === 1 && ans[0].value === p.answer;
    }
    const ans = findSumAnswers(nums);
    return ans.length === 1 && ans[0].value === p.answer;
  }

  /** Puzzle-in-a-puzzle: N mini puzzles, then final from their answers */
  function generateMetaPuzzle(mode, miniCount, groupSize) {
    miniCount = miniCount || 5;
    groupSize = groupSize || 5;
    const maxOuter = 400;
    for (let outer = 0; outer < maxOuter; outer++) {
      const minis = [];
      const answers = [];
      let ok = true;
      for (let i = 0; i < miniCount; i++) {
        const p = generateKakooma(mode, groupSize, 80);
        if (!p || !validatePuzzle(p)) { ok = false; break; }
        minis.push(p);
        answers.push(p.answer);
      }
      if (!ok) continue;
      // For times modes, final puzzle uses addition of the products (per Tang docs)
      let final;
      if (mode.indexOf('times') === 0) {
        // build addition puzzle whose numbers ARE the answers — need exactly one sum relation
        const ansNums = answers.map(Number);
        if (new Set(ansNums).size !== ansNums.length) continue;
        const sumAns = findSumAnswers(ansNums);
        if (sumAns.length !== 1) continue;
        final = {
          mode: 'add-from-times',
          op: 'sum',
          numbers: shuffle(ansNums),
          answer: sumAns[0].value,
          equation: sumAns[0].eq,
          parts: [ansNums[sumAns[0].i], ansNums[sumAns[0].j]],
          groupSize: miniCount
        };
      } else if (mode === 'frac') {
        const fracs = answers.map(s => {
          const parts = String(s).split('/');
          if (parts.length === 1) return { n: +parts[0], d: 1 };
          return simplifyFrac(+parts[0], +parts[1]);
        });
        if (new Set(fracs.map(fracKey)).size !== fracs.length) continue;
        const sumAns = findFracSumAnswers(fracs);
        if (sumAns.length !== 1) continue;
        final = {
          mode: 'frac',
          op: 'sum',
          numbers: shuffle(fracs.map(fracToString)),
          answer: fracToString(sumAns[0].value),
          equation: sumAns[0].eq,
          parts: [fracToString(fracs[sumAns[0].i]), fracToString(fracs[sumAns[0].j])],
          commonDen: 24,
          groupSize: miniCount,
          isFraction: true
        };
      } else {
        const ansNums = answers.map(Number);
        if (new Set(ansNums).size !== ansNums.length) continue;
        const sumAns = findSumAnswers(ansNums);
        if (sumAns.length !== 1) continue;
        final = {
          mode: mode,
          op: 'sum',
          numbers: shuffle(ansNums),
          answer: sumAns[0].value,
          equation: sumAns[0].eq,
          parts: [ansNums[sumAns[0].i], ansNums[sumAns[0].j]],
          groupSize: miniCount
        };
      }
      return { minis, final, mode, miniCount, groupSize };
    }
    return null;
  }

  // --- See the Groups (Grapes-of-Math-style visual grouping) ---
  // Returns dots in a 0..100 x 0..H coordinate space, each with group index g.
  function generatePattern(level) {
    level = Math.max(0, Math.min(3, level | 0));
    const kinds = ['rows', 'tenframes', 'pairs10', 'missing', 'diagonal', 'equal'];
    const kind = kinds[randInt(0, kinds.length - 1)];
    const big = level >= 2;
    let dots = [], gaps = [], total, explain, hint1, hint2, H = 70;

    if (kind === 'rows') {
      const R = randInt(3, big ? 6 : 4), C = randInt(4, big ? 9 : 6);
      const sx = 90 / C, sy = Math.min(14, 60 / R);
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
        dots.push({ x: 5 + sx * (c + 0.5), y: 5 + sy * (r + 0.5), g: r });
      H = 10 + sy * R;
      total = R * C;
      explain = R + ' rows of ' + C + ': ' + R + ' × ' + C + ' = ' + total;
      hint1 = 'Do you see equal rows? How many rows are there, and how many dots in each?';
      hint2 = 'There are ' + R + ' rows. How many dots are in one row? Now multiply.';
    } else if (kind === 'tenframes') {
      const k = randInt(1, big ? 5 : 3), extra = randInt(1, 9);
      const frames = k + 1, perRow = Math.min(frames, 3);
      const fw = 90 / perRow, cell = Math.min(fw / 5.6, 7);
      for (let f = 0; f < frames; f++) {
        const fx = 5 + (f % perRow) * fw, fy = 5 + Math.floor(f / perRow) * (cell * 2 + 8);
        const n = f < k ? 10 : extra;
        for (let i = 0; i < 10; i++) {
          const x = fx + cell * (i % 5 + 0.5), y = fy + cell * (Math.floor(i / 5) + 0.5);
          if (i < n) dots.push({ x, y, g: f }); else gaps.push({ x, y });
        }
      }
      H = 10 + Math.ceil(frames / perRow) * (cell * 2 + 8);
      total = k * 10 + extra;
      explain = k + ' full tens = ' + (k * 10) + ', plus ' + extra + ' more = ' + total;
      hint1 = 'Each frame holds 10 when it’s full. How many frames are full?';
      hint2 = 'There are ' + k + ' full frames, so ' + (k * 10) + '. How many dots are in the last frame?';
    } else if (kind === 'pairs10') {
      const n = randInt(2, big ? 5 : 3);
      const bunches = [];
      for (let i = 0; i < n; i++) { const a = randInt(1, 9); bunches.push({ size: a, g: i }, { size: 10 - a, g: i }); }
      const order = shuffle(bunches);
      const cols = Math.min(order.length, 4), rows = Math.ceil(order.length / cols);
      const cw = 90 / cols, ch = 26;
      order.forEach((b, idx) => {
        const cx = 5 + cw * (idx % cols + 0.5), cy = 5 + ch * (Math.floor(idx / cols) + 0.5);
        clusterPositions(b.size, cx, cy, 4.2).forEach(pt => dots.push({ x: pt.x, y: pt.y, g: b.g }));
      });
      H = 10 + ch * rows;
      total = n * 10;
      explain = 'The bunches pair up to make 10. ' + n + ' pairs × 10 = ' + total;
      hint1 = 'Can you find two bunches that make 10 together?';
      hint2 = 'Every bunch has a partner that makes 10. How many pairs are there?';
    } else if (kind === 'missing') {
      const R = randInt(4, big ? 6 : 5), C = randInt(4, big ? 8 : 6), m = randInt(2, big ? 6 : 4);
      const missIdx = new Set();
      while (missIdx.size < m) missIdx.add(randInt(0, R * C - 1));
      const sx = 90 / C, sy = Math.min(12, 60 / R);
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const pt = { x: 5 + sx * (c + 0.5), y: 5 + sy * (r + 0.5) };
        if (missIdx.has(r * C + c)) gaps.push(pt); else dots.push(Object.assign(pt, { g: r }));
      }
      H = 10 + sy * R;
      total = R * C - m;
      explain = 'Full block: ' + R + ' × ' + C + ' = ' + (R * C) + ', minus ' + m + ' gaps = ' + total;
      hint1 = 'What if the empty spots were filled in? How many would the full block have?';
      hint2 = 'The full block is ' + R + ' × ' + C + ' = ' + (R * C) + '. How many spots are empty?';
    } else if (kind === 'diagonal') {
      const n = randInt(3, big ? 7 : 5);
      const s = Math.min(80 / (2 * n - 1), 9);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
        dots.push({ x: 50 + (i - j) * s, y: 6 + (i + j) * s, g: i });
      H = 12 + (2 * n - 2) * s;
      total = n * n;
      explain = 'Tilt your head: ' + n + ' slanted lines of ' + n + '. ' + n + ' × ' + n + ' = ' + total;
      hint1 = 'Rows look uneven… Try looking along a slant. Do the dots line up in equal lines?';
      hint2 = 'Along the slant there are ' + n + ' lines. How many dots in each line?';
    } else {
      const k = randInt(3, big ? 7 : 5), m = randInt(3, big ? 9 : 6);
      const cols = Math.min(k, 4), rows = Math.ceil(k / cols), cw = 90 / cols, ch = 24;
      for (let gI = 0; gI < k; gI++) {
        const cx = 5 + cw * (gI % cols + 0.5), cy = 5 + ch * (Math.floor(gI / cols) + 0.5);
        dicePositions(m, cx, cy, 4.5).forEach(pt => dots.push({ x: pt.x, y: pt.y, g: gI }));
      }
      H = 10 + ch * rows;
      total = k * m;
      explain = k + ' equal groups of ' + m + ': ' + k + ' × ' + m + ' = ' + total;
      hint1 = 'Are all the groups the same size? How many groups are there?';
      hint2 = 'There are ' + k + ' groups. How many dots in one group? Now multiply.';
    }
    const strategies = {
      rows: 'Equal rows, then multiply',
      tenframes: 'Full tens, plus the extra',
      pairs10: 'Pairs that make 10',
      missing: 'Full block, minus the gaps',
      diagonal: 'Equal slanted lines',
      equal: 'Equal groups, then multiply'
    };
    const others = shuffle(Object.keys(strategies).filter(x => x !== kind)).slice(0, 1);
    const strategyChoices = shuffle([kind].concat(others).map(id => ({ id, label: strategies[id] })))
      .concat([{ id: 'count', label: 'I counted one by one' }]);
    return {
      kind, total, dots, gaps, H, explain, hint1, hint2,
      strategyLabel: strategies[kind], strategyChoices,
      choices: shuffle(uniqueNearChoices(total, 4))
    };
  }

  function clusterPositions(n, cx, cy, r) {
    const pts = [];
    if (n === 1) return [{ x: cx, y: cy }];
    // concentric rings
    let placed = 0, ring = 0;
    while (placed < n) {
      if (ring === 0) { pts.push({ x: cx, y: cy }); placed++; ring++; continue; }
      const cap = 6 * ring;
      const here = Math.min(cap, n - placed);
      for (let i = 0; i < here; i++) {
        const a = (2 * Math.PI * i) / here + ring * 0.4;
        pts.push({ x: cx + Math.cos(a) * r * ring, y: cy + Math.sin(a) * r * ring });
      }
      placed += here; ring++;
    }
    return pts;
  }

  function dicePositions(n, cx, cy, s) {
    const L = {
      1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
      4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
      6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
      7: [[-1, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [1, 1]],
      8: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
      9: [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
    }[n];
    return L.map(([dx, dy]) => ({ x: cx + dx * s, y: cy + dy * s }));
  }

  function uniqueNearChoices(correct, count) {
    const set = new Set([correct]);
    let guard = 0;
    while (set.size < count && guard++ < 200) {
      const spread = Math.max(3, Math.round(correct * 0.15));
      const d = correct + randInt(-spread, spread);
      if (d > 0 && d !== correct) set.add(d);
    }
    let k = 1;
    while (set.size < count) set.add(correct + k++);
    return [...set];
  }

  // --- Make a Ten (friendly numbers) ---
  const MAKE_TEN_LEVELS = 5;
  function generateMakeTen(level) {
    level = Math.max(0, Math.min(MAKE_TEN_LEVELS - 1, level | 0));
    for (let guard = 0; guard < 200; guard++) {
      if (level === 0) {
        const a = randInt(6, 9), b = randInt(3, 9), need = 10 - a, rest = b - need;
        if (rest <= 0) continue;
        return {
          level, a, b, prompt: a + ' + ' + b, answer: a + b,
          idea: 'Finish a 10 first, then add what’s left.',
          hint1: 'Which two numbers make a ten? How much does ' + a + ' need to reach 10?',
          hint2: a + ' needs ' + need + '. Split ' + b + ' into ' + need + ' and ' + rest + '. So 10 + ' + rest + ' = ?',
          explain: a + ' + ' + b + ' = ' + a + ' + ' + need + ' + ' + rest + ' = 10 + ' + rest + ' = ' + (a + b)
        };
      }
      if (level === 1) {
        const top = randInt(11, 18), sub = randInt(3, 9), toTen = top - 10, rest = sub - toTen;
        if (rest <= 0) continue;
        return {
          level, prompt: top + ' − ' + sub, answer: top - sub,
          idea: 'Subtract down to 10 first, then take away the rest.',
          hint1: 'How much do you take from ' + top + ' to land exactly on 10?',
          hint2: top + ' − ' + toTen + ' = 10. You still need to take away ' + rest + ' more. 10 − ' + rest + ' = ?',
          explain: top + ' − ' + sub + ' = ' + top + ' − ' + toTen + ' − ' + rest + ' = 10 − ' + rest + ' = ' + (top - sub)
        };
      }
      if (level === 2) {
        const a = randInt(21, 79), b = randInt(21, 79), toNext = (10 - (a % 10)) % 10;
        if (toNext === 0 || toNext > 4 || b - toNext <= 0) continue;
        const f = a + toNext, o = b - toNext;
        return {
          level, prompt: a + ' + ' + b, answer: a + b,
          idea: 'Slide a little from one number to the other so one becomes a round ten.',
          hint1: 'How close is ' + a + ' to a round ten? How much would it need?',
          hint2: 'Move ' + toNext + ' from ' + b + ' over to ' + a + '. Now it’s ' + f + ' + ' + o + '.',
          explain: a + ' + ' + b + ' = ' + f + ' + ' + o + ' = ' + (a + b) + ' (same total, easier numbers)'
        };
      }
      if (level === 3) {
        const a = randInt(12, 88);
        if (a % 10 === 0) continue;
        const up = 10 - (a % 10), nextTen = a + up;
        return {
          level, prompt: a + ' + ? = 100', answer: 100 - a,
          idea: 'Make 100 in two hops: first up to the next ten, then up to 100.',
          hint1: 'What’s the next round ten after ' + a + '? How far is it?',
          hint2: a + ' + ' + up + ' = ' + nextTen + '. How far is ' + nextTen + ' from 100?',
          explain: a + ' + ' + up + ' = ' + nextTen + ', then ' + nextTen + ' + ' + (100 - nextTen) + ' = 100. So ' + up + ' + ' + (100 - nextTen) + ' = ' + (100 - a)
        };
      }
      // level 4: make 10s to subtract (2-digit)
      const top = randInt(41, 98), sub = randInt(13, top - 5);
      const down = top % 10;
      if (down === 0 || down >= sub) continue;
      if ((sub % 10) <= down) continue; // only cases where regrouping would be needed
      const tenT = top - down, rest = sub - down;
      return {
        level, prompt: top + ' − ' + sub, answer: top - sub,
        idea: 'Subtract down to a round ten first, then subtract the rest from the friendly number.',
        hint1: 'How much do you subtract from ' + top + ' to land on a round ten?',
        hint2: top + ' − ' + down + ' = ' + tenT + '. You still need to subtract ' + rest + '. ' + tenT + ' − ' + rest + ' = ?',
        explain: top + ' − ' + sub + ' = ' + top + ' − ' + down + ' − ' + rest + ' = ' + tenT + ' − ' + rest + ' = ' + (top - sub)
      };
    }
    return { level: 0, prompt: '8 + 5', answer: 13, idea: '', hint1: 'How much does 8 need to make 10?', hint2: '8 + 2 = 10, then 3 more.', explain: '8 + 5 = 8 + 2 + 3 = 13' };
  }

  // --- Break It Apart (partial products / number bonds for multiplying) ---
  const BREAK_LEVELS = 4;
  function generateBreakApart(level) {
    level = Math.max(0, Math.min(BREAK_LEVELS - 1, level | 0));
    let a, b, good, bad, explain, hint1, hint2, idea, prompt;
    if (level === 0) {
      a = randInt(6, 9); b = randInt(3, 9);
      const r = a - 5;
      prompt = a + ' × ' + b;
      idea = 'Hard facts are easy facts glued together. ' + a + ' = 5 + ' + r + '.';
      good = '5×' + b + ' + ' + r + '×' + b;
      bad = ['5×' + b + ' + ' + (r + 1) + '×' + b, '5×' + b + ' + ' + r + '×' + (b + 1)];
      explain = a + ' × ' + b + ' = 5×' + b + ' + ' + r + '×' + b + ' = ' + (5 * b) + ' + ' + (r * b) + ' = ' + (a * b);
      hint1 = 'What is 5×' + b + '? And what is ' + r + '×' + b + '?';
      hint2 = '5×' + b + ' = ' + (5 * b) + '. Now add ' + r + '×' + b + ' = ' + (r * b) + '.';
    } else if (level === 1) {
      a = randInt(11, 12); b = randInt(4, 9);
      const r = a - 10;
      prompt = a + ' × ' + b;
      idea = 'Tens are easy! ' + a + ' = 10 + ' + r + '.';
      good = '10×' + b + ' + ' + r + '×' + b;
      bad = ['10×' + b + ' + ' + (r + 1) + '×' + b, '10×' + (b + 1) + ' + ' + r + '×' + b];
      explain = a + ' × ' + b + ' = 10×' + b + ' + ' + r + '×' + b + ' = ' + (10 * b) + ' + ' + (r * b) + ' = ' + (a * b);
      hint1 = 'What is 10×' + b + '? What is ' + r + '×' + b + '?';
      hint2 = '10×' + b + ' = ' + (10 * b) + '. Add ' + r + '×' + b + ' = ' + (r * b) + '.';
    } else if (level === 2) {
      a = 9; b = randInt(4, 12);
      prompt = '9 × ' + b;
      idea = 'Subtract to add: 9 groups is 10 groups minus 1 group.';
      good = '10×' + b + ' − 1×' + b;
      bad = ['10×' + b + ' − 9', '10×' + b + ' + 1×' + b];
      explain = '9 × ' + b + ' = 10×' + b + ' − ' + b + ' = ' + (10 * b) + ' − ' + b + ' = ' + (9 * b);
      hint1 = 'What is 10×' + b + '? Is 9 groups more or less than that?';
      hint2 = '10×' + b + ' = ' + (10 * b) + '. Take away one group of ' + b + '.';
    } else {
      const t = randInt(2, 9) * 10, o = randInt(1, 9);
      a = t + o; b = randInt(3, 9);
      prompt = a + ' × ' + b;
      idea = 'Break the big number into tens and ones, multiply each part, then add.';
      good = t + '×' + b + ' + ' + o + '×' + b;
      bad = [t + '×' + b + ' + ' + o, t + ' + ' + o + '×' + b];
      explain = a + ' × ' + b + ' = ' + t + '×' + b + ' + ' + o + '×' + b + ' = ' + (t * b) + ' + ' + (o * b) + ' = ' + (a * b);
      hint1 = 'What is ' + t + '×' + b + '? (Think ' + (t / 10) + '×' + b + ', then add a zero.)';
      hint2 = t + '×' + b + ' = ' + (t * b) + '. Now add ' + o + '×' + b + ' = ' + (o * b) + '.';
    }
    return {
      level, prompt, answer: a * b, idea, explain, hint1, hint2,
      splitGood: good,
      splitChoices: shuffle([{ text: good, ok: true }].concat(bad.map(x => ({ text: x, ok: false }))))
    };
  }


  // --- Foundations path (Kate) ---
  const PATH_SKILLS = [
    { id: 'see', title: 'See It', blurb: 'See how many without counting one by one' },
    { id: 'bonds', title: 'Bonds to 10', blurb: 'Partners that make 10' },
    { id: 'make10', title: 'Make a Ten', blurb: 'Add by finishing a 10 first' },
    { id: 'thinkAdd', title: 'Think Addition', blurb: 'Subtract by thinking of the missing part' },
    { id: 'chunks', title: 'Chunks to 100', blurb: 'Add and subtract with friendly tens' },
    { id: 'mult', title: '× Strategies', blurb: 'Build facts from ones you know' },
    { id: 'div', title: '÷ Think ×', blurb: 'Division is a multiplication you already know' }
  ];

  function generateSeeIt(level) {
    level = Math.max(0, Math.min(3, level | 0));
    const kinds = level === 0 ? ['five', 'dice'] : level === 1 ? ['ten', 'five', 'dice'] : ['ten', 'doubleten', 'rows'];
    const kind = kinds[randInt(0, kinds.length - 1)];
    let total, dots = [], gaps = [], H = 70, hint1, hint2, explain, frameNote;
    if (kind === 'five') {
      total = randInt(1, 5);
      for (let i = 0; i < 5; i++) {
        const pt = { x: 22 + i * 14, y: 14 };
        if (i < total) dots.push(Object.assign({}, pt, { g: 0 })); else gaps.push(pt);
      }
      frameNote = 'five'; H = 28;
      explain = total + ' on a five-frame — see the pattern, no need to count each one.';
      hint1 = 'Is the frame full, almost full, or just a few?';
      hint2 = 'A full five-frame is 5. How many filled spots?';
    } else if (kind === 'ten') {
      total = randInt(1, 10);
      for (let i = 0; i < 10; i++) {
        const pt = { x: 20 + (i % 5) * 15, y: 12 + Math.floor(i / 5) * 15 };
        if (i < total) dots.push(Object.assign({}, pt, { g: Math.floor(i / 5) })); else gaps.push(pt);
      }
      frameNote = 'ten'; H = 40;
      explain = total <= 5 ? total + ' (top row).' : '5 on top + ' + (total - 5) + ' on bottom = ' + total + '.';
      hint1 = 'Look at the top row first — how many? Then the bottom.';
      hint2 = total <= 5 ? 'Only the top row has dots.' : 'Top row is full (5). How many on the bottom?';
    } else if (kind === 'doubleten') {
      const b = randInt(1, 10);
      total = 10 + b;
      for (let f = 0; f < 2; f++) {
        const n = f === 0 ? 10 : b;
        for (let i = 0; i < 10; i++) {
          const pt = { x: 10 + f * 46 + (i % 5) * 8.5, y: 10 + Math.floor(i / 5) * 8.5 };
          if (i < n) dots.push(Object.assign({}, pt, { g: f })); else gaps.push(pt);
        }
      }
      frameNote = 'double'; H = 30;
      explain = '1 full ten + ' + b + ' = ' + total;
      hint1 = 'Is one frame completely full? That frame is a 10.';
      hint2 = 'Full frame = 10. How many in the other frame?';
    } else if (kind === 'dice') {
      total = randInt(1, 9);
      dicePositions(total, 50, 22, 9).forEach(pt => dots.push(Object.assign(pt, { g: 0 })));
      frameNote = 'dice'; H = 44;
      explain = 'Dice pattern for ' + total + ' — your eyes learn the shape.';
      hint1 = 'Have you seen this pattern on a die or domino?';
      hint2 = 'Corners and center make a familiar shape. What number is it?';
    } else {
      const R = randInt(2, 4), C = randInt(3, 5);
      total = R * C;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
        dots.push({ x: 20 + c * (60 / C), y: 8 + r * 12, g: r });
      frameNote = 'rows'; H = 8 + R * 12;
      explain = R + ' rows of ' + C + ' = ' + total;
      hint1 = 'Do you see equal rows?';
      hint2 = R + ' rows. How many in each row?';
    }
    return { kind, total, dots, gaps, H, explain, hint1, hint2, frameNote,
      choices: shuffle(uniqueNearChoices(total, 4)),
      idea: 'Your eyes can see groups. Five-frames and ten-frames stick in your brain — faster than fingers!' };
  }

  function generateBonds(level) {
    level = Math.max(0, Math.min(2, level | 0));
    const total = level === 0 ? 10 : (level === 1 ? [5, 6, 7, 8, 9, 10][randInt(0, 5)] : 10);
    const a = randInt(1, total - 1);
    const answer = total - a;
    return {
      type: 'bond', total, a, answer, showFrame: true,
      prompt: a + ' + ? = ' + total,
      idea: 'A number bond is three friends that belong together. Total ' + total + ', one part ' + a + ' — what’s the other?',
      hint1: 'How far is ' + a + ' from ' + total + '?',
      hint2: total + ' − ' + a + ' = ?',
      explain: a + ' + ' + answer + ' = ' + total + '. Bond: ' + a + ', ' + answer + ', ' + total + '.',
      choices: shuffle(uniqueNearChoices(answer, 4))
    };
  }

  function generateThinkAdd(level) {
    level = Math.max(0, Math.min(2, level | 0));
    let total, sub;
    if (level === 0) { total = randInt(6, 10); sub = randInt(1, total - 1); }
    else if (level === 1) { total = randInt(11, 20); sub = randInt(2, Math.min(9, total - 1)); }
    else { total = randInt(20, 50); sub = randInt(5, Math.min(19, total - 1)); }
    const answer = total - sub;
    return {
      type: 'thinkAdd', total, sub, answer,
      prompt: total + ' − ' + sub,
      idea: 'Subtraction is a missing-part puzzle. Think: ' + sub + ' + ? = ' + total,
      hint1: 'What number goes with ' + sub + ' to make ' + total + '?',
      hint2: 'Start at ' + sub + ' and count up to ' + total + '. How many steps?',
      explain: sub + ' + ' + answer + ' = ' + total + ', so ' + total + ' − ' + sub + ' = ' + answer + '.',
      choices: shuffle(uniqueNearChoices(answer, 4))
    };
  }

  function generateChunks(level) {
    return generateMakeTen(Math.min(4, 2 + (level | 0)));
  }

  function generateMultStrat(level) {
    level = Math.max(0, Math.min(4, level | 0));
    if (level === 0) {
      const n = randInt(3, 12);
      return { level, prompt: '2 × ' + n, answer: 2 * n, idea: '×2 means double.',
        hint1: 'What is ' + n + ' + ' + n + '?', hint2: 'Double ' + n + '.',
        explain: '2 × ' + n + ' = ' + n + ' + ' + n + ' = ' + (2 * n),
        splitGood: n + ' + ' + n,
        splitChoices: shuffle([{ text: n + ' + ' + n, ok: true }, { text: n + ' + 2', ok: false }, { text: n + ' + ' + (n + 1), ok: false }]) };
    }
    if (level === 1) {
      const n = randInt(3, 12);
      return { level, prompt: '5 × ' + n, answer: 5 * n, idea: '×5 is half of ×10.',
        hint1: 'What is 10 × ' + n + '?', hint2: '10 × ' + n + ' = ' + (10 * n) + '. Half is…',
        explain: '5 × ' + n + ' = half of ' + (10 * n) + ' = ' + (5 * n),
        splitGood: '(10×' + n + ') ÷ 2',
        splitChoices: shuffle([{ text: '(10×' + n + ') ÷ 2', ok: true }, { text: '10×' + n + ' − 5', ok: false }, { text: n + ' + 5', ok: false }]) };
    }
    if (level === 2) {
      const n = randInt(2, 12);
      return { level, prompt: '10 × ' + n, answer: 10 * n, idea: '×10: write the number and add a zero.',
        hint1: 'What do you write after ' + n + ' for ×10?', hint2: 'Put a 0 on the end of ' + n + '.',
        explain: '10 × ' + n + ' = ' + (10 * n),
        splitGood: String(10 * n),
        splitChoices: shuffle([{ text: String(10 * n), ok: true }, { text: String(n) + '00', ok: false }, { text: String(n + 10), ok: false }]) };
    }
    if (level === 3) {
      const n = randInt(3, 12);
      return { level, prompt: '9 × ' + n, answer: 9 * n, idea: '×9 = ×10 minus one group.',
        hint1: 'What is 10 × ' + n + '?', hint2: 'Take away one group of ' + n + ' from ' + (10 * n) + '.',
        explain: '9 × ' + n + ' = ' + (10 * n) + ' − ' + n + ' = ' + (9 * n),
        splitGood: '10×' + n + ' − ' + n,
        splitChoices: shuffle([{ text: '10×' + n + ' − ' + n, ok: true }, { text: '10×' + n + ' + ' + n, ok: false }, { text: '10×' + n + ' − 9', ok: false }]) };
    }
    return generateBreakApart(0);
  }

  function generateDivThink(level) {
    level = Math.max(0, Math.min(2, level | 0));
    let a, b;
    if (level === 0) { b = [2, 5, 10][randInt(0, 2)]; a = randInt(2, 10); }
    else if (level === 1) { b = randInt(2, 9); a = randInt(2, 10); }
    else { b = randInt(3, 12); a = randInt(3, 12); }
    const prod = a * b;
    return {
      level, prompt: prod + ' ÷ ' + b, answer: a,
      idea: 'Division asks: ' + b + ' × ? = ' + prod,
      hint1: 'What times ' + b + ' equals ' + prod + '?',
      hint2: 'Think of your × facts for ' + b + '.',
      explain: b + ' × ' + a + ' = ' + prod + ', so ' + prod + ' ÷ ' + b + ' = ' + a + '.',
      choices: shuffle(uniqueNearChoices(a, 4))
    };
  }

  function buildFlipIt(puzzle) {
    if (!puzzle || !puzzle.parts || puzzle.parts.length < 2) return null;
    if (puzzle.isFraction) return null;
    const p1 = Number(puzzle.parts[0]), p2 = Number(puzzle.parts[1]), ans = Number(puzzle.answer);
    if (![p1, p2, ans].every(Number.isFinite)) return null;
    if (puzzle.op === 'product') {
      const divBy = Math.random() < 0.5 ? p1 : p2;
      const expect = ans / divBy;
      if (!Number.isInteger(expect)) return null;
      return {
        kind: 'div', prompt: ans + ' ÷ ' + divBy + ' = ?', answer: expect,
        explain: ans + ' ÷ ' + divBy + ' = ' + expect + '  (because ' + divBy + ' × ' + expect + ' = ' + ans + ')',
        choices: shuffle(uniqueNearChoices(expect, 4))
      };
    }
    const sub = Math.random() < 0.5 ? p1 : p2;
    const expect = ans - sub;
    return {
      kind: 'sub', prompt: ans + ' − ' + sub + ' = ?', answer: expect,
      explain: ans + ' − ' + sub + ' = ' + expect + '  (because ' + sub + ' + ' + expect + ' = ' + ans + ')',
      choices: shuffle(uniqueNearChoices(expect, 4))
    };
  }

  return {
    PATH_SKILLS,
    generateSeeIt,
    generateBonds,
    generateThinkAdd,
    generateChunks,
    generateMultStrat,
    generateDivThink,
    buildFlipIt,
    generateKakooma,
    generateMetaPuzzle,
    validatePuzzle,
    findSumAnswers,
    findProductAnswers,
    findFracSumAnswers,
    generatePattern,
    generateMakeTen,
    generateBreakApart,
    MAKE_TEN_LEVELS,
    BREAK_LEVELS,
    shuffle,
    randInt,
    fracToString,
    simplifyFrac
  };
});
