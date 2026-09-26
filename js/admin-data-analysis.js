/* ============================================================
   ADMIN-DATA-ANALYSIS.JS — Data Analyst Dashboard
   ============================================================
   Implements: Descriptive Analytics (Mean, Median, Min, Max,
   Sum, Count, Std Dev), Top 10, Bottom 10, Trends, Distribution
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-data-analysis');
initSidebarMobile();
initThemeToggle();

var daState = { range: 'this_year' };

function renderRangeFilter() {
    var container = document.getElementById('rangeFilter');
    var ranges = [
        { key: 'this_month', label: 'This Month' },
        { key: 'last_month', label: 'Last Month' },
        { key: 'this_year', label: 'This Year' },
        { key: '7days', label: '7 Days' },
        { key: '30days', label: '30 Days' }
    ];
    var html = '';
    ranges.forEach(function(r) {
        html += '<button class="range-btn' + (daState.range === r.key ? ' active' : '') + '" data-range="' + r.key + '">' + r.label + '</button>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.range-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            daState.range = this.dataset.range;
            renderRangeFilter();
            loadAnalysis();
        });
    });
}

async function loadAnalysis() {
    var container = document.getElementById('analysisContent');
    container.innerHTML = '<div class="loading-state">Loading data analysis...</div>';

    var result = await AdminAPI.getAnalytics({ range: daState.range });
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to load'); return; }

    var d = result.data.data;
    var s = d.summary;

    var html = '';

    // Descriptive Statistics Table
    html += '<div class="card"><div class="card-header"><h3>Descriptive Statistics</h3></div>' +
        '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
        '<th>Metric</th><th>Income</th><th>Expense</th>' +
        '</tr></thead><tbody>' +
        '<tr><td><strong>Count</strong></td><td>' + s.transactionCount + '</td><td>' + s.transactionCount + '</td></tr>' +
        '<tr><td><strong>Sum</strong></td><td class="text-success">' + formatRupiah(s.totalIncome) + '</td><td class="text-danger">' + formatRupiah(s.totalExpense) + '</td></tr>' +
        '<tr><td><strong>Mean (Average)</strong></td><td>' + formatRupiah(s.averageIncome) + '</td><td>' + formatRupiah(s.averageExpense) + '</td></tr>' +
        '<tr><td><strong>Median</strong></td><td>' + formatRupiah(s.medianIncome) + '</td><td>' + formatRupiah(s.medianExpense) + '</td></tr>' +
        '<tr><td><strong>Min</strong></td><td>' + formatRupiah(s.minIncome) + '</td><td>' + formatRupiah(s.minExpense) + '</td></tr>' +
        '<tr><td><strong>Max</strong></td><td>' + formatRupiah(s.maxIncome) + '</td><td>' + formatRupiah(s.maxExpense) + '</td></tr>' +
        '<tr><td><strong>Standard Deviation</strong></td><td>' + formatRupiah(s.stdDevIncome) + '</td><td>' + formatRupiah(s.stdDevExpense) + '</td></tr>' +
        '<tr><td><strong>Net Income</strong></td><td colspan="2" class="' + (s.netIncome>=0?'text-success':'text-danger') + '">' + formatRupiah(s.netIncome) + '</td></tr>' +
        '<tr><td><strong>Expense Ratio</strong></td><td colspan="2">' + s.expenseRatio + '%</td></tr>' +
        '<tr><td><strong>Savings Rate</strong></td><td colspan="2">' + s.savingsRate + '%</td></tr>' +
        '<tr><td><strong>Avg Daily Expense</strong></td><td colspan="2">' + formatRupiah(s.averageDailyExpense) + '</td></tr>' +
        '<tr><td><strong>Active Days</strong></td><td colspan="2">' + s.activeDays + '</td></tr>' +
    '</tbody></table></div></div>';

    // KPI Summary Cards
    html += '<div class="kpi-grid">' +
        kpiCard('Net Income', formatRupiah(s.netIncome), s.netIncome>=0?'income':'expense') +
        kpiCard('Expense Ratio', s.expenseRatio + '%', 'expense') +
        kpiCard('Savings Rate', s.savingsRate + '%', 'balance') +
        kpiCard('Std Dev (Exp)', formatRupiah(s.stdDevExpense), 'balance') +
    '</div>';

    // Top 10
    html += '<div class="card"><div class="card-header"><h3>Top 10 Largest Transactions</h3></div><div id="topTable"></div></div>';

    // Bottom 10
    html += '<div class="card"><div class="card-header"><h3>Bottom 10 Smallest Transactions</h3></div><div id="bottomTable"></div></div>';

    // Top 10 Users by Expense
    html += '<div class="card"><div class="card-header"><h3>Top 10 Users by Expense</h3></div><div id="topUsersTable"></div></div>';

    container.innerHTML = html;

    // Render tables
    renderTable(d.top10, 'topTable');
    renderTable(d.bottom10, 'bottomTable');
    renderTopUsersTable(d.topUsersByExpense, 'topUsersTable');
}

function renderTable(items, containerId) {
    var container = document.getElementById(containerId);
    if (!items || items.length === 0) { container.innerHTML = emptyStateHtml('No data'); return; }
    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
        '<th>Rank</th><th>Type</th><th>Amount</th><th>Description</th><th>Category</th><th>User</th><th>Date</th>' +
        '</tr></thead><tbody>';
    items.forEach(function(t, i) {
        html += '<tr>' +
            '<td>' + (i+1) + '</td>' +
            '<td><span class="badge ' + (t.type==='Income'?'badge-success':'badge-danger') + '">' + t.type + '</span></td>' +
            '<td class="' + (t.type==='Income'?'text-success':'text-danger') + '">' + formatRupiah(t.amount) + '</td>' +
            '<td>' + escapeHtml(t.description) + '</td>' +
            '<td>' + escapeHtml(t.categoryName) + '</td>' +
            '<td>' + escapeHtml(t.userName) + '</td>' +
            '<td>' + formatDate(t.transactionDate) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function renderTopUsersTable(items, containerId) {
    var container = document.getElementById(containerId);
    if (!items || items.length === 0) { container.innerHTML = emptyStateHtml('No data'); return; }
    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
        '<th>Rank</th><th>Name</th><th>Email</th><th>Total Expense</th><th>Count</th>' +
        '</tr></thead><tbody>';
    items.forEach(function(u, i) {
        html += '<tr>' +
            '<td>' + (i+1) + '</td>' +
            '<td><a href="admin-user-detail.html?id=' + u.id + '" style="color:var(--primary);">' + escapeHtml(u.name) + '</a></td>' +
            '<td>' + escapeHtml(u.email) + '</td>' +
            '<td class="text-danger">' + formatRupiah(u.totalExpense) + '</td>' +
            '<td>' + u.count + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    renderRangeFilter();
    loadAnalysis();
});
