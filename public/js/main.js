// Socket.IO connection
const socket = io();

// Connection status handling
socket.on('connect', () => {
  console.log('Connected to server');
  updateConnectionStatus(true);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  updateConnectionStatus(false);
});

// Real-time device updates
socket.on('device-update', (data) => {
  console.log('Device update received:', data);
  loadDevices();
  loadStats();
});

// Update connection status indicator
function updateConnectionStatus(connected) {
  const statusDot = document.querySelector('.connection-status .status-dot');
  const statusText = document.getElementById('statusText');
  
  if (connected) {
    statusDot.classList.add('connected');
    statusDot.classList.remove('disconnected');
    statusText.textContent = 'Connected';
  } else {
    statusDot.classList.remove('connected');
    statusDot.classList.add('disconnected');
    statusText.textContent = 'Disconnected';
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Calculate relative time
function getRelativeTime(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return `${diffSec} seconds ago`;
  } else if (diffMin < 60) {
    return `${diffMin} minutes ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hours ago`;
  } else {
    return `${diffDay} days ago`;
  }
}

// Determine device status based on last seen
function getDeviceStatus(lastSeen) {
  const now = new Date();
  const past = new Date(lastSeen);
  const diffMin = Math.floor((now - past) / 1000 / 60);

  if (diffMin < 5) {
    return { status: 'active', text: 'Active', class: 'active' };
  } else if (diffMin < 15) {
    return { status: 'warning', text: 'Warning', class: 'warning' };
  } else {
    return { status: 'inactive', text: 'Inactive', class: 'inactive' };
  }
}

// Format number with fixed decimals
function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return '-';
  return parseFloat(value).toFixed(decimals);
}

// Load and display all devices
async function loadDevices() {
  try {
    const response = await fetch('/api/devices');
    const devices = await response.json();

    const container = document.getElementById('devicesContainer');
    const emptyState = document.getElementById('emptyState');

    if (devices.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    // Fetch latest readings for all devices
    const devicesWithReadings = await Promise.all(
      devices.map(async (device) => {
        const readingResponse = await fetch(`/api/devices/${device.id}/latest`);
        const reading = await readingResponse.json();
        return { ...device, latest: reading };
      })
    );

    // Render device cards
    container.innerHTML = devicesWithReadings.map(device => {
      const status = getDeviceStatus(device.last_seen);
      const relativeTime = getRelativeTime(device.last_seen);
      
      return `
        <div class="device-card" onclick="window.location.href='/device.html?id=${escapeHtml(device.id)}'">
          <div class="device-card-header">
            <div class="device-name">${escapeHtml(device.name)}</div>
            <div class="device-status ${status.class}">
              <span class="status-dot"></span>
              <span>${status.text}</span>
            </div>
          </div>
          <div class="device-info">
            ${device.latest && device.latest.voltage ? `
              <div class="info-row">
                <span class="info-label">Voltage:</span>
                <span class="info-value">${formatNumber(device.latest.voltage)} V</span>
              </div>
              <div class="info-row">
                <span class="info-label">Current:</span>
                <span class="info-value">${formatNumber(device.latest.current)} A</span>
              </div>
              <div class="info-row">
                <span class="info-label">Battery SOH:</span>
                <span class="info-value">${formatNumber(device.latest.battery_soh)} %</span>
              </div>
            ` : '<div class="info-row"><span class="info-label">No readings yet</span></div>'}
          </div>
          <div class="device-last-seen">Last seen: ${relativeTime}</div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading devices:', error);
    document.getElementById('devicesContainer').innerHTML = 
      '<div class="loading">Error loading devices. Please try again.</div>';
  }
}

// Load and display statistics
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    const stats = await response.json();

    document.getElementById('totalDevices').textContent = stats.totalDevices || 0;
    document.getElementById('activeDevices').textContent = stats.activeDevices || 0;
    document.getElementById('totalReadings').textContent = stats.totalReadings || 0;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Initialize dashboard
async function init() {
  await loadDevices();
  await loadStats();
  
  // Auto-refresh stats every 30 seconds
  setInterval(loadStats, 30000);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
