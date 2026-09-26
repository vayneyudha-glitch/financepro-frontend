/* ============================================================
   API.JS — REST API Client with JWT Token Management
   ============================================================ */

// Token management
function getToken() { return localStorage.getItem(AUTH_KEYS.TOKEN); }
function setToken(token) { localStorage.setItem(AUTH_KEYS.TOKEN, token); }
function clearToken() { localStorage.removeItem(AUTH_KEYS.TOKEN); }

// Core API request
async function apiRequest(endpoint, options) {
    options = options || {};
    var token = getToken();

    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (options.headers) { for (var k in options.headers) headers[k] = options.headers[k]; }

    var config = { method: options.method || 'GET', headers: headers };
    if (options.body !== undefined) {
        config.body = options.body instanceof FormData ? options.body : JSON.stringify(options.body);
        if (options.body instanceof FormData) delete headers['Content-Type'];
    }

    try {
        var response = await fetch(API_BASE_URL + endpoint, config);

        if (response.status === 401) {
            var data401 = await response.json().catch(function() { return {}; });
            clearToken();
            localStorage.removeItem(AUTH_KEYS.SESSION);
            // Check if we're on a protected page — if so, redirect to login
            var path = window.location.pathname.toLowerCase();
            var isProtectedPage = path.indexOf('dashboard') !== -1 ||
                path.indexOf('admin') !== -1 ||
                path.indexOf('profile') !== -1 ||
                path.indexOf('transactions') !== -1 ||
                path.indexOf('budgets') !== -1 ||
                path.indexOf('charts') !== -1 ||
                path.indexOf('import-export') !== -1;
            if (isProtectedPage) {
                // Use replace() so Back/Forward button can't return to protected page after session expiry
                window.history.replaceState({ expired: true }, '', 'login.html');
                window.location.replace('login.html');
            } else if (typeof showLoginError === 'function') {
                showLoginError(data401.message || 'Session expired');
            }
            return { ok: false, data: data401, status: 401 };
        }

        // Handle CSV blob responses
        var contentType = response.headers.get('content-type') || '';
        if (contentType.indexOf('text/csv') !== -1 || contentType.indexOf('application/octet-stream') !== -1) {
            if (!response.ok) return { ok: false, data: { message: 'Export failed' } };
            var blob = await response.blob();
            var url = URL.createObjectURL(blob);
            return { ok: true, url: url };
        }

        var result = await response.json();
        return { ok: response.ok, data: result, status: response.status };
    } catch (err) {
        console.error('API Error:', err);
        return { ok: false, data: { success: false, message: 'Cannot connect to server. Make sure backend is running.' }, status: 0 };
    }
}

// Auth API
var AuthAPI = {
    login: async function(identifier, password) {
        var result = await apiRequest('/auth/login', { method: 'POST', body: { identifier: identifier, password: password } });
        if (result.ok && result.data.data && result.data.data.token) {
            setToken(result.data.data.token);
            localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(result.data.data.user));
        }
        return result;
    },

    register: async function(name, email, phone, password, confirmPassword, phoneVerified) {
        var result = await apiRequest('/auth/register', {
            method: 'POST',
            body: {
                name: name,
                email: email,
                phone: phone,
                password: password,
                confirmPassword: confirmPassword,
                phoneVerified: phoneVerified || false
            }
        });
        if (result.ok && result.data.data && result.data.data.token) {
            setToken(result.data.data.token);
            localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(result.data.data.user));
        }
        return result;
    },

    getMe: async function() { return await apiRequest('/auth/me'); },

    updateProfile: async function(data) { return await apiRequest('/auth/profile', { method: 'PUT', body: data }); },

    changePassword: async function(currentPassword, newPassword) {
        return await apiRequest('/auth/change-password', { method: 'PUT', body: { currentPassword: currentPassword, newPassword: newPassword } });
    },

    uploadAvatar: async function(avatarUrl) {
        return await apiRequest('/auth/avatar', { method: 'PUT', body: { avatarUrl: avatarUrl } });
    },

    removeAvatar: async function() {
        return await apiRequest('/auth/avatar', { method: 'DELETE' });
    },

    logout: async function() {
        await apiRequest('/auth/logout', { method: 'POST' });
        clearToken();
        localStorage.removeItem(AUTH_KEYS.SESSION);
    }
};

// OTP API — email verification during registration
var OTPAPI = {
    send: async function(phone, name, email) {
        var body = { phone: phone };
        if (name) body.name = name;
        if (email) body.email = email;
        return await apiRequest('/otp/send', { method: 'POST', body: body });
    },

    verify: async function(phone, code, email) {
        var body = { phone: phone, code: code };
        if (email) body.email = email;
        return await apiRequest('/otp/verify', { method: 'POST', body: body });
    }
};

// Transactions API
var TransactionsAPI = {
    getAll: async function(filters) {
        var params = [];
        if (filters) {
            if (filters.type) params.push('type=' + encodeURIComponent(filters.type));
            if (filters.categoryId) params.push('categoryId=' + encodeURIComponent(filters.categoryId));
            if (filters.search) params.push('search=' + encodeURIComponent(filters.search));
            if (filters.dateFrom) params.push('dateFrom=' + encodeURIComponent(filters.dateFrom));
            if (filters.dateTo) params.push('dateTo=' + encodeURIComponent(filters.dateTo));
            if (filters.userId) params.push('userId=' + encodeURIComponent(filters.userId));
            if (filters.page) params.push('page=' + filters.page);
            if (filters.limit) params.push('limit=' + filters.limit);
            if (filters.sortBy) params.push('sortBy=' + filters.sortBy);
            if (filters.sortOrder) params.push('sortOrder=' + filters.sortOrder);
        }
        return await apiRequest('/transactions' + (params.length ? '?' + params.join('&') : ''));
    },

    getById: async function(id) { return await apiRequest('/transactions/' + id); },

    create: async function(data) { return await apiRequest('/transactions', { method: 'POST', body: data }); },

    update: async function(id, data) { return await apiRequest('/transactions/' + id, { method: 'PUT', body: data }); },

    delete: async function(id) { return await apiRequest('/transactions/' + id, { method: 'DELETE' }); }
};

// Categories API
var CategoriesAPI = {
    getAll: async function() { return await apiRequest('/categories'); },
    create: async function(data) { return await apiRequest('/categories', { method: 'POST', body: data }); },
    update: async function(id, data) { return await apiRequest('/categories/' + id, { method: 'PUT', body: data }); },
    delete: async function(id) { return await apiRequest('/categories/' + id, { method: 'DELETE' }); }
};

// Dashboard API
var DashboardAPI = {
    get: async function() { return await apiRequest('/dashboard'); }
};

// Budget API (user + admin)
var BudgetAPI = {
    getAll: async function() { return await apiRequest('/budgets'); },
    create: async function(data) { return await apiRequest('/budgets', { method: 'POST', body: data }); },
    update: async function(id, data) { return await apiRequest('/budgets/' + id, { method: 'PUT', body: data }); },
    delete: async function(id) { return await apiRequest('/budgets/' + id, { method: 'DELETE' }); }
};

// Admin API
var AdminAPI = {
    getDashboard: async function(filters) {
        var params = [];
        if (filters) {
            for (var k in filters) { if (filters[k]) params.push(k + '=' + encodeURIComponent(filters[k])); }
        }
        return await apiRequest('/admin/dashboard' + (params.length ? '?' + params.join('&') : ''));
    },

    // User Management
    getUsers: async function(filters) {
        var params = [];
        if (filters) {
            for (var k in filters) { if (filters[k]) params.push(k + '=' + encodeURIComponent(filters[k])); }
        }
        return await apiRequest('/admin/users' + (params.length ? '?' + params.join('&') : ''));
    },

    getUser: async function(id) { return await apiRequest('/admin/users/' + id); },

    updateUser: async function(id, data) { return await apiRequest('/admin/users/' + id, { method: 'PUT', body: data }); },

    deleteUser: async function(id) { return await apiRequest('/admin/users/' + id, { method: 'DELETE' }); },

    // Transaction Management
    getTransactions: async function(filters) {
        var params = [];
        if (filters) {
            for (var k in filters) { if (filters[k]) params.push(k + '=' + encodeURIComponent(filters[k])); }
        }
        return await apiRequest('/admin/transactions' + (params.length ? '?' + params.join('&') : ''));
    },

    deleteTransaction: async function(id) { return await apiRequest('/admin/transactions/' + id, { method: 'DELETE' }); },

    bulkDeleteTransactions: async function(ids) {
        return await apiRequest('/admin/transactions/bulk-delete', { method: 'POST', body: { ids: ids } });
    },

    // Financial Analytics
    getAnalytics: async function(filters) {
        var params = [];
        if (filters) { for (var k in filters) { if (filters[k]) params.push(k + '=' + encodeURIComponent(filters[k])); } }
        return await apiRequest('/admin/analytics' + (params.length ? '?' + params.join('&') : ''));
    },

    getIncomeAnalytics: async function(filters) {
        var params = [];
        if (filters) { for (var k in filters) { if (filters[k]) params.push(k + '=' + encodeURIComponent(filters[k])); } }
        return await apiRequest('/admin/analytics/income' + (params.length ? '?' + params.join('&') : ''));
    },

    getExpenseAnalytics: async function(filters) {
        var params = [];
        if (filters) { for (var k in filters) { if (filters[k]) params.push(k + '=' + encodeURIComponent(filters[k])); } }
        return await apiRequest('/admin/analytics/expense' + (params.length ? '?' + params.join('&') : ''));
    },

    getCashFlowAnalytics: async function(filters) {
        var params = [];
        if (filters) { for (var k in filters) { if (filters[k]) params.push(k + '=' + encodeURIComponent(filters[k])); } }
        return await apiRequest('/admin/analytics/cashflow' + (params.length ? '?' + params.join('&') : ''));
    },

    // Category Usage
    getCategoryUsage: async function() { return await apiRequest('/admin/categories/usage'); },

    // Budget Management
    getBudgets: async function(filters) {
        var params = [];
        if (filters) { for (var k in filters) { if (filters[k]) params.push(k + '=' + encodeURIComponent(filters[k])); } }
        return await apiRequest('/admin/budgets' + (params.length ? '?' + params.join('&') : ''));
    },

    createBudget: async function(data) { return await apiRequest('/admin/budgets', { method: 'POST', body: data }); },
    updateBudget: async function(id, data) { return await apiRequest('/admin/budgets/' + id, { method: 'PUT', body: data }); },
    deleteBudget: async function(id) { return await apiRequest('/admin/budgets/' + id, { method: 'DELETE' }); },

    // Reports
    getReport: async function(filters) {
        var params = [];
        if (filters) { for (var k in filters) { if (filters[k]) params.push(k + '=' + encodeURIComponent(filters[k])); } }
        return await apiRequest('/admin/reports' + (params.length ? '?' + params.join('&') : ''));
    },

    downloadReport: async function(filters) {
        var token = getToken();
        var params = [];
        if (filters) { for (var k in filters) { if (filters[k]) params.push(k + '=' + encodeURIComponent(filters[k])); } }
        params.push('format=csv');
        var response = await fetch(API_BASE_URL + '/admin/reports?' + params.join('&'), {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) return { ok: false, data: { message: 'Download failed' } };
        var blob = await response.blob();
        return { ok: true, url: URL.createObjectURL(blob) };
    },

    // Data Quality
    getDataQuality: async function() { return await apiRequest('/admin/data-quality'); },

    // Forecast
    getForecast: async function(months) {
        return await apiRequest('/admin/forecast' + (months ? '?months=' + months : ''));
    },

    // Alerts
    getAlerts: async function() { return await apiRequest('/admin/alerts'); },
    markAlertRead: async function(id) { return await apiRequest('/admin/alerts/' + id + '/read', { method: 'POST' }); },

    // Activity Logs
    getActivityLogs: async function(filters) {
        var params = [];
        if (filters) { for (var k in filters) { if (filters[k]) params.push(k + '=' + encodeURIComponent(filters[k])); } }
        return await apiRequest('/admin/activity-logs' + (params.length ? '?' + params.join('&') : ''));
    },

    // Security
    getSecurity: async function() { return await apiRequest('/admin/security'); },

    // System Health
    getSystemHealth: async function() { return await apiRequest('/admin/system-health'); },

    // Settings
    getSettings: async function() { return await apiRequest('/admin/settings'); },
    updateSettings: async function(settings) { return await apiRequest('/admin/settings', { method: 'PUT', body: { settings: settings } }); },

    // Insights
    getInsights: async function() { return await apiRequest('/admin/insights'); }
};

// CSV API
var CSVAPI = {
    export: async function(type) {
        var token = getToken();
        var url = API_BASE_URL + '/csv/export';
        if (type) url += '?type=' + encodeURIComponent(type);
        var response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
        if (!response.ok) {
            var data = await response.json().catch(function() { return {}; });
            return { ok: false, data: data };
        }
        var blob = await response.blob();
        return { ok: true, url: URL.createObjectURL(blob) };
    },

    importFile: async function(file) {
        var token = getToken();
        var formData = new FormData();
        formData.append('csvFile', file);
        var response = await fetch(API_BASE_URL + '/csv/import', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        var data = await response.json().catch(function() { return { message: 'Import failed' }; });
        return { ok: response.ok, data: data };
    }
};
