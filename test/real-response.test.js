const test = require("node:test");
const assert = require("node:assert");
const rb = require("./zdx-dashboard.json");
const { parseDashboard } = require("../src/dashboard");
const { publishStates, nextDeparture } = require("../src/states");
const { fakeClient, VIN } = require("./fixtures");

const payload = JSON.stringify({ state: { reported: { status: "success", responseBody: rb } } });

test("parses a real ZDX dashboard response", () => {
  const d = parseDashboard(payload);
  assert.equal(d.chargerPowerLevel, "REDUCTION_CHARGE_LEVEL_1");
  assert.equal(d.chargeLimitedReason, "No_Action");
  assert.equal(d.atHome, true);
  assert.equal(d.chargePowerKw, null); // empty when not charging
  assert.equal(d.lifetimeEfficiency, null); // empty on this car
  assert.equal(d.scheduledCabinTempC, 15.5);
  assert.deepEqual(d.warnings, []);
  assert.equal(d.commuteSchedule.enabled, true);
  assert.equal(d.commuteSchedule.days.length, 7);
  assert.equal(d.commuteSchedule.days[0].minutes, 300);
});

test("next departure is 5:00 AM local the next morning", () => {
  const d = parseDashboard(payload);
  const next = nextDeparture(d.commuteSchedule, d.timestamp, "America/Chicago");
  assert.equal(next.iso, "2026-11-24T11:00:00.000Z");
  assert.equal(next.targetChargeLevel, 80);
});

test("publishes the new sensors", () => {
  const c = fakeClient();
  publishStates(c, VIN, parseDashboard(payload), { ModelCode: "ZDX" });
  assert.equal(c.last("/charger_power_level/state"), "Reduction Charge Level 1");
  assert.equal(c.last("/charge_limited_reason/state"), "Not limited");
  assert.equal(c.last("/at_home/state"), "ON");
  assert.equal(c.last("/charge_power/state"), "0");
  assert.equal(c.last("/scheduled_cabin_temp/state"), "60");
  assert.equal(c.last("/warnings/state"), "0");
  assert.equal(c.last("/lifetime_efficiency/state"), undefined);
  assert.equal(JSON.parse(c.last("/next_departure/attributes")).schedule.Mon, "05:00");
});
