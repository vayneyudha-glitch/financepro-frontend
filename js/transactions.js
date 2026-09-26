/* ============================================================
   TRANSACTIONS.JS — Transactions Page Logic
   ============================================================ */

requireAuth();
initProtectedPageGuard();
renderSidebar('transactions');
initSidebarMobile();
initThemeToggle();

var trxState = {
    page: 1,
    limit: 10,
    total: 0,
    categories: { Income: [], Expense: [] }
};

// Load categories
async function loadCategories() {
    var result = await CategoriesAPI.getAll();
    if (result.ok && result.data.data) {
        trxState.categories = result.data.data.grouped || DEFAULT_CATEGORIES;

        // Populate filter dropdown
        var filterSel = document.getElementById('filterCategory');
        filterSel.innerHTML = '<option value="">All Categories</option>';
        var allCats = (trxState.categories.Income || []).concat(trxState.categories.Expense || []);
        allCats.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            filterSel.appendChild(opt);
        });
    }
}

// Load transactions
async function loadTransactions() {
    var container = document.getElementById('transactionsTable');
    container.innerHTML = loadingHtml('Loading transactions...');

    var filters = {
        page: trxState.page,
        limit: trxState.limit,
        search: document.getElementById('searchInput').value.trim(),
        type: document.getElementById('filterType').value,
        categoryId: document.getElementById('filterCategory').value,
        dateFrom: document.getElementById('filterDateFrom').value,
        dateTo: document.getElementById('filterDateTo').value,
        sortBy: document.getElementById('sortBy').value,
        sortOrder: document.getElementById('sortOrder').value
    };

    var result = await TransactionsAPI.getAll(filters);

    if (!result.ok) {
        container.innerHTML = errorStateHtml('Failed to load transactions');
        return;
    }

    var data = result.data.data;
    trxState.total = data.pagination.total;

    if (data.items.length === 0) {
        container.innerHTML = emptyStateHtml('No transactions found. Try adjusting filters or add a new transaction.');
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    var html = '<table class="data-table"><thead><tr>' +
        '<th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th><th>Actions</th>' +
        '</tr></thead><tbody>';

    data.items.forEach(function(t) {
        html += '<tr>' +
            '<td>' + formatDate(t.transactionDate) + '</td>' +
            '<td>' + escapeHtml(t.description) + '</td>' +
            '<td>' + escapeHtml(t.categoryName) + '</td>' +
            '<td><span class="badge ' + (t.type === 'Income' ? 'badge-income' : 'badge-expense') + '">' + t.type + '</span></td>' +
            '<td class="' + (t.type === 'Income' ? 'amount-income' : 'amount-expense') + '">' +
                (t.type === 'Income' ? '+' : '-') + ' ' + formatRupiah(t.amount) + '</td>' +
            '<td><div class="table-actions">' +
                '<button class="btn-edit btn-sm" data-id="' + t.id + '">Edit</button>' +
                '<button class="btn-delete btn-sm" data-id="' + t.id + '">Delete</button>' +
            '</div></td>' +
            '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Render pagination
    renderPagination('pagination', data.pagination, function(newPage) {
        trxState.page = newPage;
        loadTransactions();
    });

    // Bind edit/delete buttons
    container.querySelectorAll('.btn-edit').forEach(function(btn) {
        btn.addEventListener('click', function() { openEditModal(parseInt(this.dataset.id)); });
    });
    container.querySelectorAll('.btn-delete').forEach(function(btn) {
        btn.addEventListener('click', function() { handleDelete(parseInt(this.dataset.id)); });
    });
}

// Pagination renderer
function renderPagination(containerId, pagination, callback) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var current = pagination.page;
    var total = pagination.totalPages;
    if (total <= 1) { container.innerHTML = ''; return; }

    var html = '';
    html += '<button class="page-btn' + (current === 1 ? ' disabled' : '') + '" data-page="' + (current - 1) + '">&laquo;</button>';
    for (var i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
            html += '<button class="page-btn' + (i === current ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
        } else if (i === current - 2 || i === current + 2) {
            html += '<span class="page-ellipsis">...</span>';
        }
    }
    html += '<button class="page-btn' + (current === total ? ' disabled' : '') + '" data-page="' + (current + 1) + '">&raquo;</button>';

    container.innerHTML = html;
    container.querySelectorAll('.page-btn').forEach(function(btn) {
        if (!btn.classList.contains('disabled')) {
            btn.addEventListener('click', function() {
                callback(parseInt(this.dataset.page));
            });
        }
    });
}

// Transaction Modal
function initModal() {
    var overlay = document.getElementById('modalOverlay');
    document.getElementById('btnAddTransaction').addEventListener('click', function() {
        openAddModal();
    });
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
    document.getElementById('transactionForm').addEventListener('submit', handleTransactionSubmit);
    document.getElementById('trxType').addEventListener('change', populateCategoryOptions);
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add Transaction';
    document.getElementById('transactionForm').reset();
    document.getElementById('trxDate').value = getToday();
    populateCategoryOptions();
    document.getElementById('modalOverlay').classList.add('active');
}

function openEditModal(id) {
    // Fetch transaction then populate
    TransactionsAPI.getById(id).then(function(result) {
        if (!result.ok) {
            showToast(result.data.message || 'Failed to load transaction', 'error');
            return;
        }
        var t = result.data.data;
        document.getElementById('modalTitle').textContent = 'Edit Transaction';
        document.getElementById('trxType').value = t.type;
        populateCategoryOptions();
        document.getElementById('trxCategory').value = t.categoryId;
        document.getElementById('trxAmount').value = t.amount;
        document.getElementById('trxDescription').value = t.description;
        document.getElementById('trxDate').value = t.transactionDate;
        document.getElementById('transactionForm').dataset.editId = id;
        document.getElementById('modalOverlay').classList.add('active');
    });
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    delete document.getElementById('transactionForm').dataset.editId;
}

function populateCategoryOptions() {
    var type = document.getElementById('trxType').value;
    var select = document.getElementById('trxCategory');
    select.innerHTML = '';
    var cats = trxState.categories[type] || [];
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

    if (!data.amount || data.amount <= 0) { showToast('Amount must be greater than 0', 'error'); return; }
    if (!data.description) { showToast('Description is required', 'error'); return; }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Saving...';

    var result = editId ? await TransactionsAPI.update(editId, data) : await TransactionsAPI.create(data);
    btn.disabled = false; btn.textContent = 'Save';

    if (!result.ok) {
        showToast(result.data.message || 'Failed to save', 'error');
        return;
    }

    showToast(editId ? 'Transaction updated!' : 'Transaction added!', 'success');
    closeModal();
    loadTransactions();
}

async function handleDelete(id) {
    showConfirm('Are you sure you want to delete this transaction?', async function() {
        var result = await TransactionsAPI.delete(id);
        if (!result.ok) {
            showToast(result.data.message || 'Failed to delete', 'error');
            return;
        }
        showToast('Transaction deleted!', 'info');
        loadTransactions();
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    await loadCategories();
    initModal();

    // Filters
    var debouncedLoad = debounce(function() { trxState.page = 1; loadTransactions(); }, 300);
    document.getElementById('searchInput').addEventListener('input', debouncedLoad);
    document.getElementById('filterType').addEventListener('change', function() { trxState.page = 1; loadTransactions(); });
    document.getElementById('filterCategory').addEventListener('change', function() { trxState.page = 1; loadTransactions(); });
    document.getElementById('filterDateFrom').addEventListener('change', function() { trxState.page = 1; loadTransactions(); });
    document.getElementById('filterDateTo').addEventListener('change', function() { trxState.page = 1; loadTransactions(); });
    document.getElementById('sortBy').addEventListener('change', function() { trxState.page = 1; loadTransactions(); });
    document.getElementById('sortOrder').addEventListener('change', function() { trxState.page = 1; loadTransactions(); });

    await loadTransactions();
});
