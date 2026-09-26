/* ============================================================
   ADMIN-TRANSACTIONS.JS — Transaction Management
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-transactions');
initSidebarMobile();
initThemeToggle();

var trxState = { page: 1, limit: 10, selected: new Set() };

async function loadTransactions() {
    var container = document.getElementById('trxTable');
    var pagination = document.getElementById('trxPagination');
    if (container) container.innerHTML = loadingHtml('Loading transactions...');

    var filters = {
        search: document.getElementById('searchInput').value,
        type: document.getElementById('typeFilter').value,
        dateFrom: document.getElementById('dateFrom').value,
        dateTo: document.getElementById('dateTo').value,
        amountMin: document.getElementById('amountMin').value,
        page: trxState.page,
        limit: trxState.limit
    };

    var result = await AdminAPI.getTransactions(filters);
    if (!result.ok) {
        container.innerHTML = errorStateHtml('Failed to load transactions');
        return;
    }

    var data = result.data.data;
    if (data.items.length === 0) {
        container.innerHTML = emptyStateHtml('No transactions found');
        pagination.innerHTML = '';
        return;
    }

    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
        '<th class="checkbox-cell"><input type="checkbox" id="selectAll" onchange="toggleSelectAll(this.checked, ' + data.items.length + ')"></th>' +
        '<th>ID</th><th>User</th><th>Category</th><th>Type</th><th>Amount</th>' +
        '<th>Description</th><th>Date</th><th>Actions</th>' +
        '</tr></thead><tbody>';
    data.items.forEach(function(t) {
        html += '<tr>' +
            '<td class="checkbox-cell"><input type="checkbox" class="trx-checkbox" value="' + t.id + '" onchange="toggleTrxSelect(' + t.id + ', this.checked)"></td>' +
            '<td>' + t.id + '</td>' +
            '<td>' + escapeHtml(t.userName) + '<br><small>' + escapeHtml(t.userEmail) + '</small></td>' +
            '<td>' + escapeHtml(t.categoryName) + '</td>' +
            '<td><span class="badge ' + (t.type==='Income'?'badge-success':'badge-danger') + '">' + t.type + '</span></td>' +
            '<td class="' + (t.type==='Income'?'text-success':'text-danger') + '">' + formatRupiah(t.amount) + '</td>' +
            '<td>' + escapeHtml(t.description) + '</td>' +
            '<td>' + formatDate(t.transactionDate) + '</td>' +
            '<td><button class="btn btn-sm btn-danger" onclick="deleteTrx(' + t.id + ')">Delete</button></td>' +
            '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;

    renderPagination(pagination, data.pagination, function(newPage) {
        trxState.page = newPage;
        loadTransactions();
    });
}

function toggleSelectAll(checked, count) {
    document.querySelectorAll('.trx-checkbox').forEach(function(cb) {
        cb.checked = checked;
        if (checked) trxState.selected.add(parseInt(cb.value));
        else trxState.selected.delete(parseInt(cb.value));
    });
    updateBulkButton();
}

function toggleTrxSelect(id, checked) {
    if (checked) trxState.selected.add(id);
    else trxState.selected.delete(id);
    updateBulkButton();
}

function updateBulkButton() {
    var btn = document.getElementById('bulkDeleteBtn');
    btn.disabled = trxState.selected.size === 0;
    btn.textContent = trxState.selected.size > 0 ? 'Bulk Delete (' + trxState.selected.size + ')' : 'Bulk Delete';
}

async function deleteTrx(id) {
    showConfirm('Delete this transaction?', async function() {
        var result = await AdminAPI.deleteTransaction(id);
        if (result.ok) { showToast('Transaction deleted', 'success'); loadTransactions(); }
        else showToast('Failed to delete', 'error');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('searchBtn').addEventListener('click', function() { trxState.page = 1; loadTransactions(); });
    document.getElementById('limitFilter').addEventListener('change', function() { trxState.limit = parseInt(this.value); trxState.page = 1; loadTransactions(); });
    document.getElementById('bulkDeleteBtn').addEventListener('click', function() {
        if (trxState.selected.size === 0) return;
        showConfirm('Delete ' + trxState.selected.size + ' transactions?', async function() {
            var result = await AdminAPI.bulkDeleteTransactions(Array.from(trxState.selected));
            if (result.ok) { showToast('Transactions deleted', 'success'); trxState.selected.clear(); loadTransactions(); }
            else showToast('Failed', 'error');
        });
    });
    document.getElementById('exportBtn').addEventListener('click', async function() {
        var result = await CSVAPI.export('transactions');
        if (result.ok) { window.open(result.url, '_blank'); showToast('Export started', 'success'); }
        else showToast('Export failed', 'error');
    });
    loadTransactions();
});
