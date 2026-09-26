/* ============================================================
   ADMIN-FORECAST.JS — Financial Forecasting
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-forecast');
initSidebarMobile();
initThemeToggle();

async function loadForecast() {
    var container = document.getElementById('forecastContent');
    container.innerHTML = '<div class="loading-state">Loading forecast...</div>';

    var months = document.getElementById('forecastMonths').value;
    var result = await AdminAPI.getForecast(months);
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to load forecast'); return; }

    var d = result.data.data;

    if (d.forecast.length === 0) {
        container.innerHTML = '<div class="card"><div class="card-body">' + emptyStateHtml(d.message || 'Not enough data for forecasting') + '</div></div>';
        return;
    }

    var html = '';

    // Forecast KPIs
    var last = d.forecast[d.forecast.length - 1];
    html += '<div class="kpi-grid">' +
        kpiCard('Forecast Month', last.month, 'count') +
        kpiCard('Forecast Income', formatRupiah(last.incomeForecast), 'income') +
        kpiCard('Forecast Expense', formatRupiah(last.expenseForecast), 'expense') +
        kpiCard('Forecast Net', formatRupiah(last.netForecast), last.netForecast>=0?'income':'expense') +
        kpiCard('Confidence', last.incomeConfidence + '%', 'balance') +
    '</div>';

    // Chart
    html += '<div class="card"><div class="card-header"><h3>Historical Data & Forecast</h3></div>' +
        '<div class="chart-container" style="height:400px;"><canvas id="forecastChart"></canvas></div></div>';

    // Forecast Table
    html += '<div class="card"><div class="card-header"><h3>Forecast Details</h3></div>' +
        '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
        '<th>Month</th><th>Forecast Income</th><th>Forecast Expense</th><th>Forecast Net</th><th>Confidence</th>' +
        '</tr></thead><tbody>';
    d.forecast.forEach(function(f) {
        html += '<tr>' +
            '<td>' + formatMonthLabel(f.month) + '</td>' +
            '<td class="text-success">' + formatRupiah(f.incomeForecast) + '</td>' +
            '<td class="text-danger">' + formatRupiah(f.expenseForecast) + '</td>' +
            '<td class="' + (f.netForecast>=0?'text-success':'text-danger') + '">' + formatRupiah(f.netForecast) + '</td>' +
            '<td>' + f.incomeConfidence + '%</td>' +
        '</tr>';
    });
    html += '</tbody></table></div></div>';

    // Methods
    html += '<div class="card"><div class="card-header"><h3>Methods Used</h3></div><div class="card-body"><ul>';
    d.methods.forEach(function(m) { html += '<li>' + escapeHtml(m) + '</li>'; });
    html += '</ul><p style="color:var(--text-light);font-size:13px;">' + escapeHtml(d.confidenceLevel) + '</p></div></div>';

    container.innerHTML = html;

    // Render chart
    renderForecastChart(d.historical, d.forecast);
}

function renderForecastChart(historical, forecast) {
    var canvas = document.getElementById('forecastChart');
    if (!canvas) return;
    var cc = getChartColors();

    var labels = historical.map(function(d) { return formatMonthLabel(d.month); }).concat(forecast.map(function(d) { return formatMonthLabel(d.month); }));
    var incomeData = historical.map(function(d) { return d.income; }).concat(forecast.map(function(d) { return d.incomeForecast; }));
    var expenseData = historical.map(function(d) { return d.expense; }).concat(forecast.map(function(d) { return d.expenseForecast; }));

    // Null out forecast part for historical line (only show actual data)
    var histLen = historical.length;
    var incomeActual = incomeData.map(function(v, i) { return i < histLen ? v : null; });
    var incomeForecast = incomeData.map(function(v, i) { return i >= histLen - 1 ? v : null; });
    var expenseActual = expenseData.map(function(v, i) { return i < histLen ? v : null; });
    var expenseForecast = expenseData.map(function(v, i) { return i >= histLen - 1 ? v : null; });

    destroyChart('forecastChart');
    chartInstances['forecastChart'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Income (Actual)', data: incomeActual, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.3 },
                { label: 'Income (Forecast)', data: incomeForecast, borderColor: '#10b981', borderDash: [5,5], backgroundColor: 'transparent', tension: 0.3 },
                { label: 'Expense (Actual)', data: expenseActual, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.3 },
                { label: 'Expense (Forecast)', data: expenseForecast, borderColor: '#ef4444', borderDash: [5,5], backgroundColor: 'transparent', tension: 0.3 }
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

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('forecastBtn').addEventListener('click', loadForecast);
    loadForecast();
});
