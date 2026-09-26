/* ============================================================
   ADMIN-INCOME.JS — Income Analytics
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-income');
initSidebarMobile();
initThemeToggle();

var incomeState = { range: 'this_year' };

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
        html += '<button class="range-btn' + (incomeState.range === r.key ? ' active' : '') + '" data-range="' + r.key + '">' + r.label + '</button>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.range-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            incomeState.range = this.dataset.range;
            renderRangeFilter();
            loadIncome();
        });
    });
}

async function loadIncome() {
    var container = document.getElementById('incomeContent');
    container.innerHTML = '<div class="loading-state">Loading income analytics...</div>';

    var result = await AdminAPI.getIncomeAnalytics({ range: incomeState.range });
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to load'); return; }

    var d = result.data.data;
    var s = d.summary;

    var html = '';

    // Summary KPIs
    html += '<div class="kpi-grid">' +
        kpiCard('Total Income', formatRupiah(s.total), 'income') +
        kpiCard('Average', formatRupiah(s.average), 'balance') +
        kpiCard('Minimum', formatRupiah(s.min), 'income') +
        kpiCard('Maximum', formatRupiah(s.max), 'income') +
        kpiCard('Count', s.count, 'count') +
    '</div>';

    // Charts
    html += '<div class="chart-grid-2">' +
        '<div class="card"><div class="card-header"><h3>Income by Category</h3></div>' +
        '<div class="chart-container" style="height:300px;"><canvas id="incCatChart"></canvas></div></div>' +
        '<div class="card"><div class="card-header"><h3>Income Trend (Monthly)</h3></div>' +
        '<div class="chart-container" style="height:300px;"><canvas id="incTrendChart"></canvas></div></div>' +
    '</div>';

    // Top 10 income users
    html += '<div class="card"><div class="card-header"><h3>Top 10 Users by Income</h3></div><div id="topUsersTable"></div></div>';

    // Category breakdown table
    html += '<div class="card"><div class="card-header"><h3>Income by Category (Detailed)</h3></div><div id="catTable"></div></div>';

    container.innerHTML = html;

    // Render charts
    renderCategoryPieChart('incCatChart', d.byCategory);
    renderIncomeTrendChart('incTrendChart', d.byMonth);

    // Render tables
    renderTopUsersTable(d.byUser, 'topUsersTable');
    renderCatTable(d.byCategory, 'catTable');
}

function renderCategoryPieChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (!data || data.length === 0) { renderEmptyChart(canvasId, 'No data'); return; }
    var colors = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ec4899','#14b8a6','#6366f1','#f97316','#06b6d4','#84cc16'];
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

function renderIncomeTrendChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (!data || data.length === 0) { renderEmptyChart(canvasId, 'No data'); return; }
    var cc = getChartColors();
    destroyChart(canvasId);
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: data.map(function(d) { return formatMonthLabel(d.month); }),
            datasets: [{ label: 'Income', data: data.map(function(d) { return d.total; }), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: cc.text } } },
            scales: { y: { beginAtZero: true, ticks: { color: cc.text, callback: function(v) { return formatRupiahShort(v); } }, grid: { color: cc.grid } }, x: { ticks: { color: cc.text }, grid: { color: cc.grid } } }
        }
    });
}

function renderTopUsersTable(items, containerId) {
    var container = document.getElementById(containerId);
    if (!items || items.length === 0) { container.innerHTML = emptyStateHtml('No data'); return; }
    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Rank</th><th>Name</th><th>Email</th><th>Total Income</th><th>Count</th></tr></thead><tbody>';
    items.forEach(function(u, i) {
        html += '<tr><td>' + (i+1) + '</td><td><a href="admin-user-detail.html?id=' + u.id + '" style="color:var(--primary);">' + escapeHtml(u.name) + '</a></td><td>' + escapeHtml(u.email) + '</td><td class="text-success">' + formatRupiah(u.total) + '</td><td>' + u.count + '</td></tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function renderCatTable(items, containerId) {
    var container = document.getElementById(containerId);
    if (!items || items.length === 0) { container.innerHTML = emptyStateHtml('No data'); return; }
    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Category</th><th>Total</th><th>Count</th><th>Avg per Transaction</th></tr></thead><tbody>';
    items.forEach(function(c) {
        html += '<tr><td>' + escapeHtml(c.name) + '</td><td class="text-success">' + formatRupiah(c.total) + '</td><td>' + c.count + '</td><td>' + formatRupiah(c.count > 0 ? c.total / c.count : 0) + '</td></tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    renderRangeFilter();
    loadIncome();
});
