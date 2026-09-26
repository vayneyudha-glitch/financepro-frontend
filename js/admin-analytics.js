/* ============================================================
   ADMIN-ANALYTICS.JS — Financial Analytics Page
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-analytics');
initSidebarMobile();
initThemeToggle();

var analyticsState = { range: 'this_month' };

function renderRangeFilter() {
    var container = document.getElementById('rangeFilter');
    if (!container) return;
    var ranges = [
        { key: 'this_month', label: 'This Month' },
        { key: 'last_month', label: 'Last Month' },
        { key: 'this_year', label: 'This Year' },
        { key: '7days', label: '7 Days' },
        { key: '30days', label: '30 Days' }
    ];
    var html = '';
    ranges.forEach(function(r) {
        html += '<button class="range-btn' + (analyticsState.range === r.key ? ' active' : '') + '" data-range="' + r.key + '">' + r.label + '</button>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.range-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            analyticsState.range = this.dataset.range;
            renderRangeFilter();
            loadAnalytics();
        });
    });
}

async function loadAnalytics() {
    var container = document.getElementById('analyticsContent');
    if (container) container.innerHTML = '<div class="loading-state">Loading analytics...</div>';

    var result = await AdminAPI.getAnalytics({ range: analyticsState.range });
    if (!result.ok) {
        container.innerHTML = errorStateHtml('Failed to load analytics');
        return;
    }

    var d = result.data.data;
    var s = d.summary;

    var html = '';

    // KPI Cards
    html += '<div class="kpi-grid">' +
        kpiCard('Total Income', formatRupiah(s.totalIncome), 'income') +
        kpiCard('Total Expense', formatRupiah(s.totalExpense), 'expense') +
        kpiCard('Net Income', formatRupiah(s.netIncome), s.netIncome>=0?'income':'expense') +
        kpiCard('Expense Ratio', s.expenseRatio + '%', 'expense') +
        kpiCard('Savings Rate', s.savingsRate + '%', 'balance') +
        kpiCard('Transaction Count', s.transactionCount, 'count') +
        kpiCard('Avg Income', formatRupiah(s.averageIncome), 'income') +
        kpiCard('Avg Expense', formatRupiah(s.averageExpense), 'expense') +
        kpiCard('Median Income', formatRupiah(s.medianIncome), 'income') +
        kpiCard('Median Expense', formatRupiah(s.medianExpense), 'expense') +
        kpiCard('Min Income', formatRupiah(s.minIncome), 'income') +
        kpiCard('Max Income', formatRupiah(s.maxIncome), 'income') +
        kpiCard('Min Expense', formatRupiah(s.minExpense), 'expense') +
        kpiCard('Max Expense', formatRupiah(s.maxExpense), 'expense') +
        kpiCard('Std Dev Income', formatRupiah(s.stdDevIncome), 'balance') +
        kpiCard('Std Dev Expense', formatRupiah(s.stdDevExpense), 'balance') +
    '</div>';

    // Top 10 Largest Transactions
    html += '<div class="card"><div class="card-header"><h3>Top 10 Largest Transactions</h3></div><div id="top10Table"></div></div>';

    // Top 10 Users by Expense
    html += '<div class="card"><div class="card-header"><h3>Top 10 Users by Expense</h3></div><div id="topUsersTable"></div></div>';

    // Bottom 10 Smallest Transactions
    html += '<div class="card"><div class="card-header"><h3>Bottom 10 Smallest Transactions</h3></div><div id="bottom10Table"></div></div>';

    container.innerHTML = html;

    // Render tables
    renderTopTable(d.top10, 'top10Table');
    renderTopUsersTable(d.topUsersByExpense, 'topUsersTable');
    renderTopTable(d.bottom10, 'bottom10Table');
}

function renderTopTable(items, containerId) {
    var container = document.getElementById(containerId);
    if (!items || items.length === 0) { container.innerHTML = emptyStateHtml('No data'); return; }
    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
        '<th>ID</th><th>Type</th><th>Amount</th><th>Description</th><th>Category</th><th>User</th><th>Date</th>' +
        '</tr></thead><tbody>';
    items.forEach(function(t) {
        html += '<tr>' +
            '<td>' + t.id + '</td>' +
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
        '<th>Rank</th><th>Name</th><th>Email</th><th>Total Expense</th><th>Transactions</th>' +
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
    loadAnalytics();
});
