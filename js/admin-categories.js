/* ============================================================
   ADMIN-CATEGORIES.JS — Category Management with Usage Stats
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-categories');
initSidebarMobile();
initThemeToggle();

async function loadCategories() {
    var container = document.getElementById('catUsageTable');
    if (container) container.innerHTML = loadingHtml('Loading categories...');

    var result = await AdminAPI.getCategoryUsage();
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to load'); return; }

    var items = result.data.data.items;
    if (items.length === 0) { container.innerHTML = emptyStateHtml('No categories'); return; }

    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
        '<th>ID</th><th>Name</th><th>Type</th><th>Description</th><th>Transactions</th><th>Total Amount</th><th>% of Total</th><th>Actions</th>' +
        '</tr></thead><tbody>';
    items.forEach(function(c) {
        html += '<tr>' +
            '<td>' + c.id + '</td>' +
            '<td>' + escapeHtml(c.name) + '</td>' +
            '<td><span class="badge ' + (c.type==='Income'?'badge-success':'badge-danger') + '">' + c.type + '</span></td>' +
            '<td>' + escapeHtml(c.description || '-') + '</td>' +
            '<td>' + c.transactionCount + '</td>' +
            '<td class="' + (c.type==='Income'?'text-success':'text-danger') + '">' + formatRupiah(c.totalAmount) + '</td>' +
            '<td>' + c.percentageOfTotal + '%</td>' +
            '<td><div style="display:flex;gap:4px;">' +
                '<button class="btn btn-sm btn-primary" onclick="editCategory(' + c.id + ',\'' + escapeHtml(c.name).replace(/'/g,'\\\'') + '\',\'' + c.type + '\',\'' + escapeHtml(c.description||'').replace(/'/g,'\\\'').replace(/"/g,'&quot;') + '\')">Edit</button>' +
                '<button class="btn btn-sm btn-danger" onclick="deleteCategory(' + c.id + ',\'' + escapeHtml(c.name).replace(/'/g,'\\\'') + '\', ' + c.transactionCount + ')">Delete</button>' +
            '</div></td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function showCatModal(isEdit, id, data) {
    var modalId = 'catModal';
    closeModal(modalId);

    var html = '<div class="modal-backdrop" id="' + modalId + '">' +
        '<div class="modal">' +
            '<div class="modal-header"><h3>' + (isEdit ? 'Edit Category' : 'Create Category') + '</h3><button class="modal-close" onclick="closeModal(\'' + modalId + '\')">&times;</button></div>' +
            '<div class="modal-body">' +
                '<div class="form-group"><label>Name</label><input type="text" class="form-input" id="catName" value="' + (data ? escapeHtml(data.name) : '') + '"></div>' +
                '<div class="form-group"><label>Type</label><select class="form-input" id="catType"><option value="Income"' + (data && data.type==='Income' ? ' selected' : '') + '>Income</option><option value="Expense"' + (data && data.type==='Expense' ? ' selected' : '') + '>Expense</option></select></div>' +
                '<div class="form-group"><label>Description</label><textarea class="form-input" id="catDesc">' + (data ? escapeHtml(data.description || '') : '') + '</textarea></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal(\'' + modalId + '\')">Cancel</button>' +
            '<button class="btn btn-primary" onclick="submitCategory(' + (isEdit ? id : 'null') + ',\'' + modalId + '\')">' + (isEdit ? 'Update' : 'Create') + '</button></div>' +
        '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

function editCategory(id, name, type, description) {
    showCatModal(true, id, { name: name, type: type, description: description });
}

async function submitCategory(id, modalId) {
    var data = {
        name: document.getElementById('catName').value.trim(),
        type: document.getElementById('catType').value,
        description: document.getElementById('catDesc').value.trim()
    };

    if (!data.name) { showToast('Name is required', 'error'); return; }

    var result = id ? await CategoryAPI.update(id, data) : await CategoryAPI.create(data);
    if (result.ok) {
        closeModal(modalId);
        showToast('Category ' + (id ? 'updated' : 'created') + ' successfully!', 'success');
        loadCategories();
    } else {
        showToast(result.data.message || 'Failed', 'error');
    }
}

function deleteCategory(id, name, trxCount) {
    if (trxCount > 0) {
        showToast('Cannot delete: ' + trxCount + ' transactions use this category', 'warning');
        return;
    }
    showConfirm('Delete category "' + name + '"?', async function() {
        var result = await CategoryAPI.delete(id);
        if (result.ok) { showToast('Category deleted', 'success'); loadCategories(); }
        else showToast('Failed', 'error');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('createCatBtn').addEventListener('click', function() { showCatModal(false, null, {}); });
    loadCategories();
});
