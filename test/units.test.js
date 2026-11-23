const test = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");

// units.js reads UNITS at load time, so check metric in a child process
function run(env, code) {
  const r = spawnSync(process.execPath, ["-e", code], { env: { ...process.env, ...env }, cwd: __dirname + "/.." });
  assert.equal(r.status, 0, r.stderr.toString());
  return JSON.parse(r.stdout.toString());
}
const code = `const u=require('./src/units');console.log(JSON.stringify({
  d:u.distance(247), p:u.pressure(38.9,268), t:u.fToDisplay(72), back:u.displayToF(u.fToDisplay(72)),
  unit:u.units.distance, min:u.units.tempMin }))`;

test("imperial is the default", () => {
  const r = run({ UNITS: "" }, code);
  assert.deepEqual(r, { d: 247, p: 38.9, t: 72, back: 72, unit: "mi", min: 60 });
});

test("metric converts distance, pressure and temperature", () => {
  const r = run({ UNITS: "metric" }, code);
  assert.deepEqual(r, { d: 398, p: 268, t: 22, back: 72, unit: "km", min: 16 });
});
