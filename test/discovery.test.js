const test = require("node:test");
const assert = require("node:assert");
const { publishDiscovery } = require("../src/discovery");
const { fakeClient, VIN } = require("./fixtures");

test("data sensors depend on data availability, controls do not", () => {
  const c = fakeClient();
  publishDiscovery(c, VIN, { ModelYear: "2024", DivisionName: "Acura", ModelCode: "ZDX" });
  const cfg = (slug) => {
    const hit = c.out.find(([t, p]) => t.endsWith(`/${slug}/config`) && p);
    return JSON.parse(hit[1]);
  };
  assert.equal(cfg("ev_range").availability.length, 2);
  assert.equal(cfg("ev_range").device_class, "distance");
  assert.equal(cfg("refresh").availability.length, 1);
  assert.equal(cfg("last_updated").availability.length, 1);
  assert.equal(cfg("charge_energy_added").state_class, "total_increasing");
  for (const [, p] of c.out) {
    if (!p) continue;
    const j = JSON.parse(p);
    assert.ok(j.unique_id.startsWith(VIN));
    assert.equal(j.availability_mode, "all");
  }
});
