const mqtt = require("mqtt");
const { log, debug } = require("./config");

function connectBroker(mqttUrl, vin) {
  return new Promise((resolve, reject) => {
    log(`Connecting to MQTT broker...`);
    debug(`Broker URL: ${mqttUrl.replace(/\/\/.*@/, "//***@")}`);

    const client = mqtt.connect(mqttUrl, {
      clientId: `honstar-mqtt-${Date.now()}`,
      clean: true,
      keepalive: 60,
      reconnectPeriod: 5000,
      // Last Will: if the connection drops without a clean shutdown, the broker
      // marks the entities unavailable so HA reflects reality.
      ...(vin && {
        will: {
          topic: `honstar-mqtt/${vin}/available`,
          payload: "false",
          retain: true,
          qos: 1,
        },
      }),
    });

    let initialConnect = true;

    client.on("connect", () => {
      if (initialConnect) {
        initialConnect = false;
        log("Connected to MQTT broker");
        resolve(client);
      } else {
        log("Reconnected to MQTT broker");
      }
    });

    client.on("reconnect", () => {
      log("Reconnecting to MQTT broker...");
    });

    client.on("error", (err) => {
      log(`MQTT broker error: ${err.message}`);
    });

    client.on("offline", () => {
      log("MQTT broker connection offline");
    });

    // Timeout initial connection after 30 seconds
    setTimeout(() => {
      if (!client.connected) {
        client.end(true);
        reject(new Error("MQTT broker connection timed out after 30s"));
      }
    }, 30000);
  });
}

function publishData(brokerClient, vin, dashboard) {
  const topic = `honstar-mqtt/${vin}/data`;
  const payload = JSON.stringify(dashboard);
  brokerClient.publish(topic, payload, { retain: true, qos: 1 }, (err) => {
    if (err) {
      log(`Failed to publish to ${topic}: ${err.message}`);
    } else {
      log(`Published dashboard data to ${topic}`);
    }
  });
}

module.exports = { connectBroker, publishData };
