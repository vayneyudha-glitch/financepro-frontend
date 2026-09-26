/* ============================================================
   ADMIN-SECURITY.JS — Security Center
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-security');
initSidebarMobile();
initThemeToggle();

async function loadSecurity() {
    var container = document.getElementById('secContent');
    container.innerHTML = '<div class="loading-state">Loading security data...</div>';

    var result = await AdminAPI.getSecurity();
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to load'); return; }

    var d = result.data.data;

    var html = '';

    // Stats
    html += '<div class="kpi-grid">' +
        kpiCard('Active Users', d.stats.activeUsers, 'count') +
        kpiCard('Inactive Users', d.stats.inactiveUsers, 'warning') +
        kpiCard('Admin Users', d.stats.adminUsers, 'count') +
        kpiCard('Failed Logins', d.stats.totalFailedLogins, 'expense') +
    '</div>';

    // Failed Logins
    html += '<div class="card"><div class="card-header"><h3>Failed Login Attempts</h3></div>';
    if (d.failedLogins.length === 0) { html += '<div class="card-body">' + successStateHtml('No failed login attempts!') + '</div>'; }
    else {
        html += '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Time</th><th>User</th><th>Description</th><th>IP</th></tr></thead><tbody>';
        d.failedLogins.forEach(function(l) {
            html += '<tr><td>' + formatDateTime(l.createdAt) + '</td><td>' + escapeHtml(l.userName || '-') + '</td><td>' + escapeHtml(l.description) + '</td><td>' + escapeHtml(l.ipAddress || '-') + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }
    html += '</div>';

    // Recent Logins
    html += '<div class="card"><div class="card-header"><h3>Recent Logins</h3></div>';
    if (d.recentLogins.length === 0) { html += '<div class="card-body">' + emptyStateHtml('No logins') + '</div>'; }
    else {
        html += '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Time</th><th>User</th><th>IP</th></tr></thead><tbody>';
        d.recentLogins.forEach(function(l) {
            html += '<tr><td>' + formatDateTime(l.createdAt) + '</td><td>' + escapeHtml(l.userName || '-') + '</td><td>' + escapeHtml(l.ipAddress || '-') + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }
    html += '</div>';

    // Suspicious IPs
    html += '<div class="card"><div class="card-header"><h3>Suspicious IP Addresses</h3></div>';
    if (d.suspiciousIps.length === 0) { html += '<div class="card-body">' + successStateHtml('No suspicious activity detected!') + '</div>'; }
    else {
        html += '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>IP Address</th><th>Failed Attempts</th><th>Last Attempt</th></tr></thead><tbody>';
        d.suspiciousIps.forEach(function(s) {
            html += '<tr><td>' + escapeHtml(s.ipAddress) + '</td><td class="text-danger">' + s.failedCount + '</td><td>' + formatDateTime(s.lastAttempt) + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }
    html += '</div>';

    // Admin Actions
    html += '<div class="card"><div class="card-header"><h3>Admin Actions</h3></div>';
    if (d.adminActions.length === 0) { html += '<div class="card-body">' + emptyStateHtml('No admin actions') + '</div>'; }
    else {
        html += '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Description</th><th>IP</th></tr></thead><tbody>';
        d.adminActions.forEach(function(a) {
            html += '<tr><td>' + formatDateTime(a.createdAt) + '</td><td>' + escapeHtml(a.userName || '-') + '</td><td><span class="badge badge-warning">' + a.action + '</span></td><td>' + escapeHtml(a.description) + '</td><td>' + escapeHtml(a.ipAddress || '-') + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }
    html += '</div>';

    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', loadSecurity);
