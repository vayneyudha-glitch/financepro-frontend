/* ============================================================
   ADMIN-REPORTS.JS — Report Generator
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-reports');
initSidebarMobile();
initThemeToggle();

async function loadFilters() {
    var [usersResult, catsResult] = await Promise.all([
        AdminAPI.getUsers({ limit: 100 }),
        CategoryAPI.getAll()
    ]);
    if (usersResult.ok) {
        var opts = '<option value="">All Users</option>';
        usersResult.data.data.items.forEach(function(u) { opts += '<option value="' + u.id + '">' + escapeHtml(u.name) + ' (' + escapeHtml(u.email) + ')</option>'; });
        document.getElementById('reportUser').innerHTML = opts;
    }
    if (catsResult.ok) {
        var catOpts = '<option value="">All Categories</option>';
        catsResult.data.data.forEach(function(c) { catOpts += '<option value="' + c.id + '">' + escapeHtml(c.name) + ' (' + c.type + ')</option>'; });
        document.getElementById('reportCategory').innerHTML = catOpts;
    }
}

async function generateReport() {
    var container = document.getElementById('reportContent');
    container.innerHTML = loadingHtml('Generating report...');

    var filters = {
        type: document.getElementById('reportType').value,
        userId: document.getElementById('reportUser').value,
        categoryId: document.getElementById('reportCategory').value,
        transactionType: document.getElementById('reportTrxType').value,
        dateFrom: document.getElementById('reportDateFrom').value,
        dateTo: document.getElementById('reportDateTo').value
    };

    var result = await AdminAPI.getReport(filters);
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to generate report'); return; }

    var d = result.data.data;
    var s = d.summary;

    var html = '<div class="card"><div class="card-header"><h3>' + d.reportType.charAt(0).toUpperCase() + d.reportType.slice(1) + ' Report (' + d.dateFrom + ' to ' + d.dateTo + ')</h3></div><div class="card-body">';

    // Summary KPIs
    html += '<div class="kpi-grid">' +
        kpiCard('Transaction Count', s.transactionCount, 'count') +
        kpiCard('Total Income', formatRupiah(s.totalIncome), 'income') +
        kpiCard('Total Expense', formatRupiah(s.totalExpense), 'expense') +
        kpiCard('Net Cash Flow', formatRupiah(s.netCashFlow), s.netCashFlow>=0?'income':'expense') +
    '</div>';

    html += '<p><strong>Average Transaction:</strong> ' + formatRupiah(s.averageTransaction) + '</p>';

    // By Category
    if (d.byCategory && d.byCategory.length > 0) {
        html += '<h4>By Category</h4><div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Category</th><th>Type</th><th>Total</th><th>Count</th></tr></thead><tbody>';
        d.byCategory.forEach(function(c) {
            html += '<tr><td>' + escapeHtml(c.name) + '</td><td>' + c.type + '</td><td class="' + (c.type==='Income'?'text-success':'text-danger') + '">' + formatRupiah(c.total) + '</td><td>' + c.count + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }

    // By User
    if (d.byUser && d.byUser.length > 0) {
        html += '<h4>By User</h4><div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>User</th><th>Income</th><th>Expense</th><th>Net</th><th>Count</th></tr></thead><tbody>';
        d.byUser.forEach(function(u) {
            html += '<tr><td>' + escapeHtml(u.name) + '</td><td class="text-success">' + formatRupiah(u.income) + '</td><td class="text-danger">' + formatRupiah(u.expense) + '</td><td class="' + (u.net>=0?'text-success':'text-danger') + '">' + formatRupiah(u.net) + '</td><td>' + u.count + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }

    html += '</div></div>';
    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', async function() {
    await loadFilters();
    document.getElementById('generateBtn').addEventListener('click', generateReport);
    document.getElementById('downloadCsvBtn').addEventListener('click', async function() {
        var filters = {
            type: document.getElementById('reportType').value,
            userId: document.getElementById('reportUser').value,
            categoryId: document.getElementById('reportCategory').value,
            transactionType: document.getElementById('reportTrxType').value,
            dateFrom: document.getElementById('reportDateFrom').value,
            dateTo: document.getElementById('reportDateTo').value
        };
        var result = await AdminAPI.downloadReport(filters);
        if (result.ok) { window.open(result.url, '_blank'); showToast('Download started', 'success'); }
        else showToast('Download failed', 'error');
    });
});
