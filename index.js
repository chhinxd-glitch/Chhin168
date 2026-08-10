const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_URL = process.env.TARGET_URL || 'https://your-website.com';
const INTERVAL_MINUTES = 5; // រៀងរាល់ 5 នាទី
const LOG_FILE = path.join(__dirname, 'bot-logs.txt');

// ===== LOGGING =====
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  console.log(entry.trim());
  fs.appendFileSync(LOG_FILE, entry, 'utf8');
}

// ===== PING FUNCTION =====
async function pingWebsite() {
  try {
    const startTime = Date.now();
    const response = await axios.get(TARGET_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonitoringBot/1.0; +https://your-site.com)'
      }
    });
    const duration = Date.now() - startTime;
    const status = response.status;
    const size = response.headers['content-length'] || 'unknown';

    log(`✅ SUCCESS | Status: ${status} | Duration: ${duration}ms | Size: ${size} bytes`);
    return { success: true, status, duration, size };
  } catch (error) {
    let errorMsg = `❌ ERROR | `;
    if (error.code === 'ECONNABORTED') {
      errorMsg += 'Timeout (10s)';
    } else if (error.response) {
      errorMsg += `Status: ${error.response.status} | ${error.response.statusText}`;
    } else if (error.request) {
      errorMsg += `No response: ${error.message}`;
    } else {
      errorMsg += error.message;
    }
    log(errorMsg, true);
    return { success: false, error: errorMsg };
  }
}

// ===== SCHEDULE BOT =====
pingWebsite(); // ដំណើរការភ្លាមៗ
cron.schedule(`*/${INTERVAL_MINUTES} * * * *`, () => {
  pingWebsite();
});

console.log(`🤖 Bot started! Pinging ${TARGET_URL} every ${INTERVAL_MINUTES} minutes.`);

// ===== EXPRESS ROUTES =====

// 1. Dashboard HTML
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="km">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Website Monitor 24/7</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
        body { background: #0b0e1a; color: #e0e4f0; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { color: #ffd700; display: flex; align-items: center; gap: 12px; }
        h1 small { font-size: 0.7rem; color: #8899bb; font-weight: 300; }
        .status-box { background: #141c2c; border-radius: 16px; padding: 20px; margin: 20px 0; border-left: 4px solid #ffd700; }
        .status-box .label { color: #8899bb; font-size: 0.85rem; }
        .status-box .value { font-size: 1.5rem; font-weight: 600; }
        .status-box .value.online { color: #5fdd7a; }
        .status-box .value.offline { color: #ff6b6b; }
        .stats { display: flex; gap: 24px; flex-wrap: wrap; margin: 16px 0; }
        .stat-card { background: #111a2a; padding: 14px 20px; border-radius: 12px; flex: 1; min-width: 120px; }
        .stat-card .num { font-size: 1.8rem; font-weight: 700; color: #ffd700; }
        .stat-card .desc { color: #8899bb; font-size: 0.8rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #111a2a; border-radius: 12px; overflow: hidden; }
        th { background: #1a2440; color: #b0c4e8; padding: 12px; text-align: left; font-weight: 500; }
        td { padding: 10px 12px; border-bottom: 1px solid #1a2440; font-size: 0.9rem; }
        .log-success { color: #5fdd7a; }
        .log-error { color: #ff6b6b; }
        .refresh-btn { background: #1a2440; border: none; color: #b0c4e8; padding: 8px 20px; border-radius: 40px; cursor: pointer; }
        .refresh-btn:hover { background: #2a3a5a; }
        .footer { margin-top: 30px; color: #4d6188; font-size: 0.75rem; text-align: center; }
        #logContainer { max-height: 400px; overflow-y: auto; }
    </style>
</head>
<body>
<div class="container">
    <h1>📊 Website Monitor <small>24/7 · Node.js</small></h1>
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
        <div class="status-box">
            <div class="label">🟢 ស្ថានភាពបច្ចុប្បន្ន</div>
            <div class="value" id="currentStatus">⏳ កំពុងផ្ទុក...</div>
            <div style="font-size:0.85rem; color:#8899bb; margin-top:6px;" id="lastUpdate"></div>
        </div>
        <button class="refresh-btn" onclick="fetchStatus()">⟳ Refresh</button>
    </div>

    <div class="stats">
        <div class="stat-card"><div class="num" id="totalPings">0</div><div class="desc">សរុបការចូលមើល</div></div>
        <div class="stat-card"><div class="num" id="successCount">0</div><div class="desc">ជោគជ័យ</div></div>
        <div class="stat-card"><div class="num" id="failCount">0</div><div class="desc">បរាជ័យ</div></div>
        <div class="stat-card"><div class="num" id="avgTime">0ms</div><div class="desc">មធ្យមពេលវេលា</div></div>
    </div>

    <h3 style="margin-top:24px; color:#b0c4e8;">📋 Logs ចុងក្រោយ</h3>
    <div id="logContainer">
        <table>
            <thead><tr><th>ពេលវេលា</th><th>ស្ថានភាព</th><th>ព័ត៌មាន</th></tr></thead>
            <tbody id="logBody">
                <tr><td colspan="3" style="text-align:center; color:#6a7fa0;">កំពុងទាញយក logs...</td></tr>
            </tbody>
        </table>
    </div>
    <div class="footer">🤖 Bot ដំណើរការ 24/7 · ចូលមើលរៀងរាល់ ${INTERVAL_MINUTES} នាទី</div>
</div>

<script>
    async function fetchStatus() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            // បច្ចុប្បន្ន
            const statusEl = document.getElementById('currentStatus');
            if (data.lastResult && data.lastResult.success) {
                statusEl.textContent = '✅ ONLINE';
                statusEl.className = 'value online';
            } else if (data.lastResult) {
                statusEl.textContent = '❌ OFFLINE';
                statusEl.className = 'value offline';
            } else {
                statusEl.textContent = '⏳ រង់ចាំការសាកល្បងដំបូង';
                statusEl.className = 'value';
            }
            document.getElementById('lastUpdate').textContent = data.lastUpdate ? 'ពេលវេលា: ' + new Date(data.lastUpdate).toLocaleString() : '';

            // ស្ថិតិ
            document.getElementById('totalPings').textContent = data.totalPings || 0;
            document.getElementById('successCount').textContent = data.successCount || 0;
            document.getElementById('failCount').textContent = data.failCount || 0;
            document.getElementById('avgTime').textContent = (data.avgTime || 0) + 'ms';

            // Logs
            const logs = data.logs || [];
            const tbody = document.getElementById('logBody');
            if (logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#6a7fa0;">មិនទាន់មាន logs</td></tr>';
            } else {
                tbody.innerHTML = logs.map(log => {
                    const cls = log.includes('SUCCESS') ? 'log-success' : 'log-error';
                    const parts = log.match(/^\[(.*?)\]\s+(.*)$/);
                    if (parts) {
                        const time = parts[1];
                        const msg = parts[2];
                        return \`<tr><td>\${time}</td><td class="\${cls}">\${msg.includes('SUCCESS') ? '✅' : '❌'}</td><td>\${msg}</td></tr>\`;
                    }
                    return \`<tr><td colspan="3">\${log}</td></tr>\`;
                }).join('');
            }
        } catch (err) {
            console.error(err);
        }
    }

    // ទាញយកទិន្នន័យភ្លាមៗ និងរៀងរាល់ 10 វិនាទី
    fetchStatus();
    setInterval(fetchStatus, 10000);
</script>
</body>
</html>
    `);
});

// 2. API Status
app.get('/api/status', (req, res) => {
  try {
    // អាន logs ពីឯកសារ
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      logs = content.split('\n').filter(line => line.trim() !== '');
      logs = logs.slice(-50); // 50 ចុងក្រោយ
    }

    // គណនាស្ថិតិ
    let totalPings = 0, successCount = 0, failCount = 0;
    let totalTime = 0, timeCount = 0;
    let lastResult = null;
    let lastUpdate = null;

    if (logs.length > 0) {
      logs.forEach(line => {
        if (line.includes('SUCCESS')) {
          successCount++;
          const match = line.match(/Duration: (\d+)ms/);
          if (match) { totalTime += parseInt(match[1]); timeCount++; }
        } else if (line.includes('ERROR')) {
          failCount++;
        }
        totalPings++;
      });
      // ព្យាយាមទាញយកលទ្ធផលចុងក្រោយ
      const lastLine = logs[logs.length - 1];
      if (lastLine) {
        lastResult = { success: lastLine.includes('SUCCESS') };
        const timeMatch = lastLine.match(/\[(.*?)\]/);
        if (timeMatch) lastUpdate = timeMatch[1];
      }
    }

    const avgTime = timeCount > 0 ? Math.round(totalTime / timeCount) : 0;

    res.json({
      lastResult,
      lastUpdate,
      totalPings,
      successCount,
      failCount,
      avgTime,
      logs: logs.slice(-20) // 20 ចុងក្រោយសម្រាប់បង្ហាញ
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🌐 Dashboard available at http://localhost:${PORT}`);
});