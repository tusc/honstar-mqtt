// Unit handling. The vehicle API reports miles, kPa and °F; when UNITS=metric
// the add-on publishes km, kPa and °C instead.
const METRIC = (process.env.UNITS || "").toLowerCase() === "metric";

const KM_PER_MI = 1.609344;

const units = {
  metric: METRIC,
  distance: METRIC ? "km" : "mi",
  pressure: METRIC ? "kPa" : "psi",
  temperature: METRIC ? "°C" : "°F",
  // Climate temperature range accepted by the API (°F 60-90)
  tempMin: METRIC ? 16 : 60,
  tempMax: METRIC ? 32 : 90,
  tempStep: METRIC ? 0.5 : 1,
};

function distance(mi) {
  const v = METRIC ? mi * KM_PER_MI : mi;
  return Math.round(v);
}

function pressure(psi, kpa) {
  if (METRIC) {
    const v = kpa != null && !isNaN(kpa) ? kpa : psi / 0.145038;
    return Math.round(v);
  }
  return Math.round(psi * 10) / 10;
}

function fToDisplay(f) {
  return METRIC ? Math.round(((f - 32) * 5) / 9 * 2) / 2 : f;
}

function displayToF(t) {
  return METRIC ? Math.round((t * 9) / 5 + 32) : Math.round(t);
}

module.exports = { units, distance, pressure, fToDisplay, displayToF, KM_PER_MI };
