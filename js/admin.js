/* ============================================================
   ADMIN.JS — Admin Executive Dashboard (Main Admin Page)
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin');
initSidebarMobile();
initThemeToggle();

var adminState = {
    categories: { Income: [], Expense: [] },
    range: 'this_month',
    dateFrom: '',
    dateTo: ''
};

/* === DATE RANGE FILTER === */
function renderRangeFilter() {
    var container = document.getElementById('rangeFilter');
    if (!container) return;
    var ranges = [
        { key: 'today', label: 'Today' },
        { key: '7days', label: '7 Days' },
        { key: '30days', label: '30 Days' },
        { key: 'this_month', label: 'This Month' },
        { key: 'last_month', label: 'Last Month' },
        { key: 'this_year', label: 'This Year' },
        { key: 'custom', label: 'Custom' }
    ];
    var html = '';
    ranges.forEach(function(r) {
        html += '<button class="range-btn' + (adminState.range === r.key ? ' active' : '') + '" data-range="' + r.key + '">' + r.label + '</button>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.range-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            adminState.range = this.dataset.range;
            renderRangeFilter();
            if (adminState.range === 'custom') {
                document.getElementById('customDateWrap').style.display = 'flex';
            } else {
                document.getElementById('customDateWrap').style.display = 'none';
                loadDashboard();
            }
        });
    });
}

/* === LOAD DASHBOARD === */
async function loadDashboard() {
    var container = document.getElementById('adminDashboardContent');
    if (container) container.innerHTML = loadingHtml('Loading dashboard data...');

    var filters = { range: adminState.range };
    if (adminState.range === 'custom') {
        filters.dateFrom = document.getElementById('rangeDateFrom') ? document.getElementById('rangeDateFrom').value : '';
        filters.dateTo = document.getElementById('rangeDateTo') ? document.getElementById('rangeDateTo').value : '';
    }

    var result = await AdminAPI.getDashboard(filters);
    if (!result.ok) {
        if (container) container.innerHTML = errorStateHtml('Failed to load dashboard data');
        showToast('Failed to load dashboard', 'error');
        return;
    }

    var d = result.data.data;
    renderKPIs(d);
    renderAdminCharts(d.charts);
    renderRecentActivity(d.recentActivity);
    renderInsightsCard();
}

function renderKPIs(d) {
    var html = '<div class="kpi-grid">';

    // Users
    html += kpiCard('Total Users', d.totalUsers, 'users');
    html += kpiCard('Active Users', d.activeUsers, 'count');
    html += kpiCard('Inactive Users', d.inactiveUsers, 'warning');
    html += kpiCard('New This Month', d.newUsersThisMonth, 'users');

    // Transactions
    html += kpiCard('Total Transactions', d.totalTransactions, 'count');
    html += kpiCard('Transactions Today', d.transactionsToday, 'count');
    html += kpiCard('Transactions This Month', d.transactionsThisMonth, 'count');
    html += kpiCard('Total Categories', d.totalCategories, 'count');

    // Financial
    html += kpiCard('Total Income', formatRupiah(d.totalIncome), 'income', comparisonBadge(d.comparisons.incomeChange));
    html += kpiCard('Total Expense', formatRupiah(d.totalExpense), 'expense', comparisonBadge(d.comparisons.expenseChange));
    html += kpiCard('Net Cash Flow', formatRupiah(d.netCashFlow), d.netCashFlow >= 0 ? 'income' : 'expense');
    html += kpiCard('Avg Transaction', formatRupiah(d.averageTransaction), 'balance');

    html += '</div>';

    var container = document.getElementById('kpiSection');
    if (container) container.innerHTML = html;
}

function kpiCard(label, value, type, comparison) {
    var compHtml = comparison || '';
    return '<div class="kpi-card ' + type + '">' +
        '<p class="kpi-label">' + escapeHtml(label) + '</p>' +
        '<h3 class="kpi-value">' + value + '</h3>' +
        compHtml +
        '</div>';
}

function comparisonBadge(change) {
    if (change === 0 || isNaN(change)) return '<span class="kpi-comparison neutral">0%</span>';
    var cls = change > 0 ? 'up' : 'down';
    var arrow = change > 0 ? '\u2191' : '\u2193';
    return '<span class="kpi-comparison ' + cls + '"><i>' + arrow + '</i> ' + Math.abs(change) + '%</span>';
}

/* === ADMIN CHARTS === */
function renderAdminCharts(charts) {
    renderIncomeVsExpenseChart('adminIncomeExpenseChart', charts.incomeVsExpense);
    renderExpenseCategoryChart('adminExpenseCatChart', charts.expenseByCategory);
    renderUsersGrowthChart('adminUsersGrowthChart', charts.usersGrowth);
    renderTrxPerMonthChart('adminTrxPerMonthChart', charts.transactionsPerMonth);
    renderIncomeCategoryChart('adminIncomeCatChart', charts.incomeByCategory);
    renderDailyTransactionsChart('adminDailyTrxChart', charts.dailyTransactions);
    renderMonthlyTrendChart('adminMonthlyTrendChart', charts.monthlyTrend);
    renderNetCashFlowChart('adminNetCashChart', charts.monthlyTrend);
}

// Override chart functions for admin page
function renderIncomeVsExpenseChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(canvasId);
    if (!data || data.length === 0) { renderEmptyChart(canvasId, 'No data available'); return; }
    var cc = getChartColors();
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: data.map(function(d) { return formatMonthLabel(d.month); }),
            datasets: [
                { label: 'Income', data: data.map(function(d) { return d.income; }), backgroundColor: '#10b981' },
                { label: 'Expense', data: data.map(function(d) { return d.expense; }), backgroundColor: '#ef4444' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: cc.text } } },
            scales: {
                y: { beginAtZero: true, ticks: { color: cc.text, callback: function(v) { return formatRupiahShort(v); } }, grid: { color: cc.grid } },
                x: { ticks: { color: cc.text }, grid: { color: cc.grid } }
            }
        }
    });
}

function renderUsersGrowthChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(canvasId);
    if (!data || data.length === 0) { renderEmptyChart(canvasId, 'No user growth data'); return; }
    var cc = getChartColors();
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: data.map(function(d) { return formatMonthLabel(d.month); }),
            datasets: [{ label: 'New Users', data: data.map(function(d) { return d.newUsers; }), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, tension: 0.3 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: cc.text, stepSize: 1 }, grid: { color: cc.grid } },
                x: { ticks: { color: cc.text }, grid: { color: cc.grid } }
            }
        }
    });
}

function renderTrxPerMonthChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(canvasId);
    if (!data || data.length === 0) { renderEmptyChart(canvasId, 'No data'); return; }
    var cc = getChartColors();
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: data.map(function(d) { return formatMonthLabel(d.month); }),
            datasets: [{ label: 'Transactions', data: data.map(function(d) { return d.count; }), backgroundColor: '#6366f1' }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: cc.text, stepSize: 1 }, grid: { color: cc.grid } },
                x: { ticks: { color: cc.text }, grid: { color: cc.grid } }
            }
        }
    });
}

function renderIncomeCategoryChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(canvasId);
    if (!data || data.length === 0) { renderEmptyChart(canvasId, 'No income data'); return; }
    var colors = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ec4899','#14b8a6','#6366f1','#f97316','#06b6d4','#84cc16'];
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: data.map(function(d) { return d.name; }),
            datasets: [{ data: data.map(function(d) { return d.total; }), backgroundColor: colors }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: getChartColors().text } },
                tooltip: { callbacks: { label: function(ctx) { return ctx.label + ': ' + formatRupiah(ctx.raw); } } }
            }
        }
    });
}

function renderDailyTransactionsChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(canvasId);
    if (!data || data.length === 0) { renderEmptyChart(canvasId, 'No daily data'); return; }
    var cc = getChartColors();
    chartInstances[canvasId] = new Chart(canvas, {
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
            scales: {
                y: { beginAtZero: true, ticks: { color: cc.text, callback: function(v) { return formatRupiahShort(v); } }, grid: { color: cc.grid } },
                x: { ticks: { color: cc.text, maxRotation: 45 }, grid: { color: cc.grid } }
            }
        }
    });
}

function renderMonthlyTrendChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(canvasId);
    if (!data || data.length === 0) { renderEmptyChart(canvasId, 'No trend data'); return; }
    var cc = getChartColors();
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: data.map(function(d) { return formatMonthLabel(d.month); }),
            datasets: [
                { label: 'Income', data: data.map(function(d) { return d.income; }), backgroundColor: '#10b981' },
                { label: 'Expense', data: data.map(function(d) { return d.expense; }), backgroundColor: '#ef4444' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: cc.text } } },
            scales: {
                y: { beginAtZero: true, ticks: { color: cc.text, callback: function(v) { return formatRupiahShort(v); } }, grid: { color: cc.grid } },
                x: { ticks: { color: cc.text }, grid: { color: cc.grid } }
            }
        }
    });
}

function renderNetCashFlowChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(canvasId);
    if (!data || data.length === 0) { renderEmptyChart(canvasId, 'No data'); return; }
    var cc = getChartColors();
    var netData = data.map(function(d) { return d.income - d.expense; });
    var bgColors = netData.map(function(v) { return v >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'; });
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: data.map(function(d) { return formatMonthLabel(d.month); }),
            datasets: [{ label: 'Net Cash Flow', data: netData, backgroundColor: bgColors }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { color: cc.text, callback: function(v) { return formatRupiahShort(v); } }, grid: { color: cc.grid } },
                x: { ticks: { color: cc.text }, grid: { color: cc.grid } }
            }
        }
    });
}

function renderRecentActivity(logs) {
    var container = document.getElementById('recentActivityTable');
    if (!container) return;
    if (!logs || logs.length === 0) {
        container.innerHTML = emptyStateHtml('No recent activity');
        return;
    }
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Time</th><th>User</th><th>Action</th><th>Description</th>' +
        '</tr></thead><tbody>';
    logs.forEach(function(l) {
        html += '<tr>' +
            '<td>' + formatDateTime(l.createdAt) + '</td>' +
            '<td>' + escapeHtml(l.userName || '-') + '</td>' +
            '<td><span class="badge badge-info">' + l.action + '</span></td>' +
            '<td>' + escapeHtml(l.description) + '</td>' +
            '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

/* === INSIGHTS === */
async function renderInsightsCard() {
    var container = document.getElementById('insightsContainer');
    if (!container) return;

    var result = await AdminAPI.getInsights();
    if (!result.ok) { container.innerHTML = ''; return; }

    var insights = result.data.data.insights;
    if (!insights || insights.length === 0) {
        container.innerHTML = '<div class="insight-card"><p class="insight-title">No insights available</p><p class="insight-message">Not enough data to generate insights.</p></div>';
        return;
    }

    var html = '';
    insights.forEach(function(ins) {
        var cls = 'insight-card';
        if (ins.type === 'INCOME_TREND' || ins.type === 'SAVINGS_RATE') {
            cls += ins.message.indexOf('increased') !== -1 || ins.message.indexOf('excellent') !== -1 || ins.message.indexOf('Healthy') !== -1 ? ' positive' : '';
            cls += ins.message.indexOf('decreased') !== -1 || ins.message.indexOf('Low') !== -1 || ins.message.indexOf('Negative') !== -1 ? ' negative' : '';
        }
        if (ins.type === 'EXPENSE_TREND' && ins.message.indexOf('increased') !== -1) cls += ' negative';
        if (ins.type === 'EXPENSE_TREND' && ins.message.indexOf('decreased') !== -1) cls += ' positive';
        html += '<div class="' + cls + '">' +
            '<p class="insight-title">' + escapeHtml(ins.title) + '</p>' +
            '<p class="insight-message">' + escapeHtml(ins.message) + '</p>' +
            '</div>';
    });
    container.innerHTML = html;
}

/* === QUICK STATS ROW === */
async function loadQuickStats() {
    // Quick navigation cards on admin page
    var result = await AdminAPI.getDashboard({ range: 'this_year' });
    if (!result.ok) return;
    var d = result.data.data;

    var container = document.getElementById('quickStats');
    if (!container) return;

    var html = '<div class="cards-grid">' +
        '<div class="card card-income"><p class="card-label">YTD Income</p><h3 class="card-value">' + formatRupiah(d.totalIncome) + '</h3></div>' +
        '<div class="card card-expense"><p class="card-label">YTD Expense</p><h3 class="card-value">' + formatRupiah(d.totalExpense) + '</h3></div>' +
        '<div class="card card-balance"><p class="card-label">YTD Net</p><h3 class="card-value">' + formatRupiah(d.netCashFlow) + '</h3></div>' +
        '<div class="card card-count"><p class="card-label">YTD Transactions</p><h3 class="card-value">' + d.totalTransactions + '</h3></div>' +
        '</div>';
    container.innerHTML = html;
}

/* === INIT === */
document.addEventListener('DOMContentLoaded', async function() {
    renderRangeFilter();
    await loadQuickStats();

    // Custom date apply
    var dateApply = document.getElementById('dateApplyBtn');
    if (dateApply) {
        dateApply.addEventListener('click', function() {
            adminState.dateFrom = document.getElementById('rangeDateFrom').value;
            adminState.dateTo = document.getElementById('rangeDateTo').value;
            loadDashboard();
        });
    }

    await loadDashboard();
});
