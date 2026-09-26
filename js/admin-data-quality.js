/* ============================================================
   ADMIN-DATA-QUALITY.JS — Data Quality Monitoring
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-data-quality');
initSidebarMobile();
initThemeToggle();

async function loadDataQuality() {
    var container = document.getElementById('dqContent');
    container.innerHTML = '<div class="loading-state">Loading data quality...</div>';

    var result = await AdminAPI.getDataQuality();
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to load'); return; }

    var d = result.data.data;

    var html = '';

    // Quality Score Card
    var scoreClass = d.qualityScore >= 95 ? 'income' : d.qualityScore >= 80 ? 'warning' : 'expense';
    html += '<div class="card" style="text-align:center;">' +
        '<div class="card-header"><h3>Data Quality Score</h3></div>' +
        '<div class="card-body"><h1 style="font-size:48px;color:var(--' + scoreClass + ');">' + d.qualityScore + '%</h1>' +
        '<p>Total Transactions: ' + d.totalTransactions + ' | Issues: ' + d.totalIssues + ' | Problem Records: ' + d.totalProblemRecords + '</p></div></div>';

    // Issues Table
    if (d.issues.length === 0) {
        html += '<div class="card"><div class="card-body">' + successStateHtml('No data quality issues found!') + '</div></div>';
    } else {
        html += '<div class="card"><div class="card-header"><h3>Data Quality Issues</h3></div>' +
            '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
            '<th>Issue</th><th>Count</th><th>Severity</th><th>Details</th>' +
            '</tr></thead><tbody>';
        d.issues.forEach(function(i) {
            html += '<tr>' +
                '<td>' + escapeHtml(i.issue) + '</td>' +
                '<td>' + i.count + '</td>' +
                '<td><span class="severity-badge severity-' + i.severity + '">' + i.severity + '</span></td>' +
                '<td>' + escapeHtml(i.details || '-') + '</td>' +
            '</tr>';
        });
        html += '</tbody></table></div></div>';
    }

    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', loadDataQuality);
