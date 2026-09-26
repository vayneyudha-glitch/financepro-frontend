/* ============================================================
   BUDGETS.JS — User Budget Management
   ============================================================ */

requireAuth();
initProtectedPageGuard();
renderSidebar('budgets');
initSidebarMobile();
initThemeToggle();

var userBudgetState = { categories: [] };

async function loadCategories() {
    var result = await CategoryAPI.getAll();
    if (result.ok) userBudgetState.categories = result.data.data;
}

async function loadBudgets() {
    var container = document.getElementById('budgetsTable');
    if (container) container.innerHTML = loadingHtml('Loading budgets...');

    var result = await BudgetAPI.getAll();
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to load'); return; }

    var items = result.data.data.items;
    if (items.length === 0) { container.innerHTML = emptyStateHtml('No budgets yet. Create one!'); return; }

    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
        '<th>ID</th><th>Category</th><th>Budget</th><th>Actual</th><th>Remaining</th><th>Progress</th><th>Status</th><th>Actions</th>' +
        '</tr></thead><tbody>';
    items.forEach(function(b) {
        var progressClass = b.percentage >= 100 ? 'over' : b.percentage >= 90 ? 'critical' : b.percentage >= 70 ? 'warning' : 'under';
        html += '<tr>' +
            '<td>' + b.id + '</td>' +
            '<td>' + escapeHtml(b.categoryName || 'All Expenses') + '</td>' +
            '<td>' + formatRupiah(b.amount) + '</td>' +
            '<td class="text-danger">' + formatRupiah(b.actual) + '</td>' +
            '<td class="' + (b.remaining>=0?'text-success':'text-danger') + '">' + formatRupiah(b.remaining) + '</td>' +
            '<td><div class="budget-progress"><div class="budget-progress-bar"><div class="budget-progress-fill ' + progressClass + '" style="width:' + Math.min(100, b.percentage) + '%">' + b.percentage + '%</div></div></div></td>' +
            '<td><span class="budget-status-badge ' + b.budgetStatus + '">' + b.budgetStatus.replace(/_/g,' ') + '</span></td>' +
            '<td><div style="display:flex;gap:4px;"><button class="btn btn-sm btn-primary" onclick="editBudget(' + b.id + ', ' + b.amount + ', \'' + b.period + '\', \'' + b.startDate + '\', \'' + (b.endDate||'') + '\', ' + (b.categoryId||'null') + ')">Edit</button>' +
            '<button class="btn btn-sm btn-danger" onclick="deleteBudget(' + b.id + ')">Delete</button></div></td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function showBudgetModal(isEdit, id, data) {
    var modalId = 'budgetModal';
    closeModal(modalId);

    var catOptions = '<option value="">All Expense Categories</option>' + userBudgetState.categories.filter(function(c) { return c.type === 'Expense'; }).map(function(c) {
        return '<option value="' + c.id + '"' + (data && data.categoryId===c.id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
    }).join('');

    var html = '<div class="modal-backdrop" id="' + modalId + '">' +
        '<div class="modal">' +
            '<div class="modal-header"><h3>' + (isEdit ? 'Edit Budget' : 'Create Budget') + '</h3><button class="modal-close" onclick="closeModal(\'' + modalId + '\')">&times;</button></div>' +
            '<div class="modal-body">' +
                '<div class="form-group"><label>Category (optional)</label><select class="form-input" id="budgetCategory">' + catOptions + '</select></div>' +
                '<div class="form-group"><label>Amount (Rp)</label><input type="number" class="form-input" id="budgetAmount" value="' + (data ? data.amount : '') + '" min="1" required></div>' +
                '<div class="form-group"><label>Period</label><select class="form-input" id="budgetPeriod"><option value="monthly"' + (data && data.period==='monthly' ? ' selected' : '') + '>Monthly</option><option value="weekly"' + (data && data.period==='weekly' ? ' selected' : '') + '>Weekly</option><option value="yearly"' + (data && data.period==='yearly' ? ' selected' : '') + '>Yearly</option></select></div>' +
                '<div class="form-group"><label>Start Date</label><input type="date" class="form-input" id="budgetStart" value="' + (data ? data.startDate : '') + '" required></div>' +
                '<div class="form-group"><label>End Date (optional)</label><input type="date" class="form-input" id="budgetEnd" value="' + (data ? data.endDate : '') + '"></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal(\'' + modalId + '\')">Cancel</button>' +
            '<button class="btn btn-primary" onclick="submitBudget(' + (isEdit ? id : 'null') + ',\'' + modalId + '\')">' + (isEdit ? 'Update' : 'Create') + '</button></div>' +
        '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

function editBudget(id, amount, period, startDate, endDate, categoryId) {
    showBudgetModal(true, id, { amount: amount, period: period, startDate: startDate, endDate: endDate, categoryId: categoryId });
}

async function submitBudget(id, modalId) {
    var data = {
        categoryId: document.getElementById('budgetCategory').value || null,
        amount: parseFloat(document.getElementById('budgetAmount').value),
        period: document.getElementById('budgetPeriod').value,
        startDate: document.getElementById('budgetStart').value,
        endDate: document.getElementById('budgetEnd').value || null
    };

    if (!data.amount || !data.startDate) { showToast('Amount and start date required', 'error'); return; }

    var result = id ? await BudgetAPI.update(id, data) : await BudgetAPI.create(data);
    if (result.ok) {
        closeModal(modalId);
        showToast('Budget ' + (id ? 'updated' : 'created') + ' successfully!', 'success');
        loadBudgets();
    } else {
        showToast(result.data.message || 'Failed', 'error');
    }
}

function deleteBudget(id) {
    showConfirm('Delete this budget?', async function() {
        var result = await BudgetAPI.delete(id);
        if (result.ok) { showToast('Budget deleted', 'success'); loadBudgets(); }
        else showToast('Failed', 'error');
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    await loadCategories();
    document.getElementById('createBudgetBtn').addEventListener('click', function() { showBudgetModal(false, null, {}); });
    loadBudgets();
});
