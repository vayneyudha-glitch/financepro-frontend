/* ============================================================
   ADMIN-SETTINGS.JS — System Settings
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-settings');
initSidebarMobile();
initThemeToggle();

async function loadSettings() {
    var container = document.getElementById('settingsContent');
    container.innerHTML = '<div class="loading-state">Loading settings...</div>';

    var result = await AdminAPI.getSettings();
    if (!result.ok) { container.innerHTML = errorStateHtml('Failed to load'); return; }

    var data = result.data.data.raw;

    var html = '<div class="card"><div class="card-header card-header-actions">' +
        '<h3>System Settings</h3>' +
        '<button class="btn btn-primary" id="saveSettingsBtn">Save Changes</button>' +
    '</div><div class="card-body">';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">';
    data.forEach(function(item) {
        html += '<div class="form-group">' +
            '<label>' + escapeHtml(item.description || item.key) + '</label>' +
            '<input type="text" class="form-input setting-input" data-key="' + escapeHtml(item.key) + '" value="' + escapeHtml(item.value || '') + '">' +
            '<small style="color:var(--text-light);">' + escapeHtml(item.key) + '</small>' +
        '</div>';
    });
    html += '</div></div></div>';

    container.innerHTML = html;

    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
}

async function saveSettings() {
    var settings = {};
    document.querySelectorAll('.setting-input').forEach(function(input) {
        settings[input.dataset.key] = input.value;
    });

    var result = await AdminAPI.updateSettings(settings);
    if (result.ok) showToast('Settings saved successfully!', 'success');
    else showToast(result.data.message || 'Failed to save', 'error');
}

document.addEventListener('DOMContentLoaded', loadSettings);
