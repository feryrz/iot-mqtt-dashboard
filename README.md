# 🌐 IoT MQTT Dashboard

A complete, production-ready IoT dashboard application for monitoring multiple devices via MQTT protocol. The dashboard runs locally and displays real-time data from IoT devices with a modern, responsive interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)

## ✨ Features

- **Real-time Monitoring**: Live updates via Socket.IO when new MQTT messages arrive
- **Device Management**: Automatic device discovery and registration
- **Historical Data**: Complete history with pagination (50 entries per page)
- **Data Export**: Export device data to CSV format (up to 10,000 records)
- **Status Indicators**: Visual status indicators (Active, Warning, Inactive)
- **Responsive Design**: Modern UI with gradients, animations, and mobile support
- **SQLite Database**: Persistent storage for devices and readings
- **REST API**: Full API for programmatic access
- **Multi-device Support**: Monitor multiple IoT devices simultaneously

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- **MQTT Broker** (Mosquitto recommended)

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/feryrz/iot-mqtt-dashboard.git
cd iot-mqtt-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install and setup Mosquitto MQTT broker

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

#### macOS (using Homebrew):
```bash
brew install mosquitto
brew services start mosquitto
```

#### Windows:
Download and install from [Mosquitto Downloads](https://mosquitto.org/download/)

### 4. Configure environment variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` to configure your settings:

```env
PORT=3000
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
DB_PATH=./iot_data.db
```

## 🏃 Running the Application

### Start the server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The dashboard will be available at: **http://localhost:3000**

### Test with simulated data

In a separate terminal, run the test publisher:

```bash
npm test
```

Or with custom parameters:

```bash
node test/mqtt-test.js [device_id] [interval_ms]
```

Examples:
```bash
node test/mqtt-test.js sensor-001 30000    # Publish every 30 seconds
node test/mqtt-test.js living-room 60000   # Publish every 60 seconds
```

## 📡 MQTT Data Format

### Topic Pattern
```
devices/{device_id}/data
```

### Payload (JSON)
```json
{
  "device_name": "Living Room Sensor",
  "voltage": 12.5,
  "current": 2.3,
  "battery_soh": 95.5,
  "soh_measurement_time": "2025-12-14T10:30:00Z"
}
```

### Required Fields
- `voltage` (number): Voltage in volts
- `current` (number): Current in amperes
- `battery_soh` (number): Battery State of Health (0-100%)

### Optional Fields
- `device_name` (string): Human-readable device name
- `soh_measurement_time` (string): ISO 8601 timestamp

## 🧪 Testing with Mosquitto

Publish test data manually:

```bash
mosquitto_pub -t "devices/test-sensor-001/data" -m '{
  "device_name": "Temperature Sensor",
  "voltage": 12.5,
  "current": 2.3,
  "battery_soh": 95.5,
  "soh_measurement_time": "2025-12-14T10:30:00Z"
}'
```

Subscribe to see all device data:

```bash
mosquitto_sub -t "devices/+/data" -v
```

## 📁 Project Structure

```
iot-mqtt-dashboard/
├── server.js              # Express server with Socket.IO
├── database.js            # SQLite database initialization
├── mqtt-handler.js        # MQTT client and message handling
├── package.json           # Project dependencies
├── .env.example           # Environment variables template
├── .gitignore            # Git ignore patterns
├── README.md             # This file
├── public/               # Frontend files
│   ├── index.html        # Device list dashboard
│   ├── device.html       # Device detail page
│   ├── css/
│   │   └── style.css     # Responsive styles
│   └── js/
│       ├── main.js       # Main dashboard logic
│       └── device.js     # Device detail logic
└── test/
    └── mqtt-test.js      # MQTT test publisher
```

## 🔌 API Endpoints

### GET /api/devices
List all devices ordered by last seen time.

**Response:**
```json
[
  {
    "id": "sensor-001",
    "name": "Temperature Sensor",
    "last_seen": "2025-12-14T10:30:00.000Z"
  }
]
```

### GET /api/devices/:id
Get specific device information.

**Response:**
```json
{
  "id": "sensor-001",
  "name": "Temperature Sensor",
  "last_seen": "2025-12-14T10:30:00.000Z"
}
```

### GET /api/devices/:id/latest
Get the latest reading for a device.

**Response:**
```json
{
  "id": 123,
  "device_id": "sensor-001",
  "voltage": 12.5,
  "current": 2.3,
  "battery_soh": 95.5,
  "soh_measurement_time": "2025-12-14T10:30:00Z",
  "timestamp": "2025-12-14T10:30:01.000Z"
}
```

### GET /api/devices/:id/history
Get paginated historical data for a device.

**Query Parameters:**
- `limit` (default: 100): Number of records to return
- `offset` (default: 0): Offset for pagination

**Response:**
```json
[
  {
    "id": 123,
    "device_id": "sensor-001",
    "voltage": 12.5,
    "current": 2.3,
    "battery_soh": 95.5,
    "soh_measurement_time": "2025-12-14T10:30:00Z",
    "timestamp": "2025-12-14T10:30:01.000Z"
  }
]
```

### GET /api/stats
Get dashboard statistics.

**Response:**
```json
{
  "totalDevices": 5,
  "activeDevices": 3,
  "totalReadings": 1523
}
```

## 🛠️ Troubleshooting

### MQTT Connection Issues

**Problem:** Cannot connect to MQTT broker

**Solutions:**
- Verify Mosquitto is running: `sudo systemctl status mosquitto`
- Check if port 1883 is open: `netstat -an | grep 1883`
- Verify MQTT_BROKER_URL in `.env` file
- Test connection: `mosquitto_pub -t "test" -m "hello"`

### Database Issues

**Problem:** Database errors or corruption

**Solutions:**
- Delete the database file: `rm iot_data.db`
- Restart the server: `npm start`
- The database will be recreated automatically

### Port Already in Use

**Problem:** Port 3000 is already in use

**Solutions:**
- Change PORT in `.env` file to another port (e.g., 3001)
- Or stop the process using port 3000:
  ```bash
  # Find process
  lsof -i :3000
  # Kill process
  kill -9 [PID]
  ```

### Real-time Updates Not Working

**Problem:** Dashboard doesn't update in real-time

**Solutions:**
- Check browser console for Socket.IO connection errors
- Verify the server is running
- Try refreshing the page (Ctrl+F5 or Cmd+Shift+R)
- Check if WebSocket connections are blocked by firewall

## 🔒 Security Notes

**For Production Deployment:**

1. **Enable MQTT Authentication:**
   ```env
   MQTT_USERNAME=your_username
   MQTT_PASSWORD=your_secure_password
   ```

2. **Use TLS/SSL for MQTT:**
   ```env
   MQTT_BROKER_URL=mqtts://your-broker:8883
   ```

3. **Configure Firewall:**
   - Only allow necessary ports (3000 for HTTP, 1883/8883 for MQTT)
   - Use reverse proxy (nginx) with HTTPS

4. **Environment Variables:**
   - Never commit `.env` file to version control
   - Use strong passwords for MQTT authentication

5. **Database Security:**
   - Regular backups of `iot_data.db`
   - Restrict file permissions on database file

6. **Rate Limiting:**
   - API endpoints are rate-limited (100 requests per 15 minutes per IP)
   - Prevents DoS attacks and abuse

7. **Input Validation:**
   - All API inputs are validated
   - SQL injection prevention via parameterized queries
   - XSS prevention via HTML escaping in frontend

## 👨‍💻 Author

**Feryan Romadhon**

## 📄 License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2025 Feryan Romadhon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/feryrz/iot-mqtt-dashboard/issues).

## ⭐ Show your support

Give a ⭐️ if this project helped you!
