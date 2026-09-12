/**
 * JanSetu - CivicBridge AI
 * Centralized Mock State & Data Store (Frontend Prototype Only)
 * 
 * Manages localStorage synchronization for:
 * - Problems / Grievances (synced between Citizen & Government)
 * - University Challenges
 * - Projects & Teams
 * - Industry Contributions
 * - Role-based Notifications
 * - Demo Session & User Auth
 */

(function () {
    const PROBLEMS_KEY = 'janSetu_problems';
    const SHARED_ISSUES_LEGACY_KEY = 'jansetu_shared_issues';
    const CHALLENGES_KEY = 'janSetu_challenges';
    const PROJECTS_KEY = 'janSetu_projects';
    const NOTIFICATIONS_KEY = 'janSetu_notifications';
    const USER_KEY = 'janSetu_user';
    const DEMO_ROLE_KEY = 'demoRole';

    // Initial default seed problems
    const DEFAULT_PROBLEMS = [
        {
            id: 'CB-2026-00124',
            title: 'Streetlight outage in Ward 12',
            category: 'Public Infrastructure',
            subcategory: 'Street Lighting & Power',
            ward: 'Ward 12, Civil Lines',
            district: 'New Delhi',
            location: 'Near Central Park Gate 3, Ward 12',
            lat: 28.6139,
            lng: 77.2090,
            severity: 6,
            urgency: 'MEDIUM',
            affectedPeople: 350,
            status: 'SUBMITTED',
            timeline: [
                { stage: 'Reported', date: '04 Sep 2026', done: true },
                { stage: 'AI Analyzed', date: '04 Sep 2026', done: true },
                { stage: 'Under Review', date: 'Pending', done: false },
                { stage: 'University Assigned', date: 'Pending', done: false },
                { stage: 'Project In Progress', date: 'Pending', done: false },
                { stage: 'Resolved', date: 'Pending', done: false }
            ],
            description: 'Multiple streetlights along 4th Avenue have been dark for 48 hours, creating severe safety risks for pedestrians and night commuters.',
            aiSummary: 'Lighting failure in high-footfall residential corridor. High pedestrian risk during peak evening hours.',
            keywords: ['Lighting', 'Infrastructure', 'Safety', 'Ward 12'],
            photos: [],
            date: '04/09/2026'
        },
        {
            id: 'CB-2026-00125',
            title: 'Severe Pothole & Road Cave-in on Main Street',
            category: 'Roadways',
            subcategory: 'Pavement & Surface Damage',
            ward: 'Ward 8, Connaught Zone',
            district: 'New Delhi',
            location: 'Main Commercial Market Junction',
            lat: 28.6219,
            lng: 77.2150,
            severity: 8,
            urgency: 'HIGH',
            affectedPeople: 1200,
            status: 'UNDER REVIEW',
            timeline: [
                { stage: 'Reported', date: '02 Sep 2026', done: true },
                { stage: 'AI Analyzed', date: '02 Sep 2026', done: true },
                { stage: 'Under Review', date: '03 Sep 2026', done: true },
                { stage: 'University Assigned', date: 'Pending', done: false },
                { stage: 'Project In Progress', date: 'Pending', done: false },
                { stage: 'Resolved', date: 'Pending', done: false }
            ],
            description: 'Major asphalt subsidence creating a 2-foot pothole on bus transit route. Causing hazardous vehicular congestion and scooter accidents.',
            aiSummary: 'Sub-base soil erosion suspected following recent monsoon rains. Recommended immediate barricading and structural resurfacing.',
            keywords: ['Pothole', 'Roadways', 'Traffic Hazard', 'Monsoon Damage'],
            photos: [],
            date: '02/09/2026'
        },
        {
            id: 'CB-2026-00126',
            title: 'Rural Drainage & Flooding Overflow',
            category: 'Sanitation',
            subcategory: 'Drainage & Stormwater',
            ward: 'Ward 15 / Rural Sector 4',
            district: 'Meerut',
            location: 'Sector 4 Village Approach Road',
            lat: 28.9845,
            lng: 77.7064,
            severity: 9,
            urgency: 'CRITICAL',
            affectedPeople: 2500,
            status: 'UNIVERSITY ASSIGNED',
            timeline: [
                { stage: 'Reported', date: '28 Aug 2026', done: true },
                { stage: 'AI Analyzed', date: '28 Aug 2026', done: true },
                { stage: 'Under Review', date: '29 Aug 2026', done: true },
                { stage: 'University Assigned', date: '01 Sep 2026', done: true },
                { stage: 'Project In Progress', date: 'Pending', done: false },
                { stage: 'Resolved', date: 'Pending', done: false }
            ],
            description: 'Repeated monsoon stormwater flooding across agricultural fields and village primary school due to choked trunk canal.',
            aiSummary: 'Chronic topological drainage bottleneck. Requires catchment elevation mapping, GIS survey, and civil re-engineering.',
            keywords: ['Flooding', 'Stormwater', 'Drainage', 'Agriculture', 'Canal'],
            photos: [],
            date: '28/08/2026'
        },
        {
            id: 'CB-2026-00127',
            title: 'Damaged Sidewalk & Exposed Conduit Cables',
            category: 'Roadways',
            subcategory: 'Pedestrian Infrastructure',
            ward: 'Ward 12, Civil Lines',
            district: 'New Delhi',
            location: 'Near Government Girls Senior Secondary School',
            lat: 28.6155,
            lng: 77.2085,
            severity: 5,
            urgency: 'MEDIUM',
            affectedPeople: 600,
            status: 'RESOLVED',
            timeline: [
                { stage: 'Reported', date: '20 Aug 2026', done: true },
                { stage: 'AI Analyzed', date: '20 Aug 2026', done: true },
                { stage: 'Under Review', date: '21 Aug 2026', done: true },
                { stage: 'University Assigned', date: 'N/A', done: true },
                { stage: 'Project In Progress', date: '23 Aug 2026', done: true },
                { stage: 'Resolved', date: '27 Aug 2026', done: true }
            ],
            description: 'Broken paver blocks and dangling insulated cables on pedestrian sidewalk repaired by PWD rapid response team.',
            aiSummary: 'Pedestrian tripping hazard resolved. Paver blocks reset and utility cables safely enclosed in underground conduit.',
            keywords: ['Sidewalk', 'Pedestrian', 'Safety', 'Resolved'],
            photos: [],
            date: '20/08/2026'
        }
    ];

    // Initial university challenges
    const DEFAULT_CHALLENGES = [
        {
            id: 'CHL-001',
            title: 'Rural Drainage & Flooding Mitigation',
            problemId: 'CB-2026-00126',
            priority: 'CRITICAL',
            location: 'Meerut District',
            district: 'Meerut',
            category: 'Civil & Environmental Engineering',
            requiredExpertise: ['Civil Engineering', 'GIS & Remote Sensing', 'Environmental Engineering'],
            aiMatch: '96%',
            description: 'Develop low-cost, gravity-assisted sustainable drainage canals and detention ponds to prevent annual monsoon inundation in agricultural village clusters.',
            affectedPopulation: '2,500 villagers',
            status: 'RECOMMENDED',
            acceptedBy: null
        },
        {
            id: 'CHL-002',
            title: 'Smart Urban Water Leakage Detection System',
            problemId: 'CB-2026-00125',
            priority: 'HIGH',
            location: 'New Delhi Ward 8',
            district: 'New Delhi',
            category: 'IoT & Smart Cities',
            requiredExpertise: ['Computer Science', 'IoT & Embedded Systems', 'Hydraulics'],
            aiMatch: '91%',
            description: 'Deploy acoustic sensor mesh and pressure monitoring nodes to pinpoint underground potable pipeline leaks before sinkholes occur.',
            affectedPopulation: '15,000 residents',
            status: 'OPEN',
            acceptedBy: null
        },
        {
            id: 'CHL-003',
            title: 'Decentralized Municipal Organic Waste Composter',
            problemId: 'CB-2026-00128',
            priority: 'MEDIUM',
            location: 'Agra Zone 3',
            district: 'Agra',
            category: 'Biotechnology & Renewable Energy',
            requiredExpertise: ['Biochemical Engineering', 'Mechanical Design', 'Waste Management'],
            aiMatch: '87%',
            description: 'Design solar-assisted rapid aerobic composters for vegetable wholesale mandis to reduce open dumping and generate bio-fertilizer.',
            affectedPopulation: '8,000 vendors & residents',
            status: 'OPEN',
            acceptedBy: null
        }
    ];

    // Initial community projects
    const DEFAULT_PROJECTS = [
        {
            id: 'PRJ-2026-01',
            title: 'Smart Rural Drainage System',
            challengeId: 'CHL-001',
            department: 'Civil Engineering & GIS Lab',
            institution: 'IIT Roorkee / Meerut University',
            mentor: 'Dr. S. K. Sharma (Professor, Hydraulics)',
            progress: 72,
            status: 'IN PROGRESS',
            teamsCount: 3,
            participantsCount: 18,
            stages: [
                { name: 'Research', status: 'Completed', date: '10 Jul 2026', deliverable: 'Topographical Elevation & Hydrological Survey' },
                { name: 'Validation', status: 'Completed', date: '25 Jul 2026', deliverable: 'Gram Panchayat & PWD Stakeholder Approval' },
                { name: 'Prototype', status: 'Completed', date: '15 Aug 2026', deliverable: 'Scaled Gravity-Channel Model & Sluice Gate' },
                { name: 'Testing', status: 'In Progress', date: '18 Sep 2026', deliverable: 'Field Flow Rate Simulation & Silt Filtration' },
                { name: 'Pilot', status: 'Upcoming', date: '10 Oct 2026', deliverable: '300m Demonstration Drain Construction' },
                { name: 'Deployment', status: 'Upcoming', date: '15 Nov 2026', deliverable: 'Final Handover to District Administration' }
            ],
            teamMembers: [
                { name: 'Rahul Sharma', role: 'Civil Engineering Lead', match: '96%' },
                { name: 'Priya Verma', role: 'GIS Mapping & Elevation Specialist', match: '92%' },
                { name: 'Aman Deep', role: 'IoT Water-Level Sensor Engineer', match: '88%' }
            ]
        },
        {
            id: 'PRJ-2026-02',
            title: 'Solar Water Filtration Kiosk',
            challengeId: 'CHL-002',
            department: 'Renewable Energy & Environmental Sciences',
            institution: 'Delhi Technological University',
            mentor: 'Dr. Ananya Mukherjee',
            progress: 45,
            status: 'IN PROGRESS',
            teamsCount: 2,
            participantsCount: 12,
            stages: [
                { name: 'Research', status: 'Completed', date: '01 Aug 2026', deliverable: 'Contaminant & Heavy Metal Baseline Report' },
                { name: 'Validation', status: 'Completed', date: '20 Aug 2026', deliverable: 'Jal Board Filtration Standard Compliance' },
                { name: 'Prototype', status: 'In Progress', date: '25 Sep 2026', deliverable: '3-stage UV/RO Solar Powered Skid' },
                { name: 'Testing', status: 'Upcoming', date: '15 Oct 2026', deliverable: 'Water Quality Certification' },
                { name: 'Pilot', status: 'Upcoming', date: '05 Nov 2026', deliverable: 'Installation at Primary Health Center' },
                { name: 'Deployment', status: 'Upcoming', date: '10 Dec 2026', deliverable: 'Community Operator Training' }
            ],
            teamMembers: [
                { name: 'Vikram Singh', role: 'Solar PV Systems', match: '94%' },
                { name: 'Sneha Patel', role: 'Water Quality Analyst', match: '90%' }
            ]
        }
    ];

    // Initial role notifications
    const DEFAULT_NOTIFICATIONS = [
        {
            id: 'NOTIF-001',
            role: 'citizen',
            title: 'Report Under Review',
            message: 'Your report "Streetlight outage in Ward 12" has been verified and assigned to PWD Electrical Division.',
            time: '2 hours ago',
            read: false,
            badge: 'Status Update'
        },
        {
            id: 'NOTIF-002',
            role: 'university',
            title: 'New AI Challenge Match (96%)',
            message: 'A new high-priority community problem "Rural Drainage & Flooding Overflow" matches your department research strengths.',
            time: 'Yesterday',
            read: false,
            badge: 'AI Recommendation'
        },
        {
            id: 'NOTIF-003',
            role: 'government',
            title: 'Urgent Grievance Ingested',
            message: 'High severity pothole & road subsidence reported in Ward 8 near Central Market. SLA countdown initiated.',
            time: '3 hours ago',
            read: false,
            badge: 'SLA Alert'
        },
        {
            id: 'NOTIF-004',
            role: 'industry',
            title: 'CSR Support Opportunity',
            message: 'Project "Smart Rural Drainage System" is seeking equipment sponsorship and pilot construction support.',
            time: '5 hours ago',
            read: false,
            badge: 'Partnership'
        }
    ];

    // Initialize state in localStorage if missing
    function initStorage() {
        if (!localStorage.getItem(PROBLEMS_KEY)) {
            // Also check legacy key if user previously tested citizen dashboard
            const legacy = localStorage.getItem(SHARED_ISSUES_LEGACY_KEY);
            if (legacy) {
                try {
                    const parsed = JSON.parse(legacy);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        localStorage.setItem(PROBLEMS_KEY, JSON.stringify(parsed));
                    } else {
                        localStorage.setItem(PROBLEMS_KEY, JSON.stringify(DEFAULT_PROBLEMS));
                    }
                } catch (e) {
                    localStorage.setItem(PROBLEMS_KEY, JSON.stringify(DEFAULT_PROBLEMS));
                }
            } else {
                localStorage.setItem(PROBLEMS_KEY, JSON.stringify(DEFAULT_PROBLEMS));
            }
        }

        // Always keep legacy in sync for backward compatibility
        localStorage.setItem(SHARED_ISSUES_LEGACY_KEY, localStorage.getItem(PROBLEMS_KEY));

        if (!localStorage.getItem(CHALLENGES_KEY)) {
            localStorage.setItem(CHALLENGES_KEY, JSON.stringify(DEFAULT_CHALLENGES));
        }
        if (!localStorage.getItem(PROJECTS_KEY)) {
            localStorage.setItem(PROJECTS_KEY, JSON.stringify(DEFAULT_PROJECTS));
        }
        if (!localStorage.getItem(NOTIFICATIONS_KEY)) {
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
        }
    }

    initStorage();

    // Data Access Interface
    window.JanSetuState = {
        // --- PROBLEMS ---
        getProblems: function () {
            initStorage();
            try {
                return JSON.parse(localStorage.getItem(PROBLEMS_KEY) || '[]');
            } catch (e) {
                return DEFAULT_PROBLEMS;
            }
        },

        getProblemById: function (id) {
            const list = this.getProblems();
            return list.find(p => String(p.id) === String(id)) || null;
        },

        saveProblem: function (newProblem) {
            const list = this.getProblems();
            // Assign proper ID if missing
            if (!newProblem.id) {
                newProblem.id = 'CB-2026-00' + (list.length + 124);
            }
            // Ensure status timeline exists
            if (!newProblem.timeline) {
                newProblem.timeline = [
                    { stage: 'Reported', date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), done: true },
                    { stage: 'AI Analyzed', date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), done: true },
                    { stage: 'Under Review', date: 'Pending', done: false },
                    { stage: 'University Assigned', date: 'Pending', done: false },
                    { stage: 'Project In Progress', date: 'Pending', done: false },
                    { stage: 'Resolved', date: 'Pending', done: false }
                ];
            }

            list.unshift(newProblem);
            localStorage.setItem(PROBLEMS_KEY, JSON.stringify(list));
            localStorage.setItem(SHARED_ISSUES_LEGACY_KEY, JSON.stringify(list));

            // Create notification for citizen and government
            this.addNotification({
                role: 'citizen',
                title: 'Problem Submitted Successfully',
                message: `Your report "${newProblem.title}" (ID: ${newProblem.id}) has been recorded and submitted to municipal authorities.`,
                time: 'Just now',
                badge: 'Submission'
            });

            this.addNotification({
                role: 'government',
                title: 'New Citizen Report Received',
                message: `New problem "${newProblem.title}" reported in ${newProblem.ward || 'Ward Zone'}. Review required.`,
                time: 'Just now',
                badge: 'New Grievance'
            });

            return newProblem;
        },

        updateProblemStatus: function (id, newStatus, remarks) {
            const list = this.getProblems();
            const idx = list.findIndex(p => String(p.id) === String(id));
            if (idx !== -1) {
                list[idx].status = newStatus;
                if (remarks) {
                    list[idx].adminRemarks = remarks;
                }

                // Update timeline stage
                if (list[idx].timeline) {
                    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    if (newStatus === 'UNDER REVIEW') {
                        const step = list[idx].timeline.find(s => s.stage === 'Under Review');
                        if (step) { step.done = true; step.date = todayStr; }
                    } else if (newStatus === 'UNIVERSITY ASSIGNED') {
                        const step1 = list[idx].timeline.find(s => s.stage === 'Under Review');
                        const step2 = list[idx].timeline.find(s => s.stage === 'University Assigned');
                        if (step1) { step1.done = true; }
                        if (step2) { step2.done = true; step2.date = todayStr; }
                    } else if (newStatus === 'RESOLVED') {
                        list[idx].timeline.forEach(s => { s.done = true; if (s.date === 'Pending') s.date = todayStr; });
                    }
                }

                localStorage.setItem(PROBLEMS_KEY, JSON.stringify(list));
                localStorage.setItem(SHARED_ISSUES_LEGACY_KEY, JSON.stringify(list));

                // Notify citizen
                this.addNotification({
                    role: 'citizen',
                    title: `Status Updated: ${newStatus}`,
                    message: `Your grievance "${list[idx].title}" status has changed to "${newStatus}".`,
                    time: 'Just now',
                    badge: 'Status Change'
                });

                return list[idx];
            }
            return null;
        },

        // --- CHALLENGES ---
        getChallenges: function () {
            initStorage();
            try {
                return JSON.parse(localStorage.getItem(CHALLENGES_KEY) || '[]');
            } catch (e) {
                return DEFAULT_CHALLENGES;
            }
        },

        getChallengeById: function (id) {
            const list = this.getChallenges();
            return list.find(c => String(c.id) === String(id)) || null;
        },

        acceptChallenge: function (challengeId, universityName) {
            const list = this.getChallenges();
            const idx = list.findIndex(c => String(c.id) === String(challengeId));
            if (idx !== -1) {
                list[idx].status = 'ACCEPTED';
                list[idx].acceptedBy = universityName || 'National Institute of Technology';
                localStorage.setItem(CHALLENGES_KEY, JSON.stringify(list));

                // Add notification
                this.addNotification({
                    role: 'university',
                    title: 'Challenge Accepted',
                    message: `You accepted "${list[idx].title}". Proceed to create your multidisciplinary project team.`,
                    time: 'Just now',
                    badge: 'Challenge Accepted'
                });

                this.addNotification({
                    role: 'government',
                    title: 'University Accepted Challenge',
                    message: `${list[idx].acceptedBy} has accepted community challenge "${list[idx].title}".`,
                    time: 'Just now',
                    badge: 'Academic Assignment'
                });

                return list[idx];
            }
            return null;
        },

        // --- PROJECTS ---
        getProjects: function () {
            initStorage();
            try {
                return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
            } catch (e) {
                return DEFAULT_PROJECTS;
            }
        },

        getProjectById: function (id) {
            const list = this.getProjects();
            return list.find(p => String(p.id) === String(id)) || null;
        },

        createTeamForProject: function (projectId, teamData) {
            const list = this.getProjects();
            const idx = list.findIndex(p => String(p.id) === String(projectId));
            if (idx !== -1) {
                list[idx].mentor = teamData.mentor || list[idx].mentor;
                list[idx].teamMembers = teamData.members || list[idx].teamMembers;
                list[idx].teamsCount = (list[idx].teamsCount || 1) + 1;
                list[idx].participantsCount = (list[idx].participantsCount || 0) + (teamData.members ? teamData.members.length : 3);
                localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));

                this.addNotification({
                    role: 'university',
                    title: 'Project Team Created',
                    message: `Multidisciplinary team registered for "${list[idx].title}" under mentor ${list[idx].mentor}.`,
                    time: 'Just now',
                    badge: 'Team Registered'
                });

                return list[idx];
            }
            return null;
        },

        addSupportOffer: function (projectId, supportData) {
            const list = this.getProjects();
            const idx = list.findIndex(p => String(p.id) === String(projectId));
            const projTitle = idx !== -1 ? list[idx].title : 'Civic Project';

            // Notify University & Industry
            this.addNotification({
                role: 'university',
                title: 'Industry Support Offered',
                message: `${supportData.company || 'Industry Partner'} offered ${supportData.type} for "${projTitle}".`,
                time: 'Just now',
                badge: 'Industry Collaboration'
            });

            this.addNotification({
                role: 'industry',
                title: 'Support Proposal Submitted',
                message: `Your offer of ${supportData.type} for "${projTitle}" has been logged and sent to the faculty lead.`,
                time: 'Just now',
                badge: 'Offer Logged'
            });

            return true;
        },

        // --- NOTIFICATIONS ---
        getNotifications: function (role) {
            initStorage();
            try {
                const list = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
                if (!role || role === 'all') return list;
                return list.filter(n => n.role === role || n.role === 'all');
            } catch (e) {
                return DEFAULT_NOTIFICATIONS;
            }
        },

        addNotification: function (notif) {
            const list = this.getNotifications('all');
            notif.id = 'NOTIF-' + Date.now();
            if (notif.read === undefined) notif.read = false;
            list.unshift(notif);
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
            return notif;
        },

        markNotificationRead: function (id) {
            const list = this.getNotifications('all');
            const item = list.find(n => n.id === id);
            if (item) {
                item.read = true;
                localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
            }
        },

        markAllNotificationsRead: function (role) {
            const list = this.getNotifications('all');
            list.forEach(n => {
                if (!role || n.role === role || role === 'all') {
                    n.read = true;
                }
            });
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
        },

        // --- AUTH & SESSION ---
        getUser: function () {
            try {
                const u = localStorage.getItem(USER_KEY);
                if (u) return JSON.parse(u);
            } catch (e) { }

            const demoRole = localStorage.getItem(DEMO_ROLE_KEY) || 'citizen';
            return {
                name: 'Civic Demo User',
                email: 'demo@jansetu.gov.in',
                role: demoRole,
                isLoggedIn: true
            };
        },

        setUser: function (userObj) {
            localStorage.setItem(USER_KEY, JSON.stringify(userObj));
            if (userObj.role) {
                localStorage.setItem(DEMO_ROLE_KEY, userObj.role);
            }
        },

        getRole: function () {
            return localStorage.getItem(DEMO_ROLE_KEY) || 'citizen';
        },

        setRole: function (role) {
            localStorage.setItem(DEMO_ROLE_KEY, role);
            const user = this.getUser();
            user.role = role;
            this.setUser(user);
        },

        logout: function () {
            localStorage.removeItem('jansetu_access_token');
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem(DEMO_ROLE_KEY);
            window.location.href = window.location.pathname.includes('/dashboards/') ? '../login.html' : 'login.html';
        }
    };
})();
