/* ============================================================
   CHARTS.JS — Chart.js Chart Rendering Functions
   ============================================================ */

var chartInstances = {};

function getChartColors() {
    var style = getComputedStyle(document.documentElement);
    return {
        text: style.getPropertyValue('--text').trim() || '#1f2937',
        grid: style.getPropertyValue('--border').trim() || '#e5e7eb'
    };
}

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

function renderEmptyChart(canvasId, message) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var rect = canvas.getBoundingClientRect();
    ctx.fillText(message, rect.width / 2, rect.height / 2);
}

// Income vs Expense bar chart
function renderIncomeExpenseChart(canvasId, monthlyTrend) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(canvasId);

    if (!monthlyTrend || monthlyTrend.length === 0) {
        renderEmptyChart(canvasId, 'No data available');
        return;
    }

    var cc = getChartColors();
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: monthlyTrend.map(function(m) { return formatMonthLabel(m.month); }),
            datasets: [
                { label: 'Income', data: monthlyTrend.map(function(m) { return m.income; }), backgroundColor: '#10b981' },
                { label: 'Expense', data: monthlyTrend.map(function(m) { return m.expense; }), backgroundColor: '#ef4444' }
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

// Expense by Category doughnut chart
function renderExpenseCategoryChart(canvasId, expenseByCategory) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(canvasId);

    if (!expenseByCategory || expenseByCategory.length === 0) {
        renderEmptyChart(canvasId, 'No expense data');
        return;
    }

    var colors = ['#ef4444','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#6366f1','#f97316','#06b6d4','#84cc16'];
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: expenseByCategory.map(function(c) { return c.name; }),
            datasets: [{ data: expenseByCategory.map(function(c) { return c.total; }), backgroundColor: colors }]
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

// Monthly cash flow line chart
function renderCashFlowChart(canvasId, monthlyTrend) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(canvasId);

    if (!monthlyTrend || monthlyTrend.length === 0) {
        renderEmptyChart(canvasId, 'No data available');
        return;
    }

    var cc = getChartColors();
    var labels = monthlyTrend.map(function(m) { return formatMonthLabel(m.month); });
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Income', data: monthlyTrend.map(function(m) { return m.income; }), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3 },
                { label: 'Expense', data: monthlyTrend.map(function(m) { return m.expense; }), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3 }
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

// Transaction trend bar chart
function renderTransactionTrendChart(canvasId, monthlyTrend) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(canvasId);

    if (!monthlyTrend || monthlyTrend.length === 0) {
        renderEmptyChart(canvasId, 'No data available');
        return;
    }

    var cc = getChartColors();
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: monthlyTrend.map(function(m) { return formatMonthLabel(m.month); }),
            datasets: [{ label: 'Transactions', data: monthlyTrend.map(function(m) { return m.count; }), backgroundColor: '#6366f1' }]
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

// Helper: format month label
function formatMonthLabel(monthStr) {
    if (!monthStr) return '';
    var parts = monthStr.split('-');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[parseInt(parts[1]) - 1] + ' ' + parts[0];
}

// Helper: format rupiah short for chart axes
function formatRupiahShort(v) {
    if (v >= 1000000) return 'Rp ' + (v / 1000000).toFixed(1) + 'jt';
    if (v >= 1000) return 'Rp ' + (v / 1000).toFixed(0) + 'k';
    return 'Rp ' + v;
}

// Admin activity chart
function renderActivityChart(canvasId, activity) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(canvasId);

    if (!activity || activity.length === 0) {
        renderEmptyChart(canvasId, 'No activity data');
        return;
    }

    var cc = getChartColors();
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: activity.map(function(a) { return formatMonthLabel(a.month); }),
            datasets: [{ label: 'Transactions', data: activity.map(function(a) { return a.count; }), backgroundColor: '#4f46e5' }]
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
