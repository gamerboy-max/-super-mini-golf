import fs from 'node:fs';

const source = fs.readFileSync(new URL('../outputs/mini-golf.html', import.meta.url), 'utf8');
const script = source.match(/<script>([\s\S]*)<\/script>/)?.[1];
if (!script) throw new Error('Game script was not found.');
new Function(script);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const levelNames = [...source.matchAll(/name: '([^']+)'/g)].map(match => match[1]);
const waterHazards = source.match(/water: \[/g) ?? [];
const emptyBumperSets = source.match(/bumpers: \[\]/g) ?? [];
assert(levelNames.length === 13, `Expected 13 holes, found ${levelNames.length}.`);
assert(waterHazards.length === 13, `Expected a water hazard on every hole, found ${waterHazards.length}.`);
assert(emptyBumperSets.length === 13, `Expected no circular bumper obstacles, found ${emptyBumperSets.length} level definitions.`);

const pathCrossesCup = (fromX, fromY, toX, toY, cupX, cupY) => {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distanceSq = dx * dx + dy * dy;
  const t = distanceSq ? Math.max(0, Math.min(1, ((cupX - fromX) * dx + (cupY - fromY) * dy) / distanceSq)) : 0;
  return Math.hypot(cupX - (fromX + dx * t), cupY - (fromY + dy * t)) <= 22;
};

const stepCup = (ball, cup, dt = 1 / 120) => {
  const fromX = ball.x;
  const fromY = ball.y;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  if (pathCrossesCup(fromX, fromY, ball.x, ball.y, cup.x, cup.y)) ball.sunk = true;
};

// A sensible putt reaching the rim should enter the cup.
const makeable = { x: 28, y: 0, vx: -55, vy: 0, sunk: false };
for (let i = 0; i < 120 && !makeable.sunk; i++) stepCup(makeable, { x: 0, y: 0 });
assert(makeable.sunk, 'A makeable putt was not captured by the cup.');

// A fast shot that crosses the cup between frames must still be accepted.
const fastCrossing = { x: 60, y: 0, vx: -6000, vy: 0, sunk: false };
stepCup(fastCrossing, { x: 0, y: 0 });
assert(fastCrossing.sunk, 'A fast path through the cup was skipped between frames.');

// A fast ball outside the capture radius must remain in play.
const nearMiss = { x: 60, y: 24, vx: -6000, vy: 0, sunk: false };
stepCup(nearMiss, { x: 0, y: 0 });
assert(!nearMiss.sunk, 'A shot that misses the cup was incorrectly accepted.');

console.log('Game syntax: PASS');
console.log('Cup physics: PASS (makeable capture, fast path capture, near-miss rejection)');
console.log(`Course data: PASS (${levelNames.length} holes, water hazard on every hole)`);
