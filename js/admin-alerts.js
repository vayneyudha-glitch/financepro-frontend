/* ============================================================
   ADMIN-ALERTS.JS — Financial Alerts
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-alerts');
initSidebarMobile();
initThemeToggle();

async function loadAlerts() {
    var container = document.getElementById('alertsContent');
    container.innerHTML = '<div class="loading-state">Loading alerts...</div>';

    var result = await AdminAPI.getAlerts();
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to load'); return; }

    var d = result.data.data;
    var dynamic = d.dynamic || [];
    var stored = d.stored || [];

    var html = '';

    if (dynamic.length === 0 && stored.length === 0) {
        html = '<div class="card"><div class="card-body">' + successStateHtml('No alerts! Everything looks good.') + '</div></div>';
        container.innerHTML = html;
        return;
    }

    // Dynamic Alerts
    if (dynamic.length > 0) {
        html += '<div class="card"><div class="card-header"><h3>Active Alerts (' + dynamic.length + ')</h3></div><div class="card-body">';
        dynamic.forEach(function(a) {
            html += '<div class="insight-card ' + (a.severity==='CRITICAL'?'negative':a.severity==='WARNING'?'warning':'') + '">' +
                '<p class="insight-title"><span class="severity-badge severity-' + a.severity + '">' + a.severity + '</span> ' + escapeHtml(a.title) + '</p>' +
                '<p class="insight-message">' + escapeHtml(a.message) + '</p></div>';
        });
        html += '</div></div>';
    }

    // Stored Alerts
    if (stored.length > 0) {
        html += '<div class="card"><div class="card-header"><h3>System Alerts</h3></div>' +
            '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Severity</th><th>Title</th><th>Message</th><th>Created</th><th>Action</th></tr></thead><tbody>';
        stored.forEach(function(a) {
            html += '<tr>' +
                '<td><span class="severity-badge severity-' + a.severity + '">' + a.severity + '</span></td>' +
                '<td>' + escapeHtml(a.title) + '</td>' +
                '<td>' + escapeHtml(a.message) + '</td>' +
                '<td>' + formatDateTime(a.createdAt) + '</td>' +
                '<td>' + (a.isRead ? '<span class="badge badge-secondary">Read</span>' : '<button class="btn btn-sm btn-secondary" onclick="markRead(' + a.id + ')">Mark Read</button>') + '</td>' +
            '</tr>';
        });
        html += '</tbody></table></div></div>';
    }

    container.innerHTML = html;
}

async function markRead(id) {
    var result = await AdminAPI.markAlertRead(id);
    if (result.ok) { showToast('Alert marked as read', 'success'); loadAlerts(); }
    else showToast('Failed', 'error');
}

document.addEventListener('DOMContentLoaded', loadAlerts);
