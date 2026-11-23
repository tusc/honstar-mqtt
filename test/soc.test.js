const test = require("node:test");
const assert = require("node:assert");
const { correctStaleSoc } = require("../src/states");

const dash = (soc, range, projected, target, chargeStatus) => ({
  battery: { stateOfCharge: soc, range, chargeStatus },
  projectedRangeAtTarget: { value: projected },
  chargeSettings: { targetLevel: target },
});

test("does not change SOC when not charging (target just changed to 100%)", () => {
  // Real case: 73.2% reported, 230 mi, projected range still 250 mi for the old 80% target
  const d = dash(73.2, 230, 250, 100, "UNCONNECTED");
  correctStaleSoc(d);
  assert.equal(d.battery.stateOfCharge, 73.2);
});

test("ignores estimates that are far off even while charging", () => {
  const d = dash(73.2, 230, 250, 100, "CHARGING");
  correctStaleSoc(d);
  assert.equal(d.battery.stateOfCharge, 73.2);
});

test("corrects a slightly stale SOC while charging", () => {
  // 250 mi at 80% = 3.125 mi/%; 200 mi -> 64%, reported 58%
  const d = dash(58, 200, 250, 80, "CHARGING");
  correctStaleSoc(d);
  assert.equal(d.battery.stateOfCharge, 64);
});

test("never lowers SOC", () => {
  const d = dash(70, 200, 250, 80, "CHARGING");
  correctStaleSoc(d);
  assert.equal(d.battery.stateOfCharge, 70);
});
