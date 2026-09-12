/**
 * government-dashboard.js
 * Government Command Center & Municipal Analytics Logic (Frontend Prototype)
 * Handles Leaflet GIS Geotags, Real-Time Problem Sync from Citizen Submissions,
 * Category Distribution Charts, Problem Management & Status Updates, AI Insights,
 * and Session Logout.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // 2. Logout Handler
    const logoutBtn = document.getElementById('govt-logout-btn');
    if (logoutBtn && window.JanSetuState) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out of the Government Command Center?')) {
                window.JanSetuState.logout();
            }
        });
    }

    // 3. Initialize Leaflet Map
    const mapElement = document.getElementById('cmd-map');
    let map = null;
    let markerGroup = null;

    if (mapElement && typeof L !== 'undefined') {
        const defaultCenter = [28.6139, 77.2090];
        map = L.map('cmd-map', {
            zoomControl: true,
            attributionControl: false
        }).setView(defaultCenter, 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18
        }).addTo(map);

        setTimeout(() => {
            map.invalidateSize();
        }, 200);

        markerGroup = L.layerGroup().addTo(map);
    }

    // 4. Data Sync & Command Center Logic
    let currentManagingProblem = null;

    function loadCommandCenterData() {
        if (markerGroup) markerGroup.clearLayers();
        const tbody = document.getElementById('cmd-table-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Read from centralized JanSetuState
        const issues = window.JanSetuState ? window.JanSetuState.getProblems() : [];

        // 5 KPI Metric Calculations
        const totalCount = issues.length;
        const criticalCount = issues.filter(i => (i.severity >= 8) || i.urgency === 'CRITICAL').length;
        const resolvedCount = issues.filter(i => i.status === 'RESOLVED').length;
        const totalImpacted = issues.reduce((acc, curr) => acc + (curr.affectedPeople || 400), 0);

        const kpiTotal = document.getElementById('kpi-total');
        const kpiCritical = document.getElementById('kpi-critical');
        const kpiResolved = document.getElementById('kpi-resolved');
        const kpiImpacted = document.getElementById('kpi-impacted');

        if (kpiTotal) kpiTotal.textContent = totalCount;
        if (kpiCritical) kpiCritical.textContent = criticalCount;
        if (kpiResolved) kpiResolved.textContent = resolvedCount;
        if (kpiImpacted) kpiImpacted.textContent = totalImpacted.toLocaleString() + '+';

        let categoryCounts = {};

        if (issues.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#777; padding:24px;">No incoming data synced from citizen portals.</td></tr>`;
            renderChart({}, 0);
            return;
        }

        issues.forEach(issue => {
            // 1. Add Map Marker
            if (map && markerGroup && issue.lat && issue.lng) {
                let markerColor = '#075844'; // Default Green (Submitted)
                if (issue.status === 'UNDER REVIEW') markerColor = '#F59E0B'; // Amber
                if (issue.status === 'UNIVERSITY ASSIGNED') markerColor = '#2563EB'; // Blue
                if (issue.status === 'RESOLVED') markerColor = '#10B981'; // Emerald
                if (issue.severity >= 8 && issue.status !== 'RESOLVED') markerColor = '#DC2626'; // Red for critical

                const pinIcon = L.divIcon({
                    className: 'map-pin-div',
                    html: `
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="${markerColor}" stroke="#FFFFFF" stroke-width="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3" fill="#FFFFFF"></circle>
                        </svg>
                    `,
                    iconSize: [26, 26],
                    iconAnchor: [13, 26],
                    popupAnchor: [0, -26]
                });

                L.marker([issue.lat, issue.lng], { icon: pinIcon }).addTo(markerGroup)
                    .bindPopup(`<strong>${issue.title}</strong><br>ID: ${issue.id}<br>Ward: ${issue.ward || 'Zone'}<br>Status: <strong>${issue.status}</strong>`);
            }

            // 2. Category Tally
            const cat = issue.category || 'Public Infrastructure';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

            // 3. Render Table Row
            let pillClass = 'status-submitted';
            if (issue.status === 'UNDER REVIEW') pillClass = 'status-review';
            if (issue.status === 'UNIVERSITY ASSIGNED') pillClass = 'status-review';
            if (issue.status === 'RESOLVED') pillClass = 'status-submitted';

            const severityHtml = (issue.severity >= 8)
                ? `<span style="color:#DC2626; font-weight:700;">${issue.severity || 8}/10 &bull; CRITICAL</span>`
                : `<span>${issue.severity || 6}/10 &bull; ${issue.urgency || 'MEDIUM'}</span>`;

            const tr = document.createElement('tr');
            tr.className = 'issue-item';
            tr.setAttribute('data-id', issue.id);
            tr.innerHTML = `
                <td>
                    <span class="issue-title-text">${issue.title}</span>
                    <span class="issue-meta-text">ID: ${issue.id} &bull; ${issue.date || 'Recent'}</span>
                </td>
                <td>${issue.ward || 'Ward 12'}</td>
                <td>${issue.category}</td>
                <td>${severityHtml}</td>
                <td>
                    <span class="status-pill ${pillClass}">${issue.status}</span>
                </td>
                <td>
                    <button type="button" class="view-btn manage-btn" data-id="${issue.id}">Manage &rsaquo;</button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();

        // Bind manage click handler
        document.querySelectorAll('.manage-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const probId = btn.getAttribute('data-id');
                openManageModal(probId);
            };
        });

        // Click row to center map
        document.querySelectorAll('#cmd-table-tbody tr').forEach(row => {
            row.onclick = () => {
                const probId = row.getAttribute('data-id');
                const issue = issues.find(i => String(i.id) === String(probId));
                if (issue && map && issue.lat && issue.lng) {
                    map.panTo([issue.lat, issue.lng], { animate: true, duration: 0.5 });
                }
            };
        });

        // Render Category Breakdown Bars
        renderChart(categoryCounts, issues.length);
    }

    // Render Category Breakdown as Professional Progress Bars (Fixed Syntax!)
    function renderChart(counts, total) {
        const container = document.getElementById('cmd-chart-container');
        if (!container) return;
        container.innerHTML = '';

        if (!total || total === 0) {
            container.innerHTML = '<p style="font-size:12px; color:#777; text-align:center;">No category data ingested yet.</p>';
            return;
        }

        for (const [cat, count] of Object.entries(counts)) {
            const percentage = Math.round((count / total) * 100);

            const progressItem = document.createElement('div');
            progressItem.className = 'progress-item';
            progressItem.innerHTML = `
                <div class="progress-info">
                    <span>${cat}</span>
                    <strong>${count} (${percentage}%)</strong>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-fill" style="width: ${percentage}%;"></div>
                </div>
            `;
            container.appendChild(progressItem);
        }
    }

    // 5. Manage Problem Modal Logic
    const manageModal = document.getElementById('manage-modal');
    const closeMgmtBtn = document.getElementById('close-mgmt-btn');
    const cancelMgmtBtn = document.getElementById('cancel-mgmt-btn');
    const saveMgmtBtn = document.getElementById('save-mgmt-btn');

    function openManageModal(problemId) {
        if (!window.JanSetuState || !manageModal) return;
        const prob = window.JanSetuState.getProblemById(problemId);
        if (!prob) return;
        currentManagingProblem = prob;

        document.getElementById('mgmt-title').textContent = prob.title;
        document.getElementById('mgmt-id').textContent = prob.id;
        document.getElementById('mgmt-ward').textContent = prob.ward || 'Ward 12';
        document.getElementById('mgmt-desc').textContent = prob.description || 'No details.';

        const statusSelect = document.getElementById('mgmt-status-select');
        if (statusSelect) {
            statusSelect.value = prob.status || 'SUBMITTED';
        }

        const remarksInput = document.getElementById('mgmt-remarks');
        if (remarksInput) {
            remarksInput.value = prob.adminRemarks || '';
        }

        manageModal.classList.add('open');
    }

    function closeManageModal() {
        if (manageModal) manageModal.classList.remove('open');
        currentManagingProblem = null;
    }

    if (closeMgmtBtn) closeMgmtBtn.addEventListener('click', closeManageModal);
    if (cancelMgmtBtn) cancelMgmtBtn.addEventListener('click', closeManageModal);

    if (saveMgmtBtn) {
        saveMgmtBtn.addEventListener('click', () => {
            if (!currentManagingProblem || !window.JanSetuState) return;

            const newStatus = document.getElementById('mgmt-status-select').value;
            const remarks = document.getElementById('mgmt-remarks').value.trim();

            window.JanSetuState.updateProblemStatus(currentManagingProblem.id, newStatus, remarks);

            alert(`Status for Problem ${currentManagingProblem.id} successfully updated to "${newStatus}".`);

            closeManageModal();
            loadCommandCenterData();
            updateGovtNotifBadge();
        });
    }

    // 6. AI Insights Modal Logic
    const aiModal = document.getElementById('ai-insights-modal');
    const btnOpenAi = document.getElementById('btn-open-ai-summary');
    const menuAiInsights = document.getElementById('menu-ai-insights');
    const closeAiBtn = document.getElementById('close-ai-modal-btn');
    const dismissAiBtn = document.getElementById('dismiss-ai-modal-btn');

    function showAiInsights() {
        if (aiModal) aiModal.classList.add('open');
    }

    function hideAiInsights() {
        if (aiModal) aiModal.classList.remove('open');
    }

    if (btnOpenAi) btnOpenAi.addEventListener('click', showAiInsights);
    if (menuAiInsights) menuAiInsights.addEventListener('click', (e) => {
        e.preventDefault();
        showAiInsights();
    });
    if (closeAiBtn) closeAiBtn.addEventListener('click', hideAiInsights);
    if (dismissAiBtn) dismissAiBtn.addEventListener('click', hideAiInsights);

    // 7. Government Notifications Modal
    const govtNotifModal = document.getElementById('govt-notif-modal');
    const openGovtNotifBtn = document.getElementById('open-cmd-notif-btn');
    const menuCmdNotifs = document.getElementById('menu-cmd-notifs');
    const closeGovtNotifBtn = document.getElementById('close-govt-notif-btn');
    const dismissGovtNotifBtn = document.getElementById('dismiss-govt-notif-btn');

    function updateGovtNotifBadge() {
        if (!window.JanSetuState) return;
        const notifs = window.JanSetuState.getNotifications('government');
        const unread = notifs.filter(n => !n.read).length;
        const badge = document.getElementById('cmd-notif-badge');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }
    }

    function renderGovtNotifications() {
        const container = document.getElementById('govt-notif-list');
        if (!container || !window.JanSetuState) return;

        const notifs = window.JanSetuState.getNotifications('government');
        container.innerHTML = '';

        if (notifs.length === 0) {
            container.innerHTML = '<p style="font-size:12px; color:#777; text-align:center; padding:16px;">No authority alerts at this time.</p>';
            return;
        }

        notifs.forEach(notif => {
            const item = document.createElement('div');
            item.className = `notif-item ${notif.read ? '' : 'unread'}`;
            item.innerHTML = `
                <div style="color:var(--color-primary); margin-top:2px;">
                    <i data-lucide="shield-alert"></i>
                </div>
                <div class="notif-body">
                    <div class="notif-head">
                        <span class="notif-title">${notif.title}</span>
                        <span class="notif-time">${notif.time || 'Recently'}</span>
                    </div>
                    <p class="notif-text">${notif.message}</p>
                </div>
            `;
            container.appendChild(item);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    function showGovtNotifs() {
        renderGovtNotifications();
        if (govtNotifModal) govtNotifModal.classList.add('open');
    }

    function hideGovtNotifs() {
        if (govtNotifModal) govtNotifModal.classList.remove('open');
    }

    if (openGovtNotifBtn) openGovtNotifBtn.addEventListener('click', showGovtNotifs);
    if (menuCmdNotifs) menuCmdNotifs.addEventListener('click', (e) => {
        e.preventDefault();
        showGovtNotifs();
    });
    if (closeGovtNotifBtn) closeGovtNotifBtn.addEventListener('click', hideGovtNotifs);
    if (dismissGovtNotifBtn) dismissGovtNotifBtn.addEventListener('click', hideGovtNotifs);

    // Initial Load
    loadCommandCenterData();
    updateGovtNotifBadge();
});