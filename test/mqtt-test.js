require('dotenv').config();
const mqtt = require('mqtt');

// Parse command line arguments
const args = process.argv.slice(2);
const deviceId = args[0] || 'test-device-001';
const interval = parseInt(args[1]) || 60000; // Default 60 seconds

const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const topic = `devices/${deviceId}/data`;

console.log('=== MQTT Test Publisher ===');
console.log(`Broker: ${brokerUrl}`);
console.log(`Device ID: ${deviceId}`);
console.log(`Topic: ${topic}`);
console.log(`Interval: ${interval}ms`);
console.log('===========================\n');

// MQTT client options
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

// Connect to MQTT broker
const client = mqtt.connect(brokerUrl, options);

client.on('connect', () => {
  console.log('✓ Connected to MQTT broker\n');
  
  // Publish initial message
  publishData();
  
  // Set interval for periodic publishing
  setInterval(publishData, interval);
});

client.on('error', (error) => {
  console.error('✗ MQTT error:', error.message);
});

client.on('offline', () => {
  console.log('⚠ MQTT client offline');
});

client.on('reconnect', () => {
  console.log('↻ Reconnecting to MQTT broker...');
});

// Generate realistic test data
function generateTestData() {
  const voltage = (Math.random() * 5 + 10).toFixed(2); // 10-15V
  const current = (Math.random() * 3 + 1).toFixed(2); // 1-4A
  const batterySoh = (Math.random() * 15 + 85).toFixed(1); // 85-100%
  const sohMeasurementTime = new Date().toISOString();
  
  return {
    device_name: `Test Device ${deviceId}`,
    voltage: parseFloat(voltage),
    current: parseFloat(current),
    battery_soh: parseFloat(batterySoh),
    soh_measurement_time: sohMeasurementTime
  };
}

// Publish test data
function publishData() {
  const data = generateTestData();
  const payload = JSON.stringify(data);
  
  client.publish(topic, payload, { qos: 1 }, (error) => {
    if (error) {
      console.error('✗ Failed to publish:', error.message);
    } else {
      const timestamp = new Date().toLocaleString();
      console.log(`[${timestamp}] Published data:`);
      console.log(`  Voltage: ${data.voltage}V`);
      console.log(`  Current: ${data.current}A`);
      console.log(`  Battery SOH: ${data.battery_soh}%`);
      console.log('');
    }
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  client.end();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error.message);
  client.end();
  process.exit(1);
});
