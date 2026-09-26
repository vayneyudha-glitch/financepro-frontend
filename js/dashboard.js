/* ============================================================
   DASHBOARD.JS — User Dashboard Page Logic
   ============================================================ */

requireAuth();
initProtectedPageGuard();
renderSidebar('dashboard');
initSidebarMobile();
initThemeToggle();

var categories = { Income: [], Expense: [] };
var dashboardData = null;

// Load categories from API
async function loadCategories() {
    var result = await CategoriesAPI.getAll();
    if (result.ok && result.data.data) {
        var grouped = result.data.data.grouped;
        categories = grouped || DEFAULT_CATEGORIES;
    }
    return categories;
}

// Load dashboard data
async function loadDashboardData() {
    var result = await DashboardAPI.get();
    if (!result.ok) {
        showToast('Failed to load dashboard data', 'error');
        return;
    }
    dashboardData = result.data.data;
    renderDashboard();
}

function renderDashboard() {
    if (!dashboardData) return;

    // Summary cards
    document.getElementById('totalIncome').textContent = formatRupiah(dashboardData.totalIncome);
    document.getElementById('totalExpense').textContent = formatRupiah(dashboardData.totalExpense);
    document.getElementById('totalBalance').textContent = formatRupiah(dashboardData.totalBalance);
    document.getElementById('totalTransactions').textContent = dashboardData.totalTransactions;

    // This month
    var now = new Date();
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('currentMonthLabel').textContent = months[now.getMonth()] + ' ' + now.getFullYear();

    document.getElementById('monthIncome').textContent = formatRupiah(dashboardData.monthIncome);
    document.getElementById('monthExpense').textContent = formatRupiah(dashboardData.monthExpense);
    var netFlow = dashboardData.netCashFlow;
    var netEl = document.getElementById('netCashFlow');
    netEl.textContent = (netFlow >= 0 ? '+' : '') + formatRupiah(netFlow);
    netEl.style.color = netFlow >= 0 ? 'var(--income)' : 'var(--expense)';
    document.getElementById('savingsRate').textContent = dashboardData.savingsRate + '%';

    // Charts
    renderCharts();
    loadRecentTransactions();
}

function renderCharts() {
    if (!dashboardData) return;
    renderIncomeExpenseChart('incomeExpenseChart', dashboardData.monthlyTrend);
    renderExpenseCategoryChart('expenseCategoryChart', dashboardData.expenseByCategory);
    renderCashFlowChart('cashFlowChart', dashboardData.monthlyTrend);
}

// Recent transactions (first page)
async function loadRecentTransactions() {
    var result = await TransactionsAPI.getAll({ page: 1, limit: 5 });
    var container = document.getElementById('recentTransactions');

    if (!result.ok) {
        container.innerHTML = errorStateHtml('Failed to load transactions');
        return;
    }

    var items = result.data.data.items;
    if (items.length === 0) {
        container.innerHTML = emptyStateHtml('No transactions yet. Click "Add Transaction" to get started.');
        return;
    }

    var html = '<table class="data-table"><thead><tr>' +
        '<th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th>' +
        '</tr></thead><tbody>';

    items.forEach(function(t) {
        html += '<tr>' +
            '<td>' + formatDate(t.transactionDate) + '</td>' +
            '<td>' + escapeHtml(t.description) + '</td>' +
            '<td>' + escapeHtml(t.categoryName) + '</td>' +
            '<td><span class="badge ' + (t.type === 'Income' ? 'badge-income' : 'badge-expense') + '">' + t.type + '</span></td>' +
            '<td class="' + (t.type === 'Income' ? 'amount-income' : 'amount-expense') + '">' +
                (t.type === 'Income' ? '+' : '-') + ' ' + formatRupiah(t.amount) + '</td>' +
            '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Transaction Modal
function initModal() {
    var overlay = document.getElementById('modalOverlay');
    var btnAddTransaction = document.getElementById('btnAddTransaction');
    var modalClose = document.getElementById('modalClose');
    var modalCancel = document.getElementById('modalCancel');
    var transactionForm = document.getElementById('transactionForm');
    var trxType = document.getElementById('trxType');

    if (btnAddTransaction) {
        btnAddTransaction.addEventListener('click', function() {
            openAddModal();
        });
    }

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }

    if (modalCancel) {
        modalCancel.addEventListener('click', closeModal);
    }

    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeModal();
        });
    }

    if (transactionForm) {
        transactionForm.addEventListener('submit', handleTransactionSubmit);
    }

    if (trxType) {
        trxType.addEventListener('change', populateCategoryOptions);
    }
}
function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add Transaction';
    document.getElementById('transactionForm').reset();
    document.getElementById('trxDate').value = getToday();
    populateCategoryOptions();
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    delete document.getElementById('transactionForm').dataset.editId;
}

function populateCategoryOptions() {
    var type = document.getElementById('trxType').value;
    var select = document.getElementById('trxCategory');
    select.innerHTML = '';
    var cats = categories[type] || [];
    cats.forEach(function(c) {
        var opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var editId = form.dataset.editId;

    var data = {
        type: document.getElementById('trxType').value,
        categoryId: parseInt(document.getElementById('trxCategory').value),
        amount: parseFloat(document.getElementById('trxAmount').value),
        description: document.getElementById('trxDescription').value.trim(),
        transactionDate: document.getElementById('trxDate').value
    };

    if (!data.amount || data.amount <= 0) {
        showToast('Amount must be greater than 0', 'error');
        return;
    }
    if (!data.description) {
        showToast('Description is required', 'error');
        return;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    var result;
    if (editId) {
        result = await TransactionsAPI.update(editId, data);
    } else {
        result = await TransactionsAPI.create(data);
    }

    btn.disabled = false;
    btn.textContent = 'Save';

    if (!result.ok) {
        showToast(result.data.message || 'Failed to save transaction', 'error');
        return;
    }

    showToast(editId ? 'Transaction updated!' : 'Transaction added!', 'success');
    closeModal();
    loadDashboardData();
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    await loadCategories();
    initModal();
    await loadDashboardData();
});

