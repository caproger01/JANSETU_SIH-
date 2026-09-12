/**
 * JanSetu Dashboard Authentication & Session Verifier
 * Foundation for role-based dashboard protection
 */

async function initDashboardAuth(expectedRole) {
    // 1. Check whether a token exists
    const token = window.JanSetuAuth ? window.JanSetuAuth.getToken() : localStorage.getItem('jansetu_access_token');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    // 2. Call /api/auth/me to verify real session in PostgreSQL
    const response = await window.JanSetuAuth.getMe();

    // 3. If authentication fails, redirect to login
    if (!response.ok || !response.data || !response.data.success || !response.data.user) {
        window.JanSetuAuth.logout();
        return;
    }

    // 4. Use the returned authenticated user information
    const user = response.data.user;

    // Populate user details in UI
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    const roleEl = document.getElementById('userRole');
    const idEl = document.getElementById('userId');
    const mobileEl = document.getElementById('userMobile');

    if (nameEl) nameEl.textContent = user.name || 'User';
    if (emailEl) emailEl.textContent = user.email || '';
    if (roleEl) roleEl.textContent = user.role || 'Unassigned';
    if (idEl) idEl.textContent = `#${user.id}`;
    if (mobileEl) mobileEl.textContent = user.mobile || 'Not specified';

    // Role mismatch detection: if authenticated user has a different role, display notice
    const mismatchEl = document.getElementById('roleMismatchNotice');
    if (mismatchEl && user.role && expectedRole && user.role !== expectedRole) {
        const correctUrl = window.JanSetuAuth.getDashboardUrl(user.role, true);
        mismatchEl.innerHTML = `
            Notice: Your assigned role in PostgreSQL is <strong>${user.role.toUpperCase()}</strong>. 
            <a href="${correctUrl}">Click here to go to your ${user.role} dashboard</a>.
        `;
        mismatchEl.style.display = 'block';
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.JanSetuAuth.logout();
        });
    }
}
