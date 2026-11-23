const { log, debug } = require("./config");

const TIRE_POSITIONS = {
  frontLeft:  { slug: "tire_pressure_lf", name: "Tire Pressure: Left Front", placard: "placardFront" },
  frontRight: { slug: "tire_pressure_rf", name: "Tire Pressure: Right Front", placard: "placardFront" },
  rearLeft:   { slug: "tire_pressure_lr", name: "Tire Pressure: Left Rear", placard: "placardRear" },
  rearRight:  { slug: "tire_pressure_rr", name: "Tire Pressure: Right Rear", placard: "placardRear" },
};

function buildDeviceInfo(vin, vehicle) {
  return {
    identifiers: [vin],
    manufacturer: vehicle?.DivisionName || "Honda/Acura",
    model: [vehicle?.ModelYear, vehicle?.DivisionName, vehicle?.ModelCode]
      .filter(Boolean)
      .join(" "),
    name: [vehicle?.ModelYear, vehicle?.DivisionName, vehicle?.ModelCode]
      .filter(Boolean)
      .join(" "),
  };
}

// Entities that stay available when vehicle data is stale (controls + diagnostics)
const ALWAYS_AVAILABLE = new Set([
  "ev_target_charge_level",
  "ev_climate",
  "ev_climate_temperature",
  "door_lock",
  "stop_charging",
  "start_charging",
  "refresh",
  "locate",
  "location",
  "last_updated",
  "connected",
]);

function publishDiscovery(brokerClient, vin, vehicle) {
  const device = buildDeviceInfo(vin, vehicle);
  const availTopic = `honstar-mqtt/${vin}/available`;
  const dataAvailTopic = `honstar-mqtt/${vin}/data_available`;
  const opts = { retain: true, qos: 1 };

  function pub(component, slug, config) {
    const topic = `homeassistant/${component}/${vin}/${slug}/config`;
    const availability = [
      { topic: availTopic, payload_available: "true", payload_not_available: "false" },
    ];
    if (!ALWAYS_AVAILABLE.has(slug)) {
      // Vehicle data goes unavailable after repeated failed polls
      availability.push({
        topic: dataAvailTopic,
        payload_available: "true",
        payload_not_available: "false",
      });
    }
    const payload = JSON.stringify({
      ...config,
      unique_id: `${vin}-${slug}`,
      availability,
      availability_mode: "all",
      device,
    });
    brokerClient.publish(topic, payload, opts);
    debug(`Discovery: ${topic}`);
  }

  // ── Sensors ──

  pub("sensor", "ev_battery_level", {
    name: "Battery Level",
    device_class: "battery",
    state_class: "measurement",
    unit_of_measurement: "%",
    icon: "mdi:battery-high",
    force_update: true,
    state_topic: `honstar-mqtt/${vin}/ev_battery_level/state`,
  });

  pub("sensor", "ev_range", {
    name: "Range",
    device_class: "distance",
    state_class: "measurement",
    unit_of_measurement: "mi",
    icon: "mdi:ev-station",
    force_update: true,
    state_topic: `honstar-mqtt/${vin}/ev_range/state`,
  });

  pub("sensor", "odometer", {
    name: "Odometer",
    device_class: "distance",
    state_class: "total_increasing",
    unit_of_measurement: "mi",
    icon: "mdi:counter",
    force_update: true,
    state_topic: `honstar-mqtt/${vin}/odometer/state`,
  });

  // Remove old sensor entity (was changed to number)
  brokerClient.publish(
    `homeassistant/sensor/${vin}/ev_target_charge_level/config`,
    "",
    opts
  );

  // Target Charge Level (settable number entity)
  pub("number", "ev_target_charge_level", {
    name: "Target Charge Level",
    icon: "mdi:battery-charging-high",
    state_topic: `honstar-mqtt/${vin}/ev_target_charge_level/state`,
    command_topic: `honstar-mqtt/${vin}/ev_target_charge_level/set`,
    min: 50,
    max: 100,
    step: 5,
    unit_of_measurement: "%",
    mode: "slider",
  });

  // Climate preconditioning switch
  pub("switch", "ev_climate", {
    name: "Climate Preconditioning",
    icon: "mdi:air-conditioner",
    state_topic: `honstar-mqtt/${vin}/ev_climate/state`,
    command_topic: `honstar-mqtt/${vin}/ev_climate/set`,
  });

  // Climate preconditioning temperature
  pub("number", "ev_climate_temperature", {
    name: "Climate Temperature",
    device_class: "temperature",
    icon: "mdi:thermometer",
    state_topic: `honstar-mqtt/${vin}/ev_climate_temperature/state`,
    command_topic: `honstar-mqtt/${vin}/ev_climate_temperature/set`,
    min: 60,
    max: 90,
    step: 1,
    unit_of_measurement: "°F",
    mode: "slider",
  });

  // Door lock
  pub("lock", "door_lock", {
    name: "Door Lock",
    icon: "mdi:car-door-lock",
    state_topic: `honstar-mqtt/${vin}/door_lock/state`,
    command_topic: `honstar-mqtt/${vin}/door_lock/set`,
    state_locked: "LOCKED",
    state_unlocked: "UNLOCKED",
    state_locking: "LOCKING",
    state_unlocking: "UNLOCKING",
    payload_lock: "LOCK",
    payload_unlock: "UNLOCK",
    // The API can't read the lock state; this reflects the last command sent
    json_attributes_topic: `honstar-mqtt/${vin}/door_lock/attributes`,
  });

  // Stop charging button
  pub("button", "stop_charging", {
    name: "Stop Charging",
    icon: "mdi:ev-plug-type1",
    command_topic: `honstar-mqtt/${vin}/stop_charging/set`,
    payload_press: "PRESS",
  });

  // Start charging button (experimental)
  pub("button", "start_charging", {
    name: "Start Charging",
    icon: "mdi:ev-station",
    command_topic: `honstar-mqtt/${vin}/start_charging/set`,
    payload_press: "PRESS",
  });

  // Refresh (poll now) button
  pub("button", "refresh", {
    name: "Refresh Now",
    icon: "mdi:refresh",
    command_topic: `honstar-mqtt/${vin}/refresh/set`,
    payload_press: "PRESS",
  });

  // Locate vehicle button
  pub("button", "locate", {
    name: "Locate Vehicle",
    icon: "mdi:crosshairs-gps",
    command_topic: `honstar-mqtt/${vin}/locate/set`,
    payload_press: "PRESS",
  });

  // Remove old location sensor entities (replaced by device_tracker)
  brokerClient.publish(`homeassistant/sensor/${vin}/location_latitude/config`, "", opts);
  brokerClient.publish(`homeassistant/sensor/${vin}/location_longitude/config`, "", opts);
  brokerClient.publish(`homeassistant/sensor/${vin}/location_timestamp/config`, "", opts);

  // Vehicle location (device tracker)
  pub("device_tracker", "location", {
    name: "Location",
    icon: "mdi:car-connected",
    json_attributes_topic: `honstar-mqtt/${vin}/location/state`,
    source_type: "gps",
  });

  // Tire pressures (4 sensors)
  for (const [, tp] of Object.entries(TIRE_POSITIONS)) {
    pub("sensor", tp.slug, {
      name: tp.name,
      device_class: "pressure",
      state_class: "measurement",
      unit_of_measurement: "psi",
      icon: "mdi:car-tire-alert",
      force_update: true,
      state_topic: `honstar-mqtt/${vin}/tire_pressure/state`,
      value_template: `{{ value_json.${tp.slug} | round(1) }}`,
      json_attributes_topic: `honstar-mqtt/${vin}/tire_pressure/state`,
      json_attributes_template: `{{ {'warning': value_json.${tp.slug}_warning, 'recommendation': value_json.${tp.slug}_placard} | tojson }}`,
    });
  }

  // ── Binary Sensors ──

  pub("binary_sensor", "ev_charge_state", {
    name: "Charge State",
    device_class: "battery_charging",
    icon: "mdi:battery-charging",
    payload_on: "ON",
    payload_off: "OFF",
    state_topic: `honstar-mqtt/${vin}/ev_charge_state/state`,
  });

  pub("binary_sensor", "ev_plug_state", {
    name: "Plug State",
    device_class: "plug",
    icon: "mdi:ev-plug-type1",
    payload_on: "ON",
    payload_off: "OFF",
    state_topic: `honstar-mqtt/${vin}/ev_plug_state/state`,
  });

  pub("sensor", "ev_charge_complete_time", {
    name: "Estimated Charge Completion",
    device_class: "timestamp",
    icon: "mdi:battery-clock-outline",
    state_topic: `honstar-mqtt/${vin}/ev_charge_complete_time/state`,
  });

  pub("sensor", "ev_charge_rate", {
    name: "Estimated Charge Rate",
    state_class: "measurement",
    unit_of_measurement: "kW",
    icon: "mdi:flash",
    state_topic: `honstar-mqtt/${vin}/ev_charge_rate/state`,
  });

  pub("sensor", "ev_charge_mode", {
    name: "Charge Mode",
    icon: "mdi:calendar-clock",
    state_topic: `honstar-mqtt/${vin}/ev_charge_mode/state`,
  });

  pub("sensor", "ev_range_at_target", {
    name: "Range at Target Charge",
    device_class: "distance",
    state_class: "measurement",
    unit_of_measurement: "mi",
    icon: "mdi:map-marker-distance",
    state_topic: `honstar-mqtt/${vin}/ev_range_at_target/state`,
  });

  // ── Diagnostics ──

  pub("sensor", "last_updated", {
    name: "Last Updated",
    device_class: "timestamp",
    entity_category: "diagnostic",
    icon: "mdi:update",
    state_topic: `honstar-mqtt/${vin}/last_updated/state`,
  });

  pub("binary_sensor", "connected", {
    name: "Vehicle Connected",
    device_class: "connectivity",
    entity_category: "diagnostic",
    payload_on: "ON",
    payload_off: "OFF",
    state_topic: `honstar-mqtt/${vin}/connected/state`,
  });

  log("Published HA MQTT discovery configs");
}

module.exports = { publishDiscovery };
