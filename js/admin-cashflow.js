/* ============================================================
   ADMIN-CASHFLOW.JS — Cash Flow Analysis
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-cashflow');
initSidebarMobile();
initThemeToggle();

var cfState = { range: 'this_year' };

function renderRangeFilter() {
    var container = document.getElementById('rangeFilter');
    var ranges = [
        { key: 'this_month', label: 'This Month' },
        { key: 'last_month', label: 'Last Month' },
        { key: 'this_year', label: 'This Year' },
        { key: '30days', label: '30 Days' }
    ];
    var html = '';
    ranges.forEach(function(r) {
        html += '<button class="range-btn' + (cfState.range === r.key ? ' active' : '') + '" data-range="' + r.key + '">' + r.label + '</button>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.range-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            cfState.range = this.dataset.range;
            renderRangeFilter();
            loadCashFlow();
        });
    });
}

async function loadCashFlow() {
    var container = document.getElementById('cashflowContent');
    container.innerHTML = '<div class="loading-state">Loading cash flow...</div>';

    var result = await AdminAPI.getCashFlowAnalytics({ range: cfState.range });
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to load'); return; }

    var d = result.data.data;

    var html = '';

    // Cash Flow Summary Cards
    html += '<div class="card"><div class="card-header"><h3>Cash Flow Summary</h3></div><div class="card-body">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">' +
            '<div style="text-align:center;"><p class="kpi-label">Opening Balance</p><h2 class="' + (d.openingBalance>=0?'text-success':'text-danger') + '">' + formatRupiah(d.openingBalance) + '</h2></div>' +
            '<div style="text-align:center;font-size:24px;color:var(--text-light);">+</div>' +
            '<div style="text-align:center;"><p class="kpi-label">Total Income</p><h2 class="text-success">' + formatRupiah(d.totalIncome) + '</h2></div>' +
            '<div style="text-align:center;font-size:24px;color:var(--text-light);">-</div>' +
            '<div style="text-align:center;"><p class="kpi-label">Total Expense</p><h2 class="text-danger">' + formatRupiah(d.totalExpense) + '</h2></div>' +
            '<div style="text-align:center;font-size:24px;color:var(--text-light);">=</div>' +
            '<div style="text-align:center;"><p class="kpi-label">Closing Balance</p><h2 class="' + (d.closingBalance>=0?'text-success':'text-danger') + '">' + formatRupiah(d.closingBalance) + '</h2></div>' +
        '</div></div></div>';

    // Net Cash Flow KPIs
    html += '<div class="kpi-grid">' +
        kpiCard('Net Cash Flow', formatRupiah(d.netCashFlow), d.netCashFlow>=0?'income':'expense') +
        kpiCard('Positive Months', d.positiveCashFlowMonths, 'income') +
        kpiCard('Negative Months', d.negativeCashFlowMonths, 'expense') +
        kpiCard('Opening Balance', formatRupiah(d.openingBalance), 'balance') +
    '</div>';

    // Charts
    html += '<div class="chart-grid-2">' +
        '<div class="card"><div class="card-header"><h3>Monthly Cash Flow</h3></div>' +
        '<div class="chart-container" style="height:350px;"><canvas id="cfMonthlyChart"></canvas></div></div>' +
        '<div class="card"><div class="card-header"><h3>Daily Cash Flow (30 days)</h3></div>' +
        '<div class="chart-container" style="height:350px;"><canvas id="cfDailyChart"></canvas></div></div>' +
    '</div>';

    // Monthly breakdown table
    html += '<div class="card"><div class="card-header"><h3>Monthly Breakdown</h3></div><div id="monthlyTable"></div></div>';

    container.innerHTML = html;

    // Render charts
    renderMonthlyCashFlowChart(d.monthly);
    renderDailyCashFlowChart(d.daily);

    // Render table
    renderMonthlyTable(d.monthly);
}

function renderMonthlyCashFlowChart(data) {
    var canvas = document.getElementById('cfMonthlyChart');
    if (!canvas) return;
    if (!data || data.length === 0) { renderEmptyChart('cfMonthlyChart', 'No data'); return; }
    var cc = getChartColors();
    destroyChart('cfMonthlyChart');
    chartInstances['cfMonthlyChart'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: data.map(function(d) { return formatMonthLabel(d.month); }),
            datasets: [
                { label: 'Income', data: data.map(function(d) { return d.income; }), backgroundColor: '#10b981' },
                { label: 'Expense', data: data.map(function(d) { return d.expense; }), backgroundColor: '#ef4444' },
                { label: 'Net', data: data.map(function(d) { return d.net; }), type: 'line', borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', tension: 0.3 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: cc.text } } },
            scales: { y: { beginAtZero: true, ticks: { color: cc.text, callback: function(v) { return formatRupiahShort(v); } }, grid: { color: cc.grid } }, x: { ticks: { color: cc.text }, grid: { color: cc.grid } } }
        }
    });
}

function renderDailyCashFlowChart(data) {
    var canvas = document.getElementById('cfDailyChart');
    if (!canvas) return;
    if (!data || data.length === 0) { renderEmptyChart('cfDailyChart', 'No data'); return; }
    var cc = getChartColors();
    destroyChart('cfDailyChart');
    chartInstances['cfDailyChart'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: data.map(function(d) { return d.date; }),
            datasets: [
                { label: 'Income', data: data.map(function(d) { return d.income; }), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.3 },
                { label: 'Expense', data: data.map(function(d) { return d.expense; }), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.3 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: cc.text } } },
            scales: { y: { beginAtZero: true, ticks: { color: cc.text, callback: function(v) { return formatRupiahShort(v); } }, grid: { color: cc.grid } }, x: { ticks: { color: cc.text, maxRotation: 45 }, grid: { color: cc.grid } } }
        }
    });
}

function renderMonthlyTable(data) {
    var container = document.getElementById('monthlyTable');
    if (!data || data.length === 0) { container.innerHTML = emptyStateHtml('No data'); return; }
    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Month</th><th>Income</th><th>Expense</th><th>Net</th><th>Status</th></tr></thead><tbody>';
    data.forEach(function(m) {
        var status = m.net >= 0 ? '<span class="badge badge-success">Positive</span>' : '<span class="badge badge-danger">Negative</span>';
        html += '<tr><td>' + formatMonthLabel(m.month) + '</td><td class="text-success">' + formatRupiah(m.income) + '</td><td class="text-danger">' + formatRupiah(m.expense) + '</td><td class="' + (m.net>=0?'text-success':'text-danger') + '">' + formatRupiah(m.net) + '</td><td>' + status + '</td></tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    renderRangeFilter();
    loadCashFlow();
});
