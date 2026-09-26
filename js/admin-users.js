/* ============================================================
   ADMIN-USERS.JS — User Management Page
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-users');
initSidebarMobile();
initThemeToggle();

var userState = { page: 1, limit: 10 };

async function loadUsers() {
    var container = document.getElementById('usersTable');
    var pagination = document.getElementById('usersPagination');
    if (container) container.innerHTML = loadingHtml('Loading users...');

    var filters = {
        search: document.getElementById('searchInput').value,
        role: document.getElementById('roleFilter').value,
        status: document.getElementById('statusFilter').value,
        page: userState.page,
        limit: userState.limit
    };

    var result = await AdminAPI.getUsers(filters);
    if (!result.ok) {
        container.innerHTML = errorStateHtml('Failed to load users');
        return;
    }

    var data = result.data.data;
    if (data.items.length === 0) {
        container.innerHTML = emptyStateHtml('No users found');
        pagination.innerHTML = '';
        return;
    }

    var html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>' +
        '<th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th>' +
        '<th>Created</th><th>Last Activity</th><th>Transactions</th><th>Income</th><th>Expense</th><th>Actions</th>' +
        '</tr></thead><tbody>';
    data.items.forEach(function(u) {
        html += '<tr>' +
            '<td>' + u.id + '</td>' +
            '<td><a href="admin-user-detail.html?id=' + u.id + '" style="color:var(--primary);font-weight:600;">' + escapeHtml(u.name) + '</a></td>' +
            '<td>' + escapeHtml(u.email) + '</td>' +
            '<td>' + escapeHtml(u.phone || '-') + '</td>' +
            '<td><span class="badge role-' + u.role.toLowerCase() + '">' + u.role + '</span></td>' +
            '<td><span class="badge ' + (u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger') + '">' + u.status + '</span></td>' +
            '<td>' + formatDate(u.createdAt) + '</td>' +
            '<td>' + (u.lastActivity ? formatDateTime(u.lastActivity) : '-') + '</td>' +
            '<td>' + u.transactionCount + '</td>' +
            '<td class="text-success">' + formatRupiah(u.totalIncome) + '</td>' +
            '<td class="text-danger">' + formatRupiah(u.totalExpense) + '</td>' +
            '<td><div style="display:flex;gap:4px;">' +
                '<a href="admin-user-detail.html?id=' + u.id + '" class="btn btn-sm btn-secondary" title="View">View</a>' +
                '<button class="btn btn-sm btn-primary" onclick="editUser(' + u.id + ',\'' + escapeHtml(u.name).replace(/'/g,'\\\'') + '\',\'' + escapeHtml(u.email).replace(/'/g,'\\\'') + '\',\'' + (u.phone||'').replace(/'/g,'\\\'') + '\',\'' + u.role + '\',\'' + u.status + '\')" title="Edit">Edit</button>' +
                '<button class="btn btn-sm ' + (u.status === 'ACTIVE' ? 'btn-danger' : 'btn-success') + '" onclick="toggleUserStatus(' + u.id + ',\'' + u.status + '\')" title="' + (u.status === 'ACTIVE' ? 'Deactivate' : 'Activate') + '">' + (u.status === 'ACTIVE' ? 'Deact' : 'Act') + '</button>' +
                '<button class="btn btn-sm btn-danger" onclick="deleteUser(' + u.id + ',\'' + escapeHtml(u.name).replace(/'/g,'\\\'') + '\')" title="Delete">Del</button>' +
            '</div></td>' +
            '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;

    renderPagination(pagination, data.pagination, function(newPage) {
        userState.page = newPage;
        loadUsers();
    });
}

function editUser(id, name, email, phone, role, status) {
    // Build modal form
    var modalId = 'editUserModal';
    var html = '<div class="modal-backdrop" id="' + modalId + '">' +
        '<div class="modal">' +
            '<div class="modal-header"><h3>Edit User</h3><button class="modal-close" onclick="closeModal(\'' + modalId + '\')">&times;</button></div>' +
            '<div class="modal-body">' +
                '<div class="form-group"><label>Name</label><input type="text" class="form-input" id="editUserName" value="' + escapeHtml(name) + '"></div>' +
                '<div class="form-group"><label>Email</label><input type="email" class="form-input" id="editUserEmail" value="' + escapeHtml(email) + '"></div>' +
                '<div class="form-group"><label>Phone</label><input type="text" class="form-input" id="editUserPhone" value="' + escapeHtml(phone) + '"></div>' +
                '<div class="form-group"><label>Role</label><select class="form-input" id="editUserRole"><option value="USER"' + (role==='USER'?' selected':'') + '>USER</option><option value="ADMIN"' + (role==='ADMIN'?' selected':'') + '>ADMIN</option></select></div>' +
                '<div class="form-group"><label>Status</label><select class="form-input" id="editUserStatus"><option value="ACTIVE"' + (status==='ACTIVE'?' selected':'') + '>ACTIVE</option><option value="INACTIVE"' + (status==='INACTIVE'?' selected':'') + '>INACTIVE</option></select></div>' +
                '<div class="form-group"><label>New Password (leave blank to keep)</label><input type="password" class="form-input" id="editUserPassword" placeholder="Min 8 characters"></div>' +
            '</div>' +
            '<div class="modal-footer">' +
                '<button class="btn btn-secondary" onclick="closeModal(\'' + modalId + '\')">Cancel</button>' +
                '<button class="btn btn-primary" onclick="submitEditUser(' + id + ',\'' + modalId + '\')">Save</button>' +
            '</div>' +
        '</div>' +
    '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

async function submitEditUser(id, modalId) {
    var data = {
        name: document.getElementById('editUserName').value,
        email: document.getElementById('editUserEmail').value,
        phone: document.getElementById('editUserPhone').value,
        role: document.getElementById('editUserRole').value,
        status: document.getElementById('editUserStatus').value
    };
    var pw = document.getElementById('editUserPassword').value;
    if (pw) data.password = pw;

    var result = await AdminAPI.updateUser(id, data);
    if (result.ok) {
        closeModal(modalId);
        showToast('User updated successfully!', 'success');
        loadUsers();
    } else {
        showToast(result.data.message || 'Failed to update user', 'error');
    }
}

function toggleUserStatus(id, currentStatus) {
    var newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    var action = newStatus === 'ACTIVE' ? 'activate' : 'deactivate';
    showConfirm('Are you sure you want to ' + action + ' this user?', async function() {
        var result = await AdminAPI.updateUser(id, { status: newStatus });
        if (result.ok) {
            showToast('User ' + action + 'd successfully!', 'success');
            loadUsers();
        } else {
            showToast(result.data.message || 'Failed to update user', 'error');
        }
    });
}

function deleteUser(id, name) {
    showConfirm('Are you sure you want to delete user "' + name + '"? This cannot be undone.', async function() {
        var result = await AdminAPI.deleteUser(id);
        if (result.ok) {
            showToast('User deleted successfully!', 'success');
            loadUsers();
        } else {
            showToast(result.data.message || 'Failed to delete user', 'error');
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('searchBtn').addEventListener('click', function() { userState.page = 1; loadUsers(); });
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { userState.page = 1; loadUsers(); }
    });
    document.getElementById('limitFilter').addEventListener('change', function() {
        userState.limit = parseInt(this.value); userState.page = 1; loadUsers();
    });
    loadUsers();
});
