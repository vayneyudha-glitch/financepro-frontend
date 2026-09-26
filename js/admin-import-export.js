/* ============================================================
   ADMIN-IMPORT-EXPORT.JS — Data Center (Import/Export)
   ============================================================ */

requireAdmin();
initProtectedPageGuard();
renderSidebar('admin-import-export');
initSidebarMobile();
initThemeToggle();

document.addEventListener('DOMContentLoaded', function() {
    // Import
    document.getElementById('importBtn').addEventListener('click', async function() {
        var fileInput = document.getElementById('csvFile');
        var file = fileInput.files[0];
        var resultDiv = document.getElementById('importResult');

        if (!file) { showToast('Please select a CSV file', 'error'); return; }

        resultDiv.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Importing...</p></div>';

        var result = await CSVAPI.importFile(file);
        if (result.ok) {
            var d = result.data.data || result.data;
            resultDiv.innerHTML = '<div class="alert alert-success">' +
                '<p><strong>Import Complete!</strong></p>' +
                '<p>Total: ' + (d.total || 0) + ' | Success: ' + (d.success || d.imported || 0) + ' | Failed: ' + (d.failed || 0) + '</p>' +
                (d.errors && d.errors.length > 0 ? '<details><summary>Errors</summary><pre>' + escapeHtml(JSON.stringify(d.errors, null, 2)) + '</pre></details>' : '') +
            '</div>';
            showToast('Import complete', 'success');
            fileInput.value = '';
        } else {
            resultDiv.innerHTML = '<div class="alert alert-danger"><p>' + escapeHtml(result.data.message || 'Import failed') + '</p></div>';
            showToast('Import failed', 'error');
        }
    });

    // Export buttons
    document.getElementById('exportTransactions').addEventListener('click', async function() {
        var result = await CSVAPI.export('transactions');
        if (result.ok) { window.open(result.url, '_blank'); showToast('Export started', 'success'); }
        else showToast('Export failed', 'error');
    });

    document.getElementById('exportUsers').addEventListener('click', async function() {
        var result = await CSVAPI.export('users');
        if (result.ok) { window.open(result.url, '_blank'); showToast('Export started', 'success'); }
        else showToast('Export failed', 'error');
    });

    document.getElementById('exportCategories').addEventListener('click', async function() {
        var result = await CSVAPI.export('categories');
        if (result.ok) { window.open(result.url, '_blank'); showToast('Export started', 'success'); }
        else showToast('Export failed', 'error');
    });
});
