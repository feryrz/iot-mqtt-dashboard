const mqtt = require('mqtt');
const { db } = require('./database');

let mqttClient = null;
let io = null;

/**
 * Initialize MQTT client and connect to broker
 * @param {SocketIO.Server} socketIO - Socket.IO server instance
 */
function initializeMQTT(socketIO) {
  io = socketIO;

  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const options = {
    reconnectPeriod: 5000,
  };

  // Add authentication if provided
  if (process.env.MQTT_USERNAME) {
    options.username = process.env.MQTT_USERNAME;
  }
  if (process.env.MQTT_PASSWORD) {
    options.password = process.env.MQTT_PASSWORD;
  }

  console.log(`Connecting to MQTT broker: ${brokerUrl}`);
  mqttClient = mqtt.connect(brokerUrl, options);

  // Connection event handlers
  mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    
    // Subscribe to device data topic pattern
    mqttClient.subscribe('devices/+/data', (err) => {
      if (err) {
        console.error('Failed to subscribe to topic:', err.message);
      } else {
        console.log('Subscribed to devices/+/data');
      }
    });
  });

  mqttClient.on('error', (error) => {
    console.error('MQTT connection error:', error.message);
  });

  mqttClient.on('reconnect', () => {
    console.log('Reconnecting to MQTT broker...');
  });

  mqttClient.on('offline', () => {
    console.log('MQTT client offline');
  });

  // Handle incoming messages
  mqttClient.on('message', handleMessage);
}

/**
 * Handle incoming MQTT messages
 * @param {string} topic - MQTT topic
 * @param {Buffer} message - Message payload
 */
function handleMessage(topic, message) {
  try {
    // Extract device ID from topic (devices/{device_id}/data)
    const topicParts = topic.split('/');
    if (topicParts.length !== 3 || topicParts[0] !== 'devices' || topicParts[2] !== 'data') {
      console.warn(`Invalid topic format: ${topic}`);
      return;
    }

    const deviceId = topicParts[1];
    const payload = JSON.parse(message.toString());

    // Validate required fields (allow zero values but not null/undefined)
    if (payload.voltage === null || payload.voltage === undefined ||
        payload.current === null || payload.current === undefined ||
        payload.battery_soh === null || payload.battery_soh === undefined) {
      console.warn(`Missing required fields in message from ${deviceId}`);
      return;
    }

    const deviceName = payload.device_name || deviceId;
    const voltage = parseFloat(payload.voltage);
    const current = parseFloat(payload.current);
    const batterySoh = parseFloat(payload.battery_soh);
    const sohMeasurementTime = payload.soh_measurement_time || null;

    // Log received data
    console.log(`Received data from ${deviceId}:`, {
      voltage,
      current,
      battery_soh: batterySoh
    });

    // Insert or update device in database (UPSERT)
    db.run(
      `INSERT INTO devices (id, name, last_seen) 
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET 
         name = excluded.name,
         last_seen = CURRENT_TIMESTAMP`,
      [deviceId, deviceName],
      function(err) {
        if (err) {
          console.error('Error upserting device:', err.message);
          return;
        }

        // Insert reading into database
        db.run(
          `INSERT INTO readings (device_id, voltage, current, battery_soh, soh_measurement_time, timestamp)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [deviceId, voltage, current, batterySoh, sohMeasurementTime],
          function(err) {
            if (err) {
              console.error('Error inserting reading:', err.message);
              return;
            }

            // Emit real-time update via Socket.IO
            if (io) {
              io.emit('device-update', {
                deviceId,
                deviceName,
                data: {
                  voltage,
                  current,
                  battery_soh: batterySoh,
                  soh_measurement_time: sohMeasurementTime,
                  timestamp: new Date().toISOString()
                }
              });
            }
          }
        );
      }
    );
  } catch (error) {
    console.error('Error handling MQTT message:', error.message);
  }
}

/**
 * Close MQTT connection
 */
function closeMQTT() {
  if (mqttClient) {
    mqttClient.end();
    console.log('MQTT connection closed');
  }
}

module.exports = {
  initializeMQTT,
  closeMQTT
};
