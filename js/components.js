/* ============================================================
   COMPONENTS.JS — Reusable UI Components
   ============================================================ */

// Toast notification
function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 3500);
}

// Confirmation dialog
function showConfirm(message, onConfirm, onCancel) {
    var overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    var dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';

    var msg = document.createElement('p');
    msg.textContent = message;
    msg.className = 'confirm-message';
    dialog.appendChild(msg);

    var btnRow = document.createElement('div');
    btnRow.className = 'confirm-actions';

    var btnYes = document.createElement('button');
    btnYes.className = 'btn btn-danger';
    btnYes.textContent = 'Confirm';

    var btnNo = document.createElement('button');
    btnNo.className = 'btn btn-secondary';
    btnNo.textContent = 'Cancel';

    btnRow.appendChild(btnNo);
    btnRow.appendChild(btnYes);
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    setTimeout(function() { overlay.classList.add('active'); }, 10);

    btnYes.addEventListener('click', function() {
        overlay.classList.remove('active');
        setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
        if (onConfirm) onConfirm();
    });

    btnNo.addEventListener('click', function() {
        overlay.classList.remove('active');
        setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
        if (onCancel) onCancel();
    });

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
        }
    });
}

// Loading spinner HTML
function loadingHtml(message) {
    return '<div class="loading-state"><div class="spinner"></div><p>' + (message || 'Loading...') + '</p></div>';
}

// Empty state HTML
function emptyStateHtml(message) {
    return '<div class="empty-state"><p>' + (message || 'No data available') + '</p></div>';
}

// Error state HTML
function errorStateHtml(message) {
    return '<div class="error-state"><p>' + (message || 'Failed to load data') + '</p></div>';
}

// Success state HTML
function successStateHtml(message) {
    return '<div class="empty-state" style="color:var(--income);"><p>&#10003; ' + (message || 'Success') + '</p></div>';
}

// Close modal by ID
function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

// Render pagination controls
function renderPagination(container, pagination, onPageChange) {
    if (!container) return;
    var total = pagination.total, page = pagination.page, totalPages = pagination.totalPages;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;flex-wrap:wrap;gap:8px;">';
    html += '<span style="font-size:13px;color:var(--text-light);">Showing ' + ((page-1)*pagination.limit+1) + '-' + Math.min(page*pagination.limit, total) + ' of ' + total + '</span>';
    html += '<div style="display:flex;gap:4px;">';

    // Previous
    if (page > 1) html += '<button class="btn btn-sm btn-secondary" data-page="' + (page-1) + '">&laquo; Prev</button>';

    // Page numbers (show up to 5)
    var start = Math.max(1, page - 2);
    var end = Math.min(totalPages, page + 2);
    for (var i = start; i <= end; i++) {
        html += '<button class="btn btn-sm ' + (i===page?'btn-primary':'btn-secondary') + '" data-page="' + i + '">' + i + '</button>';
    }

    // Next
    if (page < totalPages) html += '<button class="btn btn-sm btn-secondary" data-page="' + (page+1) + '">Next &raquo;</button>';

    html += '</div></div>';
    container.innerHTML = html;

    container.querySelectorAll('[data-page]').forEach(function(btn) {
        btn.addEventListener('click', function() { onPageChange(parseInt(this.dataset.page)); });
    });
}

// Render sidebar (shared across pages)
function renderSidebar(activePage) {
    var session = getSession();
    if (!session) return '';

    var navItems = [
        { page: 'dashboard', label: 'Dashboard', icon: '\u{1F4CA}', roles: ['ADMIN', 'USER'] },
        { page: 'transactions', label: 'Transactions', icon: '\u{1F4B8}', roles: ['ADMIN', 'USER'] },
        { page: 'charts', label: 'Analytics', icon: '\u{1F4C8}', roles: ['ADMIN', 'USER'] },
        { page: 'budgets', label: 'Budgets', icon: '\u{1F9EE}', roles: ['ADMIN', 'USER'] },
        { page: 'admin', label: 'Dashboard', icon: '\u{1F3E2}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-users', label: 'Users', icon: '\u{1F465}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-transactions', label: 'Transactions', icon: '\u{1F4DD}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-categories', label: 'Categories', icon: '\u{1F3F7}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-budgets', label: 'Budgets', icon: '\u{1F4B0}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-analytics', label: 'Financial Analytics', icon: '\u{1F4C9}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-income', label: 'Income Analytics', icon: '\u{1F4B8}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-expense', label: 'Expense Analytics', icon: '\u{1F4B6}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-cashflow', label: 'Cash Flow', icon: '\u{1F4A7}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-data-analysis', label: 'Data Analysis', icon: '\u{1F50D}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-reports', label: 'Reports', icon: '\u{1F4C4}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-import-export', label: 'Import / Export', icon: '\u{1F4E4}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-data-quality', label: 'Data Quality', icon: '\u2705', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-activity', label: 'Activity Logs', icon: '\u{1F4CB}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-alerts', label: 'Alerts', icon: '\u{1F514}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-forecast', label: 'Forecast', icon: '\u{1F52E}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-security', label: 'Security', icon: '\u{1F6E1}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-system-health', label: 'System Health', icon: '\u{1F493}', roles: ['ADMIN'], group: 'admin' },
        { page: 'admin-settings', label: 'Settings', icon: '\u{1F527}', roles: ['ADMIN'], group: 'admin' },
        { page: 'profile', label: 'Profile', icon: '\u{1F464}', roles: ['ADMIN', 'USER'] }
    ];

    var currentGroup = null;
    var navHtml = '';
    navItems.forEach(function(item) {
        if (item.roles.indexOf(session.role) !== -1) {
            // Add group separator
            if (item.group && item.group !== currentGroup) {
                currentGroup = item.group;
                if (currentGroup === 'admin') {
                    navHtml += '<div class="nav-group-label">ADMIN PANEL</div>';
                }
            }
            navHtml += '<a href="' + item.page + '.html" class="nav-item' + (item.page === activePage ? ' active' : '') + '">' +
                '<span class="nav-icon">' + item.icon + '</span>' +
                '<span class="nav-label">' + item.label + '</span></a>';
        }
    });

    var sidebar = document.getElementById('sidebar');
    if (sidebar) {
        var avatarUrl = session.avatarUrl || '';
        // Default avatar: SVG asset lokal berdasarkan role (bukan URL eksternal)
        var defaultAvatar = (session.role === 'ADMIN')
            ? 'assets/admin-avatar.svg'
            : 'assets/user-avatar.svg';
        var avatarBlock = avatarUrl
            ? '<img class="sidebar-avatar-img" src="' + avatarUrl + '" alt="Profile photo">'
            : '<img class="sidebar-avatar-img" src="' + defaultAvatar + '" alt="Default ' + session.role + ' avatar">';

        sidebar.innerHTML =
            '<div class="sidebar-header">' +
                '<h2>FinancePro</h2>' +
                '<p>Personal Finance Analytics</p>' +
            '</div>' +
            '<div class="sidebar-user">' +
                '<div class="sidebar-avatar">' + avatarBlock + '</div>' +
                '<p class="sidebar-user-name">' + escapeHtml(session.name) + '</p>' +
                '<p class="sidebar-role role-' + session.role.toLowerCase() + '">' + session.role + '</p>' +
            '</div>' +
            '<nav class="sidebar-nav' + (session.role === 'ADMIN' ? ' sidebar-nav-admin' : '') + '">' + navHtml + '</nav>' +
            '<div class="sidebar-actions">' +
                '<button class="btn btn-logout" id="btnLogout">Logout</button>' +
            '</div>';

        var btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', function() {
                showConfirm('Are you sure you want to logout?', function() { doLogout(); });
            });
        }
    }
}

// Mobile sidebar toggle
function initSidebarMobile() {
    var toggle = document.getElementById('menuToggle');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay') || document.getElementById('overlay');
    if (!toggle || !sidebar || !overlay) return;

    toggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', function() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
}

// Theme toggle
function initThemeToggle() {
    var toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    var saved = localStorage.getItem('finance_theme');
    if (saved === 'dark') {
        document.body.classList.add('dark-mode');
        toggle.textContent = '\u2600';
    }

    toggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        var isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('finance_theme', isDark ? 'dark' : 'light');
        toggle.textContent = isDark ? '\u2600' : '\uD83C\uDF19';
        // Re-render charts if present
        if (typeof renderCharts === 'function') renderCharts();
    });
}
