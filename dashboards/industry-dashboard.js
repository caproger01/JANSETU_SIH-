/**
 * industry-dashboard.js
 * Industry CSR & Project Co-Financing Logic (Frontend Prototype)
 * Connects Industry partners with University projects solving citizen problems.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Logout
    const logoutBtn = document.getElementById('ind-logout-btn');
    if (logoutBtn && window.JanSetuState) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out of the Industry Portal?')) {
                window.JanSetuState.logout();
            }
        });
    }

    // Support Modal
    const supportModal = document.getElementById('support-modal');
    const closeSupportBtn = document.getElementById('close-support-btn');
    const cancelSupportBtn = document.getElementById('cancel-support-btn');
    const supportForm = document.getElementById('support-offer-form');

    let currentProjectId = null;

    window.openOfferSupport = function (projectId, projectTitle) {
        currentProjectId = projectId;
        document.getElementById('support-modal-title').textContent = `Offer Support: ${projectTitle}`;
        document.getElementById('support-modal-sub').textContent = `Project Code: ${projectId}`;
        if (supportModal) supportModal.classList.add('open');
    };

    function closeSupport() {
        if (supportModal) supportModal.classList.remove('open');
        currentProjectId = null;
    }

    if (closeSupportBtn) closeSupportBtn.addEventListener('click', closeSupport);
    if (cancelSupportBtn) cancelSupportBtn.addEventListener('click', closeSupport);

    if (supportForm) {
        supportForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const type = document.getElementById('support-type').value;
            const company = document.getElementById('support-company').value.trim();
            const details = document.getElementById('support-details').value.trim();
            const notes = document.getElementById('support-notes').value.trim();

            if (window.JanSetuState) {
                window.JanSetuState.addSupportOffer(currentProjectId, {
                    type: type,
                    company: company,
                    details: details,
                    notes: notes
                });
            }

            alert(`Thank you! Your offer of ${type} has been officially recorded and communicated to the faculty lead.`);

            closeSupport();
            updateIndNotifBadge();
        });
    }

    // Notifications
    const indNotifModal = document.getElementById('ind-notif-modal');
    const openIndNotifBtn = document.getElementById('open-ind-notif-btn');
    const closeIndNotifBtn = document.getElementById('close-ind-notif-btn');
    const dismissIndNotifBtn = document.getElementById('dismiss-ind-notif-btn');

    function updateIndNotifBadge() {
        if (!window.JanSetuState) return;
        const notifs = window.JanSetuState.getNotifications('industry');
        const unread = notifs.filter(n => !n.read).length;
        const badge = document.getElementById('ind-notif-badge');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }
    }

    function renderIndNotifications() {
        const container = document.getElementById('ind-notif-list');
        if (!container || !window.JanSetuState) return;

        const notifs = window.JanSetuState.getNotifications('industry');
        container.innerHTML = '';

        if (notifs.length === 0) {
            container.innerHTML = '<p style="font-size:12px; color:#777; text-align:center; padding:16px;">No partnership notifications at this time.</p>';
            return;
        }

        notifs.forEach(notif => {
            const div = document.createElement('div');
            div.style.padding = '10px 12px';
            div.style.background = '#F9FAFB';
            div.style.border = '1px solid #E5E7EB';
            div.style.borderRadius = '4px';
            div.style.marginBottom = '8px';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <strong style="color:var(--color-primary); font-size:13px;">${notif.title}</strong>
                    <span style="font-size:10px; color:#999;">${notif.time || 'Recent'}</span>
                </div>
                <p style="font-size:12px; color:#444; line-height:1.4;">${notif.message}</p>
            `;
            container.appendChild(div);
        });
    }

    if (openIndNotifBtn) {
        openIndNotifBtn.addEventListener('click', () => {
            renderIndNotifications();
            if (indNotifModal) indNotifModal.classList.add('open');
        });
    }

    if (closeIndNotifBtn) closeIndNotifBtn.addEventListener('click', () => indNotifModal.classList.remove('open'));
    if (dismissIndNotifBtn) dismissIndNotifBtn.addEventListener('click', () => indNotifModal.classList.remove('open'));

    updateIndNotifBadge();
});
