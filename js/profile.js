/* ============================================================
   PROFILE.JS — Profile Page Logic
   ============================================================ */

requireAuth();
initProtectedPageGuard();
renderSidebar('profile');
initSidebarMobile();
initThemeToggle();

// --- Local profile-photo state ---
var pendingPhotoDataUrl = null;   // base64 data URL picked by user, not yet uploaded
var MAX_PHOTO_BYTES = 12 * 1024 * 1024; // matches backend limit

// --- Render helpers ---

function renderProfilePhoto(avatarUrl) {
    var img = document.getElementById('profilePhotoPreview');
    var placeholder = document.getElementById('profilePhotoPlaceholder');
    if (!img || !placeholder) return;
    // Determine role-aware default avatar SVG (local asset)
    var session = getSession();
    var defaultAvatar = (session && session.role === 'ADMIN')
        ? 'assets/admin-avatar.svg'
        : 'assets/user-avatar.svg';

    if (avatarUrl) {
        // User-uploaded photo
        img.src = avatarUrl;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        // Show role-aware default avatar SVG (real image, not empty)
        img.src = defaultAvatar;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    }
}

function setUploadButtonState() {
    var btn = document.getElementById('btnUploadPhoto');
    if (!btn) return;
    btn.disabled = !pendingPhotoDataUrl;
}

// --- Profile loading ---

async function loadProfile() {
    var result = await AuthAPI.getMe();
    if (!result.ok) {
        showToast('Failed to load profile', 'error');
        return;
    }

    var user = result.data.data;
    var infoContainer = document.getElementById('profileInfo');

    var html = '<div class="profile-grid">' +
        '<div class="profile-item"><span class="profile-label">Name</span><span class="profile-value">' + escapeHtml(user.name) + '</span></div>' +
        '<div class="profile-item"><span class="profile-label">Email</span><span class="profile-value">' + escapeHtml(user.email) + '</span></div>' +
        '<div class="profile-item"><span class="profile-label">Phone</span><span class="profile-value">' + escapeHtml(user.phone || '-') + '</span></div>' +
        '<div class="profile-item"><span class="profile-label">Role</span><span class="profile-value"><span class="badge ' + (user.role === 'ADMIN' ? 'badge-expense' : 'badge-income') + '">' + user.role + '</span></span></div>' +
        '<div class="profile-item"><span class="profile-label">Status</span><span class="profile-value"><span class="badge ' + (user.status === 'ACTIVE' ? 'badge-income' : 'badge-expense') + '">' + user.status + '</span></span></div>' +
        '<div class="profile-item"><span class="profile-label">Member Since</span><span class="profile-value">' + formatDate(user.createdAt) + '</span></div>' +
        '</div>';

    infoContainer.innerHTML = html;

    // Populate edit form
    document.getElementById('profileName').value = user.name || '';
    document.getElementById('profileEmail').value = user.email || '';
    document.getElementById('profilePhone').value = user.phone || '';
    document.getElementById('profileRole').value = user.role || '';

    // Render photo (server avatar is the source of truth after load)
    renderProfilePhoto(user.avatarUrl || null);
    // Also reflect in session so sidebar/profile menus show it
    var session = getSession();
    if (session) {
        session.avatarUrl = user.avatarUrl || null;
        localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(session));
    }
    pendingPhotoDataUrl = null;
    setUploadButtonState();
}

// --- Profile photo: file picker → preview → upload ---

document.getElementById('profilePhotoInput').addEventListener('change', function(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
        showToast('Please choose a PNG, JPG, WEBP, or GIF image.', 'error');
        e.target.value = '';
        return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
        showToast('Photo is too large. Maximum 12 MB.', 'error');
        e.target.value = '';
        return;
    }

    var reader = new FileReader();
    reader.onload = function(ev) {
        pendingPhotoDataUrl = ev.target.result;
        renderProfilePhoto(pendingPhotoDataUrl);
        setUploadButtonState();
    };
    reader.onerror = function() {
        showToast('Failed to read the selected file.', 'error');
    };
    reader.readAsDataURL(file);
});

document.getElementById('btnUploadPhoto').addEventListener('click', async function() {
    if (!pendingPhotoDataUrl) return;
    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    try {
        var result = await AuthAPI.uploadAvatar(pendingPhotoDataUrl);
        if (!result.ok) {
            showToast(result.data.message || 'Upload failed.', 'error');
            btn.disabled = false;
            btn.textContent = 'Upload';
            return;
        }
        showToast('Profile photo updated!', 'success');
        // Refresh from server so we have the canonical URL stored on session
        await loadProfile();
        // Refresh sidebar so it shows the new avatar
        renderSidebar('profile');
    } catch (err) {
        showToast('Upload failed: ' + (err && err.message ? err.message : 'unknown error'), 'error');
        btn.disabled = false;
        btn.textContent = 'Upload';
    }
});

document.getElementById('btnRemovePhoto').addEventListener('click', async function() {
    var btn = this;
    if (typeof showConfirm === 'function') {
        showConfirm('Remove your profile photo?', async function() {
            await doRemovePhoto(btn);
        });
    } else {
        await doRemovePhoto(btn);
    }
});

async function doRemovePhoto(btn) {
    btn.disabled = true;
    btn.textContent = 'Removing...';
    var result = await AuthAPI.removeAvatar();
    btn.disabled = false;
    btn.textContent = 'Remove';
    if (!result.ok) {
        showToast(result.data.message || 'Failed to remove photo.', 'error');
        return;
    }
    showToast('Profile photo removed.', 'success');
    pendingPhotoDataUrl = null;
    await loadProfile();
    renderSidebar('profile');
}

// --- Edit profile ---

document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    var data = {
        name: document.getElementById('profileName').value.trim(),
        phone: document.getElementById('profilePhone').value.trim()
    };

    var btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Saving...';

    var result = await AuthAPI.updateProfile(data);
    btn.disabled = false; btn.textContent = 'Save Changes';

    if (!result.ok) {
        showToast(result.data.message || 'Failed to update', 'error');
        return;
    }

    // Update session
    var session = getSession();
    if (session) {
        session.name = data.name;
        session.phone = data.phone;
        localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(session));
    }

    showToast('Profile updated!', 'success');
    renderSidebar('profile');
    loadProfile();
});

// --- Change password ---

document.getElementById('changePasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    var currentPassword = document.getElementById('currentPassword').value;
    var newPassword = document.getElementById('newPassword').value;
    var confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (!currentPassword || !newPassword) {
        showToast('All fields are required', 'error');
        return;
    }
    if (newPassword.length < 8) {
        showToast('New password must be at least 8 characters', 'error');
        return;
    }
    if (newPassword !== confirmNewPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    var btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Saving...';

    var result = await AuthAPI.changePassword(currentPassword, newPassword);
    btn.disabled = false; btn.textContent = 'Change Password';

    if (!result.ok) {
        showToast(result.data.message || 'Failed to change password', 'error');
        return;
    }

    showToast('Password changed successfully!', 'success');
    this.reset();
});

// --- Initialize ---

document.addEventListener('DOMContentLoaded', function() {
    loadProfile();
});