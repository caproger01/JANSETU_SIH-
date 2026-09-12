/**
 * citizen-dashboard.js
 * Comprehensive Citizen Portal Interactive Logic (Frontend Prototype)
 * Handles Leaflet Map, LocalStorage Problem Sync, Mock AI Pre-Screening,
 * Duplicate Detection, Problem Details Timeline, Notifications, and Session.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // 2. Display Logged In User
    const userDisplay = document.getElementById('user-display-name');
    if (userDisplay && window.JanSetuState) {
        const user = window.JanSetuState.getUser();
        userDisplay.textContent = user.name || 'Citizen Account';
    }

    // 3. Header Logout
    const logoutBtn = document.getElementById('citizen-logout-btn');
    if (logoutBtn && window.JanSetuState) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out of JanSetu?')) {
                window.JanSetuState.logout();
            }
        });
    }

    // 4. Initialize Leaflet Map
    const mapElement = document.getElementById('citizen-map');
    let map = null;
    let markerGroup = null;

    if (mapElement && typeof L !== 'undefined') {
        const defaultCenter = [28.6139, 77.2090];
        map = L.map('citizen-map', {
            zoomControl: true,
            attributionControl: false
        }).setView(defaultCenter, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18
        }).addTo(map);

        setTimeout(() => {
            map.invalidateSize();
        }, 200);

        markerGroup = L.layerGroup().addTo(map);
    }

    // Pin Helper Function
    function addPin(lat, lng, label, selected = false, status = 'SUBMITTED') {
        if (!map || !markerGroup) return null;

        let color = '#075844'; // default gov green
        if (status === 'UNDER REVIEW') color = '#F59E0B';
        if (status === 'UNIVERSITY ASSIGNED') color = '#2563EB';
        if (status === 'RESOLVED') color = '#10B981';
        if (selected) color = '#FF9933'; // Saffron highlight for selected

        const pinIcon = L.divIcon({
            className: 'map-pin-div',
            html: `
                <svg width="28" height="28" viewBox="0 0 24 24" fill="${color}" stroke="#FFFFFF" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3" fill="#FFFFFF"></circle>
                </svg>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 28],
            popupAnchor: [0, -28]
        });

        const mark = L.marker([lat, lng], { icon: pinIcon }).addTo(markerGroup);
        mark.bindPopup(`<strong>${label}</strong><br><span style="font-size:11px;">Status: ${status}</span>`);
        if (selected) mark.openPopup();
        return mark;
    }

    // 5. Load Problems from JanSetuState into Table & Map
    function loadProblemsTable() {
        const tbody = document.getElementById('issues-body');
        if (!tbody) return;

        if (markerGroup) markerGroup.clearLayers();
        tbody.innerHTML = '';

        const problems = window.JanSetuState ? window.JanSetuState.getProblems() : [];

        if (problems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: #666;">No civic problems reported yet. Click "Report New Problem" to submit.</td></tr>`;
            return;
        }

        problems.forEach((prob, index) => {
            const isFirst = index === 0;
            const lat = parseFloat(prob.lat) || 28.6139;
            const lng = parseFloat(prob.lng) || 77.2090;

            // Add pin to map
            if (map && markerGroup) {
                addPin(lat, lng, prob.title, isFirst, prob.status);
            }

            // Determine status pill style
            let pillClass = 'status-submitted';
            if (prob.status === 'UNDER REVIEW') pillClass = 'status-review';
            if (prob.status === 'UNIVERSITY ASSIGNED') pillClass = 'status-review';
            if (prob.status === 'RESOLVED') pillClass = 'status-submitted';

            const photoCount = prob.photos ? prob.photos.length : 0;

            const tr = document.createElement('tr');
            tr.className = `issue-item ${isFirst ? 'selected' : ''}`;
            tr.setAttribute('data-id', prob.id);
            tr.setAttribute('data-lat', lat);
            tr.setAttribute('data-lng', lng);
            tr.setAttribute('data-title', prob.title);

            tr.innerHTML = `
                <td>
                    <span class="issue-title-text">${prob.title}</span>
                    <span class="issue-meta-text">ID: ${prob.id} &bull; ${prob.ward || 'Ward Zone'} &bull; ${prob.date || 'Recent'}</span>
                </td>
                <td>
                    <span class="status-pill ${pillClass}">${prob.status}</span>
                </td>
                <td>${prob.category || 'General Civic'}</td>
                <td>
                    <span class="attachment-tag">
                        <i data-lucide="image"></i> ${photoCount} Photo${photoCount === 1 ? '' : 's'}
                    </span>
                </td>
                <td>
                    <button type="button" class="view-btn open-details-btn" data-id="${prob.id}">View &rsaquo;</button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }

        bindTableRows();
    }

    // Bind row click for map panning and details opening
    function bindTableRows() {
        const rows = document.querySelectorAll('.issue-item');
        rows.forEach(row => {
            row.onclick = (e) => {
                // If clicked "View" button, open details modal instead
                if (e.target && e.target.closest('.open-details-btn')) {
                    const probId = row.getAttribute('data-id');
                    openProblemDetails(probId);
                    return;
                }

                rows.forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');

                const lat = parseFloat(row.getAttribute('data-lat'));
                const lng = parseFloat(row.getAttribute('data-lng'));

                if (map && !isNaN(lat) && !isNaN(lng)) {
                    map.panTo([lat, lng], { animate: true, duration: 0.5 });
                }
            };
        });
    }

    // 6. Problem Details Modal with 6-stage Status Timeline
    const detailsModal = document.getElementById('problem-details-modal');
    const closeDetailsBtn = document.getElementById('close-details-btn');
    const dismissDetailsBtn = document.getElementById('dismiss-details-btn');
    const trackOnMapBtn = document.getElementById('track-on-map-btn');

    let currentDetailProblem = null;

    function openProblemDetails(problemId) {
        if (!window.JanSetuState || !detailsModal) return;

        const prob = window.JanSetuState.getProblemById(problemId);
        if (!prob) return;
        currentDetailProblem = prob;

        document.getElementById('detail-title').textContent = prob.title;
        document.getElementById('detail-id').textContent = prob.id;
        document.getElementById('detail-date').textContent = prob.date || 'Recent';
        document.getElementById('detail-category').textContent = `${prob.category} ${prob.subcategory ? '• ' + prob.subcategory : ''}`;
        document.getElementById('detail-location').textContent = `${prob.ward || 'Ward Area'} (${prob.location || 'Reported Site'})`;
        document.getElementById('detail-severity').textContent = `Severity ${prob.severity || 8}/10 • ${prob.urgency || 'HIGH'} Urgency`;
        document.getElementById('detail-affected').textContent = `${prob.affectedPeople || 500} Citizens`;
        document.getElementById('detail-desc').textContent = prob.description || 'No detailed description provided.';
        document.getElementById('detail-ai-summary').textContent = prob.aiSummary || 'Automated classification assigned to civic monitoring pipeline.';

        const statusPill = document.getElementById('detail-status-pill');
        statusPill.textContent = prob.status;
        statusPill.className = 'status-pill';
        if (prob.status === 'UNDER REVIEW') statusPill.classList.add('status-review');
        else if (prob.status === 'RESOLVED') statusPill.classList.add('status-submitted');
        else statusPill.classList.add('status-submitted');

        // Render 6-Stage Timeline
        renderTimeline(prob);

        detailsModal.classList.add('open');
        if (window.lucide) window.lucide.createIcons();
    }

    function renderTimeline(prob) {
        const container = document.getElementById('detail-timeline-steps');
        if (!container) return;

        const stages = [
            { name: 'Reported', date: prob.date || '04 Sep 2026' },
            { name: 'AI Analyzed', date: prob.date || '04 Sep 2026' },
            { name: 'Under Review', date: (prob.status !== 'SUBMITTED') ? '05 Sep 2026' : 'Pending' },
            { name: 'University Assigned', date: (prob.status === 'UNIVERSITY ASSIGNED' || prob.status === 'RESOLVED') ? '06 Sep 2026' : 'Pending' },
            { name: 'Project In Progress', date: (prob.status === 'RESOLVED') ? '08 Sep 2026' : 'Pending' },
            { name: 'Resolved', date: (prob.status === 'RESOLVED') ? '10 Sep 2026' : 'Pending' }
        ];

        // Determine current progress level
        let activeIndex = 0;
        if (prob.status === 'SUBMITTED') activeIndex = 1;
        else if (prob.status === 'UNDER REVIEW') activeIndex = 2;
        else if (prob.status === 'UNIVERSITY ASSIGNED') activeIndex = 3;
        else if (prob.status === 'RESOLVED') activeIndex = 5;

        container.innerHTML = '';

        stages.forEach((st, idx) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'timeline-step';

            if (idx < activeIndex) {
                stepEl.classList.add('completed');
            } else if (idx === activeIndex) {
                stepEl.classList.add('active');
            }

            stepEl.innerHTML = `
                <div class="step-node">${idx < activeIndex ? '✓' : (idx + 1)}</div>
                <div class="step-label">${st.name}</div>
                <span class="step-date">${st.date}</span>
            `;
            container.appendChild(stepEl);
        });
    }

    function closeDetailsModal() {
        if (detailsModal) detailsModal.classList.remove('open');
    }

    if (closeDetailsBtn) closeDetailsBtn.addEventListener('click', closeDetailsModal);
    if (dismissDetailsBtn) dismissDetailsBtn.addEventListener('click', closeDetailsModal);

    if (trackOnMapBtn) {
        trackOnMapBtn.addEventListener('click', () => {
            if (currentDetailProblem && map) {
                const lat = parseFloat(currentDetailProblem.lat);
                const lng = parseFloat(currentDetailProblem.lng);
                if (!isNaN(lat) && !isNaN(lng)) {
                    map.panTo([lat, lng], { animate: true, duration: 0.5 });
                }
            }
            closeDetailsModal();
        });
    }

    // 7. Report Problem Modal & AI Analysis & Duplicates
    const reportModal = document.getElementById('report-modal');
    const openReportBtn = document.getElementById('open-report-btn');
    const closeReportBtn = document.getElementById('close-report-btn');
    const cancelReportBtn = document.getElementById('cancel-report-btn');
    const reportForm = document.getElementById('report-form');
    const fileInput = document.getElementById('input-images');
    const previewStrip = document.getElementById('preview-strip');

    const btnRunAi = document.getElementById('btn-run-ai');
    const aiLoadingPanel = document.getElementById('ai-loading-panel');
    const aiResultsPanel = document.getElementById('ai-results-panel');

    let uploadedImagesBase64 = [];
    let isAiAnalyzed = false;

    function showReportModal() {
        if (reportModal) {
            reportModal.classList.add('open');
            // reset AI panels
            if (aiLoadingPanel) aiLoadingPanel.classList.remove('active');
            if (aiResultsPanel) aiResultsPanel.classList.remove('active');
            isAiAnalyzed = false;
        }
    }

    function hideReportModal() {
        if (reportModal) {
            reportModal.classList.remove('open');
            reportForm.reset();
            previewStrip.innerHTML = '';
            uploadedImagesBase64 = [];
            if (aiLoadingPanel) aiLoadingPanel.classList.remove('active');
            if (aiResultsPanel) aiResultsPanel.classList.remove('active');
            isAiAnalyzed = false;
        }
    }

    if (openReportBtn) openReportBtn.addEventListener('click', showReportModal);
    if (closeReportBtn) closeReportBtn.addEventListener('click', hideReportModal);
    if (cancelReportBtn) cancelReportBtn.addEventListener('click', hideReportModal);

    // Sidebar menu link to Report Problem
    const menuReportLink = document.getElementById('menu-report-link');
    if (menuReportLink) {
        menuReportLink.addEventListener('click', (e) => {
            e.preventDefault();
            showReportModal();
        });
    }

    // Photo Upload Handler
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64Data = event.target.result;
                    uploadedImagesBase64.push(base64Data);

                    const thumb = document.createElement('div');
                    thumb.className = 'preview-thumb-box';
                    thumb.innerHTML = `<img src="${base64Data}" alt="Uploaded Evidence">`;
                    previewStrip.appendChild(thumb);
                };
                reader.readAsDataURL(file);
            });
        });
    }

    // Run Mock AI Pre-Screening
    if (btnRunAi) {
        btnRunAi.addEventListener('click', () => {
            const title = document.getElementById('input-title').value.trim();
            const category = document.getElementById('input-category').value;
            const ward = document.getElementById('input-ward').value.trim();
            const desc = document.getElementById('input-desc').value.trim();

            if (!title) {
                alert('Please enter a Problem Title before analyzing.');
                document.getElementById('input-title').focus();
                return;
            }

            // Show realistic AI loading state
            if (aiResultsPanel) aiResultsPanel.classList.remove('active');
            if (aiLoadingPanel) aiLoadingPanel.classList.add('active');

            // Simulate realistic 1.2s AI inference delay
            setTimeout(() => {
                if (aiLoadingPanel) aiLoadingPanel.classList.remove('active');
                if (aiResultsPanel) aiResultsPanel.classList.add('active');
                isAiAnalyzed = true;

                // Adjust AI result based on inputs or use realistic defaults
                const resolvedCat = category || 'Water & Sanitation';
                document.getElementById('ai-res-category').textContent = `${resolvedCat} • Drainage Infrastructure`;
                document.getElementById('ai-res-severity').innerHTML = `<span style="color:#DC2626;">8/10</span> &bull; HIGH Urgency`;
                document.getElementById('ai-res-affected').textContent = '500 Residents';
                document.getElementById('ai-res-summary').innerHTML = `<strong>AI Summary:</strong> Repeated flooding appears to be related to inadequate drainage infrastructure in ${ward || 'this sector'}. High pedestrian risk and road surface degradation observed.`;

                // Update keywords based on title
                const kwContainer = document.getElementById('ai-res-keywords');
                if (kwContainer) {
                    const words = title.split(' ').slice(0, 3);
                    kwContainer.innerHTML = `
                        <span class="ai-keyword-tag">#Drainage</span>
                        <span class="ai-keyword-tag">#Flooding</span>
                        <span class="ai-keyword-tag">#Road</span>
                        <span class="ai-keyword-tag">#Rainfall</span>
                        ${words.map(w => `<span class="ai-keyword-tag">#${w.replace(/[^a-zA-Z]/g, '')}</span>`).join('')}
                    `;
                }

                if (window.lucide) window.lucide.createIcons();
            }, 1200);
        });
    }

    // Submit Problem to LocalStorage & Centralized State
    if (reportForm) {
        reportForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const title = document.getElementById('input-title').value.trim();
            const category = document.getElementById('input-category').value || 'Sanitation';
            const ward = document.getElementById('input-ward').value.trim();
            const lat = parseFloat(document.getElementById('input-lat').value) || 28.6185;
            const lng = parseFloat(document.getElementById('input-lng').value) || 77.2120;
            const desc = document.getElementById('input-desc').value.trim();

            const newRecord = {
                title,
                category,
                subcategory: 'Drainage & Public Works',
                ward,
                location: `${ward}, Main Road`,
                lat,
                lng,
                severity: 8,
                urgency: 'HIGH',
                affectedPeople: 500,
                status: 'SUBMITTED',
                description: desc,
                aiSummary: 'Repeated flooding appears to be related to inadequate drainage infrastructure. Prioritized for municipal engineering review.',
                keywords: ['Drainage', 'Flooding', 'Road', 'Rainfall'],
                photos: uploadedImagesBase64,
                date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            };

            // Save to shared JanSetuState
            const saved = window.JanSetuState ? window.JanSetuState.saveProblem(newRecord) : newRecord;

            // Refresh table and map
            loadProblemsTable();

            // Refresh notification count
            updateNotificationBadge();

            // Close report modal
            hideReportModal();

            // Immediately open Problem Details modal for user review
            setTimeout(() => {
                openProblemDetails(saved.id);
            }, 300);
        });
    }

    // 8. Notifications Drawer / Modal
    const notifModal = document.getElementById('citizen-notif-modal');
    const openNotifBtn = document.getElementById('open-notif-btn');
    const closeNotifBtn = document.getElementById('close-notif-modal-btn');
    const dismissNotifBtn = document.getElementById('dismiss-notif-btn');
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    const menuNotifLink = document.getElementById('menu-notifications-link');

    function updateNotificationBadge() {
        if (!window.JanSetuState) return;
        const notifs = window.JanSetuState.getNotifications('citizen');
        const unreadCount = notifs.filter(n => !n.read).length;
        const badge = document.getElementById('notif-count-badge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
        const countText = document.getElementById('notif-unread-count-text');
        if (countText) {
            countText.textContent = `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`;
        }
    }

    function renderNotifications() {
        const listContainer = document.getElementById('citizen-notif-list');
        if (!listContainer || !window.JanSetuState) return;

        const notifs = window.JanSetuState.getNotifications('citizen');
        listContainer.innerHTML = '';

        if (notifs.length === 0) {
            listContainer.innerHTML = '<p style="font-size:12px; color:#777; text-align:center; padding:16px;">No notifications at this time.</p>';
            return;
        }

        notifs.forEach(notif => {
            const item = document.createElement('div');
            item.className = `notif-item ${notif.read ? '' : 'unread'}`;
            item.innerHTML = `
                <div style="color:var(--color-primary); margin-top:2px;">
                    <i data-lucide="${notif.read ? 'bell' : 'bell-ring'}"></i>
                </div>
                <div class="notif-body">
                    <div class="notif-head">
                        <span class="notif-title">${notif.title}</span>
                        <span class="notif-time">${notif.time || 'Recently'}</span>
                    </div>
                    <p class="notif-text">${notif.message}</p>
                    ${!notif.read ? `<button type="button" class="notif-mark-btn" onclick="markRead('${notif.id}')">Mark as read</button>` : ''}
                </div>
            `;
            listContainer.appendChild(item);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    window.markRead = function (id) {
        if (window.JanSetuState) {
            window.JanSetuState.markNotificationRead(id);
            renderNotifications();
            updateNotificationBadge();
        }
    };

    function showNotifModal() {
        renderNotifications();
        updateNotificationBadge();
        if (notifModal) notifModal.classList.add('open');
    }

    function hideNotifModal() {
        if (notifModal) notifModal.classList.remove('open');
    }

    if (openNotifBtn) openNotifBtn.addEventListener('click', showNotifModal);
    if (menuNotifLink) menuNotifLink.addEventListener('click', (e) => {
        e.preventDefault();
        showNotifModal();
    });
    if (closeNotifBtn) closeNotifBtn.addEventListener('click', hideNotifModal);
    if (dismissNotifBtn) dismissNotifBtn.addEventListener('click', hideNotifModal);

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
            if (window.JanSetuState) {
                window.JanSetuState.markAllNotificationsRead('citizen');
                renderNotifications();
                updateNotificationBadge();
            }
        });
    }

    // 9. Notices Modal & Analytics Modal (Existing Features preserved)
    const noticesModal = document.getElementById('notices-modal');
    const closeNoticesBtn = document.getElementById('close-notices-btn');
    const dismissNoticesBtn = document.getElementById('dismiss-notices-btn');
    const menuNoticesLink = document.getElementById('menu-notices-link');

    const analyticsModal = document.getElementById('analytics-modal');
    const closeAnalyticsBtn = document.getElementById('close-analytics-btn');
    const dismissAnalyticsBtn = document.getElementById('dismiss-analytics-btn');
    const menuAnalyticsLink = document.getElementById('menu-analytics-link');

    if (menuNoticesLink) {
        menuNoticesLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (noticesModal) noticesModal.classList.add('open');
        });
    }

    if (closeNoticesBtn) closeNoticesBtn.addEventListener('click', () => noticesModal.classList.remove('open'));
    if (dismissNoticesBtn) dismissNoticesBtn.addEventListener('click', () => noticesModal.classList.remove('open'));

    if (menuAnalyticsLink) {
        menuAnalyticsLink.addEventListener('click', (e) => {
            e.preventDefault();
            renderPersonalAnalytics();
            if (analyticsModal) analyticsModal.classList.add('open');
        });
    }

    if (closeAnalyticsBtn) closeAnalyticsBtn.addEventListener('click', () => analyticsModal.classList.remove('open'));
    if (dismissAnalyticsBtn) dismissAnalyticsBtn.addEventListener('click', () => analyticsModal.classList.remove('open'));

    function renderPersonalAnalytics() {
        const issues = window.JanSetuState ? window.JanSetuState.getProblems() : [];
        const totalCount = issues.length;
        let solvedCount = 0;
        let reviewCount = 0;
        let categoryCounts = {};

        issues.forEach(issue => {
            if (issue.status === 'RESOLVED') solvedCount++;
            if (issue.status === 'UNDER REVIEW') reviewCount++;
            const cat = issue.category || 'General';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        const resolutionRate = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

        const statTotal = document.getElementById('stat-total');
        const statSolved = document.getElementById('stat-solved');
        const statReview = document.getElementById('stat-review');
        const statRate = document.getElementById('stat-rate');

        if (statTotal) statTotal.textContent = totalCount;
        if (statSolved) statSolved.textContent = solvedCount;
        if (statReview) statReview.textContent = reviewCount;
        if (statRate) statRate.textContent = `${resolutionRate}%`;

        const statusTbody = document.getElementById('analytics-status-tbody');
        if (statusTbody) {
            statusTbody.innerHTML = '';
            if (issues.length === 0) {
                statusTbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#777;">No problems reported yet.</td></tr>';
            } else {
                issues.forEach(issue => {
                    let pillClass = 'status-submitted';
                    if (issue.status === 'UNDER REVIEW') pillClass = 'status-review';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${issue.title}</strong></td>
                        <td>${issue.category}</td>
                        <td><span class="status-pill ${pillClass}">${issue.status}</span></td>
                    `;
                    statusTbody.appendChild(tr);
                });
            }
        }

        const chartContainer = document.getElementById('category-chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = '';
            for (const [cat, count] of Object.entries(categoryCounts)) {
                const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                const div = document.createElement('div');
                div.className = 'progress-item';
                div.innerHTML = `
                    <div class="progress-info">
                        <span>${cat}</span>
                        <strong>${count} (${pct}%)</strong>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                `;
                chartContainer.appendChild(div);
            }
        }
    }

    // Filter tabs for notices
    const filterTabs = document.querySelectorAll('.filter-tab');
    const noticeCards = document.querySelectorAll('.notice-card-item');

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const filterType = tab.getAttribute('data-filter');
            noticeCards.forEach(card => {
                if (filterType === 'all' || card.getAttribute('data-type') === filterType) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // 10. Initial Page Render
    loadProblemsTable();
    updateNotificationBadge();
});