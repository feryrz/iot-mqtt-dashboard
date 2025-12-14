// Socket.IO connection
const socket = io();

// Parse device ID from URL
const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('id');

// Pagination state
let currentOffset = 0;
const pageSize = 50;

// Check if device ID is present
if (!deviceId) {
  window.location.href = '/';
}

// Socket connection handlers
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Listen for device updates
socket.on('device-update', (data) => {
  if (data.deviceId === deviceId) {
    console.log('Device update received:', data);
    loadDeviceInfo();
    loadLatestData();
    prependNewReading(data.data);
  }
});

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

// Format timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Format number with decimals
function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return '-';
  return parseFloat(value).toFixed(decimals);
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
    return `${diffSec}s ago`;
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHour < 24) {
    return `${diffHour}h ago`;
  } else {
    return `${diffDay}d ago`;
  }
}

// Determine device status
function getDeviceStatus(lastSeen) {
  const now = new Date();
  const past = new Date(lastSeen);
  const diffMin = Math.floor((now - past) / 1000 / 60);

  if (diffMin < 5) {
    return { text: 'Active', class: 'active' };
  } else if (diffMin < 15) {
    return { text: 'Warning', class: 'warning' };
  } else {
    return { text: 'Inactive', class: 'inactive' };
  }
}

// Load device information
async function loadDeviceInfo() {
  try {
    const response = await fetch(`/api/devices/${deviceId}`);
    
    if (response.status === 404) {
      document.querySelector('.container').innerHTML = 
        '<h1>Device not found</h1><a href="/">Back to Dashboard</a>';
      return;
    }

    const device = await response.json();
    
    document.getElementById('deviceName').textContent = device.name;
    
    const status = getDeviceStatus(device.last_seen);
    const statusDot = document.getElementById('deviceStatusDot');
    const statusText = document.getElementById('deviceStatus');
    
    statusDot.className = `status-dot ${status.class}`;
    statusText.textContent = status.text;
  } catch (error) {
    console.error('Error loading device info:', error);
  }
}

// Load latest data
async function loadLatestData() {
  try {
    const response = await fetch(`/api/devices/${deviceId}/latest`);
    const data = await response.json();

    if (data && data.voltage) {
      // Update data cards with animation
      updateDataCard('latestVoltage', formatNumber(data.voltage));
      updateDataCard('latestCurrent', formatNumber(data.current));
      updateDataCard('latestBatterySoh', formatNumber(data.battery_soh));
      updateDataCard('latestTimestamp', getRelativeTime(data.timestamp));
    } else {
      document.getElementById('latestVoltage').textContent = '-';
      document.getElementById('latestCurrent').textContent = '-';
      document.getElementById('latestBatterySoh').textContent = '-';
      document.getElementById('latestTimestamp').textContent = 'No data';
    }
  } catch (error) {
    console.error('Error loading latest data:', error);
  }
}

// Update data card with animation
function updateDataCard(elementId, value) {
  const element = document.getElementById(elementId);
  const card = element.closest('.data-card');
  
  element.textContent = value;
  
  // Add animation class
  if (card) {
    card.classList.add('updated');
    setTimeout(() => card.classList.remove('updated'), 600);
  }
}

// Load historical data
async function loadHistory(append = false) {
  try {
    const response = await fetch(
      `/api/devices/${deviceId}/history?limit=${pageSize}&offset=${currentOffset}`
    );
    const data = await response.json();

    const tbody = document.getElementById('historyTableBody');

    if (data.length === 0 && currentOffset === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">No historical data available</td></tr>';
      document.getElementById('loadMoreButton').disabled = true;
      return;
    }

    if (data.length === 0 && currentOffset > 0) {
      document.getElementById('loadMoreButton').disabled = true;
      return;
    }

    const rows = data.map(reading => `
      <tr>
        <td>${formatTimestamp(reading.timestamp)}</td>
        <td>${formatNumber(reading.voltage)}</td>
        <td>${formatNumber(reading.current)}</td>
        <td>${formatNumber(reading.battery_soh)}</td>
        <td>${reading.soh_measurement_time ? formatTimestamp(reading.soh_measurement_time) : '-'}</td>
      </tr>
    `).join('');

    if (append) {
      tbody.insertAdjacentHTML('beforeend', rows);
    } else {
      tbody.innerHTML = rows;
    }

    // Enable/disable load more button
    document.getElementById('loadMoreButton').disabled = data.length < pageSize;
  } catch (error) {
    console.error('Error loading history:', error);
    document.getElementById('historyTableBody').innerHTML = 
      '<tr><td colspan="5" class="loading">Error loading data</td></tr>';
  }
}

// Prepend new reading to table with animation
function prependNewReading(data) {
  const tbody = document.getElementById('historyTableBody');
  
  // Check if table is empty
  if (tbody.querySelector('td[colspan]')) {
    tbody.innerHTML = '';
  }

  const row = document.createElement('tr');
  row.className = 'new-row';
  row.innerHTML = `
    <td>${formatTimestamp(data.timestamp)}</td>
    <td>${formatNumber(data.voltage)}</td>
    <td>${formatNumber(data.current)}</td>
    <td>${formatNumber(data.battery_soh)}</td>
    <td>${data.soh_measurement_time ? formatTimestamp(data.soh_measurement_time) : '-'}</td>
  `;

  tbody.insertBefore(row, tbody.firstChild);

  // Remove animation class after it completes
  setTimeout(() => row.classList.remove('new-row'), 1500);
}

// Load more button handler
document.getElementById('loadMoreButton').addEventListener('click', () => {
  currentOffset += pageSize;
  loadHistory(true);
});

// Export to CSV
document.getElementById('exportButton').addEventListener('click', async () => {
  try {
    const response = await fetch(
      `/api/devices/${deviceId}/history?limit=10000&offset=0`
    );
    const data = await response.json();

    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV content
    const headers = ['Timestamp', 'Voltage (V)', 'Current (A)', 'Battery SOH (%)', 'SOH Measurement Time'];
    const csvRows = [headers.join(',')];

    data.forEach(reading => {
      const row = [
        reading.timestamp,
        reading.voltage,
        reading.current,
        reading.battery_soh,
        reading.soh_measurement_time || ''
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device_${deviceId}_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Error exporting data');
  }
});

// Initialize page
async function init() {
  await loadDeviceInfo();
  await loadLatestData();
  await loadHistory();

  // Auto-refresh device info every 30 seconds
  setInterval(loadDeviceInfo, 30000);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
