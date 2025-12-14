require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./database');
const { initializeMQTT, closeMQTT } = require('./mqtt-handler');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

/**
 * GET /api/devices
 * List all devices ordered by last_seen DESC
 */
app.get('/api/devices', (req, res) => {
  db.all(
    'SELECT * FROM devices ORDER BY last_seen DESC',
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching devices:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

/**
 * GET /api/devices/:id
 * Get specific device
 */
app.get('/api/devices/:id', (req, res) => {
  const deviceId = req.params.id;
  
  db.get(
    'SELECT * FROM devices WHERE id = ?',
    [deviceId],
    (err, row) => {
      if (err) {
        console.error('Error fetching device:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json(row);
    }
  );
});

/**
 * GET /api/devices/:id/latest
 * Get latest reading for device
 */
app.get('/api/devices/:id/latest', (req, res) => {
  const deviceId = req.params.id;
  
  db.get(
    `SELECT * FROM readings 
     WHERE device_id = ? 
     ORDER BY timestamp DESC 
     LIMIT 1`,
    [deviceId],
    (err, row) => {
      if (err) {
        console.error('Error fetching latest reading:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(row || {});
    }
  );
});

/**
 * GET /api/devices/:id/history
 * Get paginated historical data for device
 */
app.get('/api/devices/:id/history', (req, res) => {
  const deviceId = req.params.id;
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  
  db.all(
    `SELECT * FROM readings 
     WHERE device_id = ? 
     ORDER BY timestamp DESC 
     LIMIT ? OFFSET ?`,
    [deviceId, limit, offset],
    (err, rows) => {
      if (err) {
        console.error('Error fetching history:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

/**
 * GET /api/stats
 * Get dashboard statistics
 */
app.get('/api/stats', (req, res) => {
  // Get total devices
  db.get('SELECT COUNT(*) as total FROM devices', [], (err, totalRow) => {
    if (err) {
      console.error('Error fetching total devices:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get active devices (last 5 minutes)
    db.get(
      `SELECT COUNT(*) as active FROM devices 
       WHERE datetime(last_seen) > datetime('now', '-5 minutes')`,
      [],
      (err, activeRow) => {
        if (err) {
          console.error('Error fetching active devices:', err.message);
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Get total readings
        db.get(
          'SELECT COUNT(*) as total FROM readings',
          [],
          (err, readingsRow) => {
            if (err) {
              console.error('Error fetching total readings:', err.message);
              return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({
              totalDevices: totalRow.total,
              activeDevices: activeRow.active,
              totalReadings: readingsRow.total
            });
          }
        );
      }
    );
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize MQTT handler
initializeMQTT(io);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  
  closeMQTT();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
});
