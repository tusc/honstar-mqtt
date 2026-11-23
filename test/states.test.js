const test = require("node:test");
const assert = require("node:assert");
const { parseDashboard } = require("../src/dashboard");
const { publishStates } = require("../src/states");
const { dashboardPayload, fakeClient, VIN } = require("./fixtures");

const vehicle = { ModelCode: "ZDX" };

test("publishes imperial states", () => {
  const c = fakeClient();
  publishStates(c, VIN, parseDashboard(dashboardPayload()), vehicle);
  assert.equal(c.last("/ev_battery_level/state"), "78");
  assert.equal(c.last("/ev_range/state"), "247");
  assert.equal(c.last("/ev_range_at_target/state"), "253");
  assert.equal(c.last("/odometer/state"), "16885");
  assert.equal(c.last("/ev_charge_mode/state"), "Charge Later");
  assert.equal(c.last("/hv_battery_preconditioning/state"), "Inactive");
  assert.equal(c.last("/last_updated/state"), "2026-11-23T19:24:34.000Z");
  assert.equal(c.last("/ev_charge_complete_time/state"), "None");
  assert.equal(JSON.parse(c.last("/tire_pressure/state")).tire_pressure_lf, 38.9);
});

test("tracks energy added during a charge session", () => {
  const c = fakeClient();
  // Not charging at 50% establishes the baseline
  publishStates(c, VIN, parseDashboard(dashboardPayload({
    evStatus: { soc: 50, evRange: 160, chargeStatus: "NOT_CHARGING", plugStatus: "CONNECTED" },
  })), vehicle);
  publishStates(c, VIN, parseDashboard(dashboardPayload({
    timestamp: "2026-11-23T20:00:00.000Z",
    evStatus: { soc: 60, evRange: 190, chargeStatus: "CHARGING", plugStatus: "CONNECTED" },
  })), vehicle);
  assert.equal(c.last("/ev_charge_state/state"), "ON");
  assert.equal(c.last("/charge_energy_added/state"), "10.2"); // 10% of 102 kWh
});
