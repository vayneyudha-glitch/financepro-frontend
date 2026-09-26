/* ============================================================
   ADMIN-ACTIVITY.JS — Activity Logs
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-activity');
initSidebarMobile();
initThemeToggle();

var logState = { page: 1, limit: 20 };

async function loadLogs() {
    var container = document.getElementById('logsTable');
    var pagination = document.getElementById('logsPagination');
    if (container) container.innerHTML = loadingHtml('Loading activity logs...');

    var filters = {
        search: document.getElementById('searchInput').value,
        action: document.getElementById('actionFilter').value,
        dateFrom: document.getElementById('dateFrom').value,
        dateTo: document.getElementById('dateTo').value,
        page: logState.page,
        limit: logState.limit
    };

    var result = await AdminAPI.getActivityLogs(filters);
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to load'); return; }

    var data = result.data.data;
    if (data.items.length === 0) { container.innerHTML = emptyStateHtml('No logs found'); pagination.innerHTML = ''; return; }

    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
        '<th>ID</th><th>Time</th><th>User</th><th>Action</th><th>Description</th><th>IP Address</th>' +
        '</tr></thead><tbody>';
    data.items.forEach(function(l) {
        html += '<tr>' +
            '<td>' + l.id + '</td>' +
            '<td>' + formatDateTime(l.createdAt) + '</td>' +
            '<td>' + (l.userName ? escapeHtml(l.userName) : '-') + '</td>' +
            '<td><span class="badge badge-info">' + l.action + '</span></td>' +
            '<td>' + escapeHtml(l.description) + '</td>' +
            '<td>' + escapeHtml(l.ipAddress || '-') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;

    renderPagination(pagination, data.pagination, function(newPage) { logState.page = newPage; loadLogs(); });
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('searchBtn').addEventListener('click', function() { logState.page = 1; loadLogs(); });
    document.getElementById('limitFilter').addEventListener('change', function() { logState.limit = parseInt(this.value); logState.page = 1; loadLogs(); });
    loadLogs();
});
