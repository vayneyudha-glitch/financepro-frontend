/* ============================================================
   UTILS.JS — Utility Functions
   ============================================================ */

// Format number as Rupiah
function formatRupiah(amount) {
    var num = Number(amount);
    if (isNaN(num) || !isFinite(num)) return 'Rp 0';
    return 'Rp ' + num.toLocaleString('id-ID');
}

// Format date string
function formatDate(dateStr) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Format datetime
function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Get today's date in YYYY-MM-DD
function getToday() {
    return new Date().toISOString().split('T')[0];
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Debounce for search
function debounce(fn, delay) {
    var timer = null;
    return function() {
        var context = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function() { fn.apply(context, args); }, delay || 300);
    };
}
/* Authentication helpers — delegated to auth.js for full implementation.
   These are kept here so that pages that only load utils.js + api.js
   (e.g. login/register) still have basic session helpers available.
   If auth.js is loaded after utils.js, its richer versions take precedence. */
function getSession() {
    var session = localStorage.getItem(AUTH_KEYS.SESSION);
    if (!session) return null;

    try {
        return JSON.parse(session);
    } catch (err) {
        localStorage.removeItem(AUTH_KEYS.SESSION);
        return null;
    }
}

function isLoggedIn() {
    return !!getToken() && !!getSession();
}

function isAdmin() {
    var session = getSession();
    return !!session && session.role === 'ADMIN';
}

function doLogout() {
    if (typeof AuthAPI !== 'undefined' && AuthAPI.logout) {
        AuthAPI.logout().finally(function() {
            clearToken();
            localStorage.removeItem(AUTH_KEYS.SESSION);
            window.history.replaceState({ loggedOut: true }, '', 'login.html');
            window.location.replace('login.html');
        });
    } else {
        clearToken();
        localStorage.removeItem(AUTH_KEYS.SESSION);
        window.history.replaceState({ loggedOut: true }, '', 'login.html');
        window.location.replace('login.html');
    }
}