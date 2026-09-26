/* ============================================================
   ADMIN-USER-DETAIL.JS — User 360° View
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-users');
initSidebarMobile();
initThemeToggle();

var userId = new URLSearchParams(window.location.search).get('id');

async function loadUserDetail() {
    var container = document.getElementById('userDetailContent');
    if (!userId) {
        container.innerHTML = errorStateHtml('No user ID specified');
        return;
    }

    var result = await AdminAPI.getUser(userId);
    if (!result.ok) {
        container.innerHTML = errorStateHtml('Failed to load user data');
        return;
    }

    var d = result.data.data;
    var p = d.profile;
    var f = d.financialSummary;

    var html = '';

    // Profile Card
    html += '<div class="card"><div class="card-header"><h3>User Profile</h3></div><div class="card-body">' +
        '<div class="profile-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
            '<div><strong>Name:</strong> ' + escapeHtml(p.name) + '</div>' +
            '<div><strong>Email:</strong> ' + escapeHtml(p.email) + '</div>' +
            '<div><strong>Phone:</strong> ' + escapeHtml(p.phone || '-') + '</div>' +
            '<div><strong>Role:</strong> <span class="badge role-' + p.role.toLowerCase() + '">' + p.role + '</span></div>' +
            '<div><strong>Status:</strong> <span class="badge ' + (p.status==='ACTIVE'?'badge-success':'badge-danger') + '">' + p.status + '</span></div>' +
            '<div><strong>Registered:</strong> ' + formatDate(p.createdAt) + '</div>' +
            '<div><strong>Last Updated:</strong> ' + formatDateTime(p.updatedAt) + '</div>' +
        '</div></div></div>';

    // Financial Summary KPIs
    html += '<div class="kpi-grid">' +
        kpiCard('Total Income', formatRupiah(f.totalIncome), 'income') +
        kpiCard('Total Expense', formatRupiah(f.totalExpense), 'expense') +
        kpiCard('Net Balance', formatRupiah(f.netBalance), f.netBalance>=0?'income':'expense') +
        kpiCard('Transactions', f.transactionCount, 'count') +
        kpiCard('Avg Transaction', formatRupiah(f.averageTransaction), 'balance') +
        kpiCard('Largest Income', formatRupiah(f.largestIncome), 'income') +
        kpiCard('Largest Expense', formatRupiah(f.largestExpense), 'expense') +
        kpiCard('', '', '') +
    '</div>';

    // Charts
    html += '<div class="chart-grid-2">' +
        '<div class="card"><div class="card-header"><h3>Monthly Income vs Expense</h3></div>' +
        '<div class="chart-container" style="height:300px;"><canvas id="userMonthlyChart"></canvas></div></div>' +
        '<div class="card"><div class="card-header"><h3>Expense by Category</h3></div>' +
        '<div class="chart-container" style="height:300px;"><canvas id="userExpCatChart"></canvas></div></div>' +
    '</div>';

    html += '<div class="card"><div class="card-header"><h3>Income by Category</h3></div>' +
        '<div class="chart-container" style="height:300px;"><canvas id="userIncCatChart"></canvas></div></div>';

    // Recent Transactions
    html += '<div class="card"><div class="card-header"><h3>Recent Transactions</h3></div>' +
        '<div id="userTrxTable"></div></div>';

    // Activity
    html += '<div class="card"><div class="card-header"><h3>User Activity</h3></div>' +
        '<div id="userActivityTable"></div></div>';

    container.innerHTML = html;

    // Render charts
    renderUserMonthlyChart(d.charts.monthlyTrend);
    renderUserCategoryChart('userExpCatChart', d.charts.expenseByCategory);
    renderUserCategoryChart('userIncCatChart', d.charts.incomeByCategory);

    // Render tables
    renderUserTrxTable(d.recentTransactions);
    renderUserActivityTable(d.activity);
}

function renderUserMonthlyChart(data) {
    var canvas = document.getElementById('userMonthlyChart');
    if (!canvas) return;
    if (!data || data.length === 0) { renderEmptyChart('userMonthlyChart', 'No data'); return; }
    var cc = getChartColors();
    destroyChart('userMonthlyChart');
    chartInstances['userMonthlyChart'] = new Chart(canvas, {
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

function renderUserCategoryChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (!data || data.length === 0) { renderEmptyChart(canvasId, 'No data'); return; }
    var colors = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ec4899','#14b8a6','#6366f1','#f97316','#06b6d4','#84cc16'];
    destroyChart(canvasId);
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

function renderUserTrxTable(transactions) {
    var container = document.getElementById('userTrxTable');
    if (!transactions || transactions.length === 0) {
        container.innerHTML = emptyStateHtml('No transactions');
        return;
    }
    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
        '<th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Description</th>' +
        '</tr></thead><tbody>';
    transactions.forEach(function(t) {
        html += '<tr>' +
            '<td>' + formatDate(t.transactionDate) + '</td>' +
            '<td><span class="badge ' + (t.type==='Income'?'badge-success':'badge-danger') + '">' + t.type + '</span></td>' +
            '<td>' + escapeHtml(t.categoryName) + '</td>' +
            '<td class="' + (t.type==='Income'?'text-success':'text-danger') + '">' + formatRupiah(t.amount) + '</td>' +
            '<td>' + escapeHtml(t.description) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function renderUserActivityTable(activities) {
    var container = document.getElementById('userActivityTable');
    if (!activities || activities.length === 0) {
        container.innerHTML = emptyStateHtml('No activity');
        return;
    }
    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
        '<th>Time</th><th>Action</th><th>Description</th><th>IP Address</th>' +
        '</tr></thead><tbody>';
    activities.forEach(function(a) {
        html += '<tr>' +
            '<td>' + formatDateTime(a.createdAt) + '</td>' +
            '<td><span class="badge badge-info">' + a.action + '</span></td>' +
            '<td>' + escapeHtml(a.description) + '</td>' +
            '<td>' + escapeHtml(a.ipAddress || '-') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', loadUserDetail);
