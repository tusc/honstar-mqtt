// Sample AWS IoT dashboard payload (shape taken from parseDashboard)
const VIN = "1ABCD23EFGH456789";
module.exports.VIN = VIN;
module.exports.dashboardPayload = (overrides = {}) =>
  JSON.stringify({
    state: {
      reported: {
        cigServiceRequestId: "req-1",
        status: "success",
        responseBody: {
          timestamp: "2026-11-23T19:24:34.000Z",
          evStatus: {
            soc: 78,
            evRange: 247,
            chargeStatus: "NOT_CHARGING",
            plugStatus: "UNPLUGGED",
            chargeMode: "CHARGE_LATER",
          },
          odometer: { value: 16885, unit: "MI" },
          tireStatus: {
            frontLeft: { pressureData: { value: "268" }, warningState: { value: "NORMAL" } },
            frontRight: { pressureData: { value: "272" }, warningState: { value: "NORMAL" } },
            rearLeft: { pressureData: { value: "268" }, warningState: { value: "NORMAL" } },
            rearRight: { pressureData: { value: "264" }, warningState: { value: "NORMAL" } },
            placardFront: { pressureData: { value: "290" } },
            placardRear: { pressureData: { value: "290" } },
          },
          getChargeMode: {
            chargeModeType: { value: "CHARGE_LATER" },
            generalAwayTargetChargeLevel: { value: "80" },
          },
          targetChargeLevelSettings: {
            projectedEVRangeGeneralAwayTargetChargeSet: { value: "253.4", unit: "MI" },
          },
          highVoltageBatteryPreconditioningStatus: { value: "INACTIVE" },
          ...overrides,
        },
      },
    },
  });

module.exports.fakeClient = () => {
  const out = [];
  return {
    out,
    publish: (topic, payload) => out.push([topic, String(payload)]),
    last: (suffix) => {
      for (let i = out.length - 1; i >= 0; i--) if (out[i][0].endsWith(suffix)) return out[i][1];
      return undefined;
    },
  };
};
