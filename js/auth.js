/* ============================================================
   AUTH.JS — Authentication & Authorization Module
   ============================================================
   Includes:
   - Session/token management
   - Route guards (requireAuth, requireAdmin)
   - Session guard: prevents browser Back/Forward button from
     returning to login/register while logged in
   - Protected page guard: validates session on Back/Forward
     navigation and prevents access to cached protected pages
   - Logout with server-side token invalidation
   ============================================================ */

// --- Session management ---

function getSession() {
    try {
        var raw = localStorage.getItem(AUTH_KEYS.SESSION);
        if (!raw) return null;
        var s = JSON.parse(raw);
        if (!s || !s.email || !s.role) return null;
        return s;
    } catch (e) { return null; }
}

function setSession(user) {
    localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(user));
}

function isLoggedIn() {
    return getSession() !== null && getToken() !== null;
}

function isAdmin() {
    var s = getSession();
    return s && s.role === 'ADMIN';
}

function isUser() {
    var s = getSession();
    return s && s.role === 'USER';
}

// --- Route guards ---

function requireAuth() {
    if (!isLoggedIn()) {
        window.location.replace('login.html');
        return false;
    }
    return true;
}

function requireAdmin() {
    if (!isLoggedIn()) {
        window.location.replace('login.html');
        return false;
    }
    if (!isAdmin()) {
        window.location.replace('dashboard.html');
        return false;
    }
    return true;
}

// --- Session guard: prevent Back button to login/register ---

/**
 * Call this on login/register pages.
 * If the user is already logged in, redirect to dashboard/admin
 * and push the current page into history so Back doesn't return.
 */
function redirectIfLoggedIn() {
    if (isLoggedIn()) {
        var dest = isAdmin() ? 'admin.html' : 'dashboard.html';
        // Replace current history entry so Back can't return to auth page
        window.history.replaceState({ redirected: true }, '', dest);
        window.location.replace(dest);
    }
}

// --- Protected page guard ---

/**
 * Call this on protected pages (dashboard, admin, etc.).
 * Sets up popstate listener to re-check auth on Back/Forward button.
 * If the user somehow lands back on a protected page without
 * a valid session, they are redirected to login.
 *
 * Also validates the token with the server to prevent access via
 * cached pages after logout from another tab/device.
 */
function initProtectedPageGuard() {
    // Push a state entry so popstate fires on Back/Forward
    window.history.pushState({ protected: true }, '', window.location.href);

    window.addEventListener('popstate', function() {
        if (!isLoggedIn()) {
            window.location.replace('login.html');
            return;
        }
        // Re-push to keep guard active and block further Back navigation
        window.history.pushState({ protected: true }, '', window.location.href);

        // Validate token with server — if invalid, redirect to login
        validateSessionAndRedirect();
    });

    // Also validate on page show (handles bfcache restore)
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            // Page was restored from bfcache — re-validate auth
            if (!isLoggedIn()) {
                window.location.replace('login.html');
            } else {
                validateSessionAndRedirect();
            }
        }
    });

    // Validate session with server on initial page load
    // This prevents access to cached pages after logout from another tab/device
    validateSessionAndRedirect();
}

/**
 * Validate the current session token with the server.
 * If invalid/expired/blacklisted, clear local state and redirect to login.
 */
async function validateSessionAndRedirect() {
    try {
        if (typeof AuthAPI === 'undefined' || !AuthAPI.getMe) return;
        var result = await AuthAPI.getMe();
        if (!result.ok) {
            // Token invalid or blacklisted — clear and redirect
            clearToken();
            localStorage.removeItem(AUTH_KEYS.SESSION);
            window.history.replaceState({ loggedOut: true }, '', 'login.html');
            window.location.replace('login.html');
        }
    } catch (e) {
        // Network error — don't redirect, let local state decide
    }
}

// --- Logout ---

async function doLogout() {
    try {
        if (typeof AuthAPI !== 'undefined' && AuthAPI.logout) {
            await AuthAPI.logout();
        }
    } catch (e) {
        // Ignore network errors — clear local state regardless
    }
    clearToken();
    localStorage.removeItem(AUTH_KEYS.SESSION);
    // Replace history so Back/Forward button can't reach protected pages
    window.history.replaceState({ loggedOut: true }, '', 'login.html');
    window.location.replace('login.html');
}
