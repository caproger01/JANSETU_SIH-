/**
 * university-dashboard.js
 * University Collaboration Hub & Challenge Workflow (Frontend Prototype)
 * Handles AI Recommended Challenges, Challenge Details, Challenge Acceptance Modal,
 * Multidisciplinary Team Selection, Interactive Project Stages & Milestones,
 * Notifications, and Session Logout.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons if available
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // 2. Logout Handler
    const logoutBtn = document.getElementById('univ-logout-btn');
    if (logoutBtn && window.JanSetuState) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out of University Portal?')) {
                window.JanSetuState.logout();
            }
        });
    }

    // 3. Populate AI Recommended Challenges
    function renderRecommendedChallenges() {
        const grid = document.getElementById('ai-challenges-grid');
        if (!grid || !window.JanSetuState) return;

        const challenges = window.JanSetuState.getChallenges();
        grid.innerHTML = '';

        challenges.forEach(chl => {
            let priorityClass = 'priority-high';
            if (chl.priority === 'CRITICAL') priorityClass = 'priority-critical';
            if (chl.priority === 'MEDIUM') priorityClass = 'priority-medium';

            const card = document.createElement('div');
            card.className = 'ai-challenge-card';
            card.innerHTML = `
                <div>
                    <div class="challenge-top-meta">
                        <span class="priority-pill ${priorityClass}">${chl.priority} PRIORITY</span>
                        <span class="ai-match-badge">AI Match: ${chl.aiMatch}</span>
                    </div>

                    <h3 class="challenge-card-title">${chl.title}</h3>
                    <div class="challenge-location">
                        📍 <strong>${chl.location}</strong> &bull; ${chl.category}
                    </div>

                    <p class="challenge-desc-snippet">${chl.description}</p>

                    <div class="skills-tags-wrap">
                        ${chl.requiredExpertise.map(sk => `<span class="skill-tag">${sk}</span>`).join('')}
                    </div>
                </div>

                <div>
                    <div style="font-size: 11px; color: #555; margin-bottom: 8px;">
                        Status: <strong style="color: ${chl.status === 'ACCEPTED' ? '#059669' : '#075844'};">${chl.status}</strong>
                        ${chl.acceptedBy ? `(${chl.acceptedBy})` : ''}
                    </div>
                    <button type="button" class="btn-view-challenge" data-id="${chl.id}">
                        ${chl.status === 'ACCEPTED' ? 'View Details' : 'View Challenge'} &rsaquo;
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        // Bind View Challenge button
        document.querySelectorAll('.btn-view-challenge').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                openChallengeDetails(id);
            };
        });
    }

    // 4. Challenge Details Modal Logic
    const challengeModal = document.getElementById('challenge-details-modal');
    const closeChlModalBtn = document.getElementById('close-chl-modal-btn');
    const dismissChlBtn = document.getElementById('dismiss-chl-btn');
    const acceptChallengeTriggerBtn = document.getElementById('accept-challenge-trigger-btn');

    let currentSelectedChallenge = null;

    function openChallengeDetails(challengeId) {
        if (!window.JanSetuState || !challengeModal) return;
        const chl = window.JanSetuState.getChallengeById(challengeId);
        if (!chl) return;
        currentSelectedChallenge = chl;

        document.getElementById('chl-modal-title').textContent = chl.title;
        document.getElementById('chl-modal-id').textContent = chl.id;
        document.getElementById('chl-modal-location').textContent = chl.location;
        document.getElementById('chl-modal-priority').textContent = `${chl.priority} Priority (${chl.aiMatch} AI Fit)`;
        document.getElementById('chl-modal-impact').textContent = chl.affectedPopulation || '2,500 Citizens';
        document.getElementById('chl-modal-desc').textContent = chl.description;

        const skillsContainer = document.getElementById('chl-modal-skills');
        if (skillsContainer) {
            skillsContainer.innerHTML = chl.requiredExpertise.map(s => `<span class="skill-tag">${s}</span>`).join(' ');
        }

        if (acceptChallengeTriggerBtn) {
            if (chl.status === 'ACCEPTED') {
                acceptChallengeTriggerBtn.textContent = 'Challenge Already Accepted';
                acceptChallengeTriggerBtn.disabled = true;
                acceptChallengeTriggerBtn.style.opacity = '0.6';
            } else {
                acceptChallengeTriggerBtn.textContent = 'Accept Challenge & Build Team';
                acceptChallengeTriggerBtn.disabled = false;
                acceptChallengeTriggerBtn.style.opacity = '1';
            }
        }

        challengeModal.classList.add('open');
    }

    function closeChallengeModal() {
        if (challengeModal) challengeModal.classList.remove('open');
    }

    if (closeChlModalBtn) closeChlModalBtn.addEventListener('click', closeChallengeModal);
    if (dismissChlBtn) dismissChlBtn.addEventListener('click', closeChallengeModal);

    // 5. Challenge Acceptance Confirmation Modal
    const confirmModal = document.getElementById('confirm-accept-modal');
    const closeConfirmBtn = document.getElementById('close-confirm-btn');
    const cancelConfirmBtn = document.getElementById('cancel-confirm-btn');
    const confirmAcceptBtn = document.getElementById('confirm-accept-btn');

    if (acceptChallengeTriggerBtn) {
        acceptChallengeTriggerBtn.addEventListener('click', () => {
            closeChallengeModal();
            if (confirmModal) confirmModal.classList.add('open');
        });
    }

    if (closeConfirmBtn) closeConfirmBtn.addEventListener('click', () => confirmModal.classList.remove('open'));
    if (cancelConfirmBtn) cancelConfirmBtn.addEventListener('click', () => confirmModal.classList.remove('open'));

    if (confirmAcceptBtn) {
        confirmAcceptBtn.addEventListener('click', () => {
            if (!currentSelectedChallenge || !window.JanSetuState) return;

            window.JanSetuState.acceptChallenge(currentSelectedChallenge.id, 'National Institute of Technology');

            confirmModal.classList.remove('open');
            renderRecommendedChallenges();
            updateUnivNotifBadge();

            // Open Team Creation Modal
            setTimeout(() => {
                openTeamCreationModal();
            }, 300);
        });
    }

    // 6. Team Creation Interface
    const teamModal = document.getElementById('team-creation-modal');
    const closeTeamBtn = document.getElementById('close-team-btn');
    const cancelTeamBtn = document.getElementById('cancel-team-btn');
    const submitTeamBtn = document.getElementById('submit-team-btn');

    // Default student candidates pool
    let activeCandidates = [
        { id: 1, name: 'Rahul Sharma', dept: 'Civil Engineering', match: '96%', selected: true },
        { id: 2, name: 'Priya Verma', dept: 'GIS & Spatial Modeling', match: '92%', selected: true },
        { id: 3, name: 'Aman Deep', dept: 'IoT & Sensors', match: '88%', selected: true },
        { id: 4, name: 'Neha Gupta', dept: 'Environmental Sciences', match: '85%', selected: false }
    ];

    function openTeamCreationModal() {
        renderStudentCandidates();
        if (teamModal) teamModal.classList.add('open');
    }

    function renderStudentCandidates() {
        const container = document.getElementById('student-candidates-list');
        if (!container) return;
        container.innerHTML = '';

        activeCandidates.forEach(cand => {
            const div = document.createElement('div');
            div.className = 'student-candidate-item';
            div.innerHTML = `
                <div>
                    <strong>${cand.name}</strong>
                    <span class="student-match">${cand.match} Match</span>
                    <div style="font-size: 11px; color: #666; margin-top: 2px;">Department: ${cand.dept}</div>
                </div>
                <div>
                    <button type="button" class="${cand.selected ? 'btn-cancel' : 'btn-primary-action'}" style="padding: 4px 10px; font-size: 11px;" onclick="toggleStudentSelection(${cand.id})">
                        ${cand.selected ? 'Remove' : 'Add to Team'}
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    window.toggleStudentSelection = function (id) {
        const cand = activeCandidates.find(c => c.id === id);
        if (cand) {
            cand.selected = !cand.selected;
            renderStudentCandidates();
        }
    };

    if (closeTeamBtn) closeTeamBtn.addEventListener('click', () => teamModal.classList.remove('open'));
    if (cancelTeamBtn) cancelTeamBtn.addEventListener('click', () => teamModal.classList.remove('open'));

    if (submitTeamBtn) {
        submitTeamBtn.addEventListener('click', () => {
            const selectedStudents = activeCandidates.filter(c => c.selected);
            if (selectedStudents.length === 0) {
                alert('Please select at least one student researcher for the project team.');
                return;
            }

            const mentor = document.getElementById('team-mentor-input').value.trim() || 'Dr. S. K. Sharma';

            if (window.JanSetuState) {
                window.JanSetuState.createTeamForProject('PRJ-2026-01', {
                    mentor: mentor,
                    members: selectedStudents.map(s => ({ name: s.name, role: s.dept, match: s.match }))
                });
            }

            teamModal.classList.remove('open');
            alert(`Team created successfully with ${selectedStudents.length} student researchers under ${mentor}! Redirecting to Project Dashboard...`);

            // Scroll down to project spotlight
            const spotlight = document.getElementById('project-spotlight');
            if (spotlight) {
                spotlight.scrollIntoView({ behavior: 'smooth' });
                spotlight.style.boxShadow = '0 0 0 3px rgba(7, 88, 68, 0.4)';
                setTimeout(() => { spotlight.style.boxShadow = ''; }, 2000);
            }
            updateUnivNotifBadge();
        });
    }

    // 7. Interactive Project Milestones
    const milestoneModal = document.getElementById('milestone-modal');
    const closeMilestoneBtn = document.getElementById('close-milestone-btn');
    const dismissMilestoneBtn = document.getElementById('dismiss-milestone-btn');

    const milestonesData = {
        research: {
            title: 'Stage 1: Research & Hydrological Survey',
            status: 'Completed (Verified by Gram Panchayat)',
            date: '10 Jul 2026',
            deliverable: 'Topographical Elevation Modeling & Water Catchment Baseline Assessment (PDF)',
            desc: 'Conducted drone GIS mapping of 14km village perimeter to locate natural stormwater drain gradient.'
        },
        validation: {
            title: 'Stage 2: Stakeholder Validation',
            status: 'Completed (PWD Sanctioned)',
            date: '25 Jul 2026',
            deliverable: 'Signed Inter-Agency Approval by District Magistrate & Rural Development Cell',
            desc: 'Validated flow rate requirements with local farmers and district irrigation engineers.'
        },
        prototype: {
            title: 'Stage 3: Scaled Model & Sluice Gate Prototype',
            status: 'Completed',
            date: '15 Aug 2026',
            deliverable: 'Physical 1:20 Hydraulic Lab Model with Silt Filtration Trap',
            desc: 'Constructed working prototype at NIT Hydraulic Engineering lab achieving 85% sediment filtration.'
        },
        testing: {
            title: 'Stage 4: Simulation & Field Stress Testing',
            status: 'Currently Active (72% Progress)',
            date: 'Target: 18 Sep 2026',
            deliverable: 'Sensor Telemetry Integration & IoT Rain Influx Benchmarking',
            desc: 'Live solar-powered ultrasonic sensor nodes transmitting flow rate metrics to Municipal Command Center.'
        },
        pilot: {
            title: 'Stage 5: On-Site Pilot Deployment',
            status: 'Upcoming Phase',
            date: 'Target: 10 Oct 2026',
            deliverable: '300-Meter Demonstration Channel Construction in Sector 4',
            desc: 'Civil contractor mobilization and community shramdaan for ditch clearing.'
        },
        deployment: {
            title: 'Stage 6: Scale & District Handover',
            status: 'Planned Final Phase',
            date: 'Target: 15 Nov 2026',
            deliverable: 'Full Municipal Handover & Maintenance Manual for Gram Panchayat',
            desc: 'Long-term community ownership and automated GIS alert integration.'
        }
    };

    document.querySelectorAll('.milestone-node-wrap').forEach(node => {
        node.onclick = () => {
            const key = node.getAttribute('data-milestone');
            const data = milestonesData[key];
            if (data && milestoneModal) {
                document.getElementById('m-modal-title').textContent = data.title;
                document.getElementById('m-modal-status').textContent = data.status;
                document.getElementById('m-modal-date').textContent = data.date;
                document.getElementById('m-modal-deliverable').textContent = data.deliverable;
                document.getElementById('m-modal-desc').textContent = data.desc;
                milestoneModal.classList.add('open');
            }
        };
    });

    if (closeMilestoneBtn) closeMilestoneBtn.addEventListener('click', () => milestoneModal.classList.remove('open'));
    if (dismissMilestoneBtn) dismissMilestoneBtn.addEventListener('click', () => milestoneModal.classList.remove('open'));

    // 8. University Notifications Drawer
    const univNotifModal = document.getElementById('univ-notif-modal');
    const openUnivNotifBtn = document.getElementById('open-univ-notif-btn');
    const closeUnivNotifBtn = document.getElementById('close-univ-notif-btn');
    const dismissUnivNotifBtn = document.getElementById('dismiss-univ-notif-btn');

    function updateUnivNotifBadge() {
        if (!window.JanSetuState) return;
        const notifs = window.JanSetuState.getNotifications('university');
        const unread = notifs.filter(n => !n.read).length;
        const badge = document.getElementById('univ-notif-badge');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }
    }

    function renderUnivNotifications() {
        const container = document.getElementById('univ-notif-list');
        if (!container || !window.JanSetuState) return;

        const notifs = window.JanSetuState.getNotifications('university');
        container.innerHTML = '';

        if (notifs.length === 0) {
            container.innerHTML = '<p style="font-size:12px; color:#777; text-align:center; padding:16px;">No notifications at this time.</p>';
            return;
        }

        notifs.forEach(notif => {
            const item = document.createElement('div');
            item.className = `student-candidate-item ${notif.read ? '' : 'unread'}`;
            item.style.flexDirection = 'column';
            item.style.alignItems = 'flex-start';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:4px;">
                    <strong style="color:#075844;">${notif.title}</strong>
                    <span style="font-size:10px; color:#999;">${notif.time || 'Recent'}</span>
                </div>
                <p style="font-size:12px; color:#444; line-height:1.4;">${notif.message}</p>
            `;
            container.appendChild(item);
        });
    }

    if (openUnivNotifBtn) {
        openUnivNotifBtn.addEventListener('click', () => {
            renderUnivNotifications();
            if (univNotifModal) univNotifModal.classList.add('open');
        });
    }

    if (closeUnivNotifBtn) closeUnivNotifBtn.addEventListener('click', () => univNotifModal.classList.remove('open'));
    if (dismissUnivNotifBtn) dismissUnivNotifBtn.addEventListener('click', () => univNotifModal.classList.remove('open'));

    // 9. Initial Load
    renderRecommendedChallenges();
    updateUnivNotifBadge();
});
