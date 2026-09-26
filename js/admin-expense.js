/* ============================================================
   ADMIN-EXPENSE.JS — Expense Analytics
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-expense');
initSidebarMobile();
initThemeToggle();

var expState = { range: 'this_year' };

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
        html += '<button class="range-btn' + (expState.range === r.key ? ' active' : '') + '" data-range="' + r.key + '">' + r.label + '</button>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.range-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            expState.range = this.dataset.range;
            renderRangeFilter();
            loadExpense();
        });
    });
}

async function loadExpense() {
    var container = document.getElementById('expenseContent');
    container.innerHTML = '<div class="loading-state">Loading expense analytics...</div>';

    var result = await AdminAPI.getExpenseAnalytics({ range: expState.range });
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to load'); return; }

    var d = result.data.data;
    var s = d.summary;

    var html = '';

    // Summary KPIs
    html += '<div class="kpi-grid">' +
        kpiCard('Total Expense', formatRupiah(s.total), 'expense') +
        kpiCard('Average', formatRupiah(s.average), 'balance') +
        kpiCard('Minimum', formatRupiah(s.min), 'expense') +
        kpiCard('Maximum', formatRupiah(s.max), 'expense') +
        kpiCard('Count', s.count, 'count') +
    '</div>';

    // Charts
    html += '<div class="chart-grid-2">' +
        '<div class="card"><div class="card-header"><h3>Expense by Category</h3></div>' +
        '<div class="chart-container" style="height:300px;"><canvas id="expCatChart"></canvas></div></div>' +
        '<div class="card"><div class="card-header"><h3>Expense Trend (Monthly)</h3></div>' +
        '<div class="chart-container" style="height:300px;"><canvas id="expTrendChart"></canvas></div></div>' +
    '</div>';

    // Day of week chart
    html += '<div class="card"><div class="card-header"><h3>Expense by Day of Week</h3></div>' +
        '<div class="chart-container" style="height:280px;"><canvas id="expDowChart"></canvas></div></div>';

    // Top 10 expense users
    html += '<div class="card"><div class="card-header"><h3>Top 10 Users by Expense</h3></div><div id="topUsersTable"></div></div>';

    // Largest expenses
    html += '<div class="card"><div class="card-header"><h3>Top 10 Largest Expenses</h3></div><div id="largestTable"></div></div>';

    // Category breakdown table
    html += '<div class="card"><div class="card-header"><h3>Expense by Category (Detailed)</h3></div><div id="catTable"></div></div>';

    container.innerHTML = html;

    // Render charts
    renderCategoryPieChart('expCatChart', d.byCategory);
    renderExpenseTrendChart('expTrendChart', d.byMonth);
    renderDayOfWeekChart('expDowChart', d.byDayOfWeek);

    // Render tables
    renderTopUsersTable(d.byUser, 'topUsersTable');
    renderLargestTable(d.largest, 'largestTable');
    renderCatTable(d.byCategory, 'catTable');
}

function renderCategoryPieChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (!data || data.length === 0) { renderEmptyChart(canvasId, 'No data'); return; }
    var colors = ['#ef4444','#3b82f6','#8b5cf6','#f59e0b','#ec4899','#14b8a6','#6366f1','#f97316','#06b6d4','#84cc16'];
    destroyChart(canvasId);
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'doughnut',
        data: { labels: data.map(function(d) { return d.name; }), datasets: [{ data: data.map(function(d) { return d.total; }), backgroundColor: colors }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: getChartColors().text } }, tooltip: { callbacks: { label: function(ctx) { return ctx.label + ': ' + formatRupiah(ctx.raw); } } } }
        }
    });
}

function renderExpenseTrendChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (!data || data.length === 0) { renderEmptyChart(canvasId, 'No data'); return; }
    var cc = getChartColors();
    destroyChart(canvasId);
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: data.map(function(d) { return formatMonthLabel(d.month); }),
            datasets: [{ label: 'Expense', data: data.map(function(d) { return d.total; }), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: cc.text } } },
            scales: { y: { beginAtZero: true, ticks: { color: cc.text, callback: function(v) { return formatRupiahShort(v); } }, grid: { color: cc.grid } }, x: { ticks: { color: cc.text }, grid: { color: cc.grid } } }
        }
    });
}

function renderDayOfWeekChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (!data || data.length === 0) { renderEmptyChart(canvasId, 'No data'); return; }
    var days = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var cc = getChartColors();
    destroyChart(canvasId);
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: data.map(function(d) { return days[d.day] || ''; }),
            datasets: [{ label: 'Expense', data: data.map(function(d) { return d.total; }), backgroundColor: '#ef4444' }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { color: cc.text, callback: function(v) { return formatRupiahShort(v); } }, grid: { color: cc.grid } }, x: { ticks: { color: cc.text }, grid: { color: cc.grid } } }
        }
    });
}

function renderTopUsersTable(items, containerId) {
    var container = document.getElementById(containerId);
    if (!items || items.length === 0) { container.innerHTML = emptyStateHtml('No data'); return; }
    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Rank</th><th>Name</th><th>Email</th><th>Total Expense</th><th>Count</th></tr></thead><tbody>';
    items.forEach(function(u, i) {
        html += '<tr><td>' + (i+1) + '</td><td><a href="admin-user-detail.html?id=' + u.id + '" style="color:var(--primary);">' + escapeHtml(u.name) + '</a></td><td>' + escapeHtml(u.email) + '</td><td class="text-danger">' + formatRupiah(u.total) + '</td><td>' + u.count + '</td></tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function renderLargestTable(items, containerId) {
    var container = document.getElementById(containerId);
    if (!items || items.length === 0) { container.innerHTML = emptyStateHtml('No data'); return; }
    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Amount</th><th>Description</th><th>Category</th><th>User</th><th>Date</th></tr></thead><tbody>';
    items.forEach(function(t) {
        html += '<tr><td class="text-danger">' + formatRupiah(t.amount) + '</td><td>' + escapeHtml(t.description) + '</td><td>' + escapeHtml(t.categoryName) + '</td><td>' + escapeHtml(t.userName) + '</td><td>' + formatDate(t.transactionDate) + '</td></tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function renderCatTable(items, containerId) {
    var container = document.getElementById(containerId);
    if (!items || items.length === 0) { container.innerHTML = emptyStateHtml('No data'); return; }
    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Category</th><th>Total</th><th>Count</th><th>Avg per Transaction</th></tr></thead><tbody>';
    items.forEach(function(c) {
        html += '<tr><td>' + escapeHtml(c.name) + '</td><td class="text-danger">' + formatRupiah(c.total) + '</td><td>' + c.count + '</td><td>' + formatRupiah(c.count > 0 ? c.total / c.count : 0) + '</td></tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    renderRangeFilter();
    loadExpense();
});
