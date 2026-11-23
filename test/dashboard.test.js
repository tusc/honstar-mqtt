const test = require("node:test");
const assert = require("node:assert");
const { parseDashboard } = require("../src/dashboard");
const { dashboardPayload } = require("./fixtures");

test("parses core vehicle data", () => {
  const d = parseDashboard(dashboardPayload());
  assert.equal(d.battery.stateOfCharge, 78);
  assert.equal(d.battery.range, 247);
  assert.equal(d.odometer.value, 16885);
  assert.equal(d.chargeSettings.type, "CHARGE_LATER");
  assert.equal(d.chargeSettings.targetLevel, 80);
  assert.equal(d.projectedRangeAtTarget.value, 253.4);
  assert.equal(d.hvBatteryPreconditioning, "INACTIVE");
  assert.equal(d.tires.frontLeft.pressureKpa, 268);
  assert.equal(d.tires.frontLeft.pressurePsi, 38.9);
});

test("returns null for payloads without data", () => {
  assert.equal(parseDashboard("{}"), null);
  assert.equal(parseDashboard("not json"), null);
});
