/* ============================================================
   ADMIN-SYSTEM-HEALTH.JS — System Health Monitoring
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-system-health');
initSidebarMobile();
initThemeToggle();

async function loadHealth() {
    var container = document.getElementById('healthContent');
    container.innerHTML = '<div class="loading-state">Loading system health...</div>';

    var result = await AdminAPI.getSystemHealth();
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to load'); return; }

    var d = result.data.data;

    var html = '';

    // API Status
    var apiHealthy = d.api.status === 'running';
    html += '<div class="card"><div class="card-header"><h3>API Status</h3></div><div class="card-body">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
            '<div><strong>Status:</strong> <span class="health-status"><span class="health-dot ' + (apiHealthy?'healthy':'critical') + '"></span>' + d.api.status + '</span></div>' +
            '<div><strong>Environment:</strong> ' + d.api.environment + '</div>' +
            '<div><strong>Node.js:</strong> ' + d.api.nodeVersion + '</div>' +
            '<div><strong>Uptime:</strong> ' + d.api.uptimeFormatted + '</div>' +
        '</div></div></div>';

    // Database Status
    var dbHealthy = d.database.status === 'connected';
    html += '<div class="card"><div class="card-header"><h3>Database Status</h3></div><div class="card-body">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
            '<div><strong>Status:</strong> <span class="health-status"><span class="health-dot ' + (dbHealthy?'healthy':'critical') + '"></span>' + d.database.status + '</span></div>' +
            '<div><strong>Host:</strong> ' + d.database.host + '</div>' +
            '<div><strong>Name:</strong> ' + d.database.name + '</div>' +
        '</div>' +
        '<h4 style="margin-top:16px;">Table Counts</h4>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">' +
            '<div class="kpi-card count"><p class="kpi-label">Users</p><h3 class="kpi-value">' + d.database.tables.users + '</h3></div>' +
            '<div class="kpi-card count"><p class="kpi-label">Transactions</p><h3 class="kpi-value">' + d.database.tables.transactions + '</h3></div>' +
            '<div class="kpi-card count"><p class="kpi-label">Categories</p><h3 class="kpi-value">' + d.database.tables.categories + '</h3></div>' +
            '<div class="kpi-card count"><p class="kpi-label">Activity Logs</p><h3 class="kpi-value">' + d.database.tables.activityLogs + '</h3></div>' +
            '<div class="kpi-card count"><p class="kpi-label">Budgets</p><h3 class="kpi-value">' + d.database.tables.budgets + '</h3></div>' +
            '<div class="kpi-card count"><p class="kpi-label">Alerts</p><h3 class="kpi-value">' + d.database.tables.alerts + '</h3></div>' +
        '</div></div></div>';

    // System Info
    var memUsedMB = Math.round(d.system.usedMemory / 1024 / 1024);
    var totalMemGB = (d.system.totalMemory / 1024 / 1024 / 1024).toFixed(1);
    var freeMemGB = (d.system.freeMemory / 1024 / 1024 / 1024).toFixed(1);
    html += '<div class="card"><div class="card-header"><h3>System Info</h3></div><div class="card-body">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
            '<div><strong>Platform:</strong> ' + d.system.platform + '</div>' +
            '<div><strong>Architecture:</strong> ' + d.system.arch + '</div>' +
            '<div><strong>Hostname:</strong> ' + d.system.hostname + '</div>' +
            '<div><strong>CPU Cores:</strong> ' + d.system.cpus + '</div>' +
            '<div><strong>Total Memory:</strong> ' + totalMemGB + ' GB</div>' +
            '<div><strong>Free Memory:</strong> ' + freeMemGB + ' GB</div>' +
            '<div><strong>Node Memory Used:</strong> ' + memUsedMB + ' MB</div>' +
        '</div>' +
        '<p style="margin-top:12px;color:var(--text-light);font-size:12px;">Last checked: ' + d.timestamp + '</p>' +
    '</div></div>';

    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', loadHealth);
