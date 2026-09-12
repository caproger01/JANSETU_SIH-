const assert = require('assert');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = require('../src/server');

const PORT = 5097;

function req(method, path, headers, body) {
    return new Promise((resolve, reject) => {
        const r = http.request({ port: PORT, method, path, headers }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
                catch(e) { resolve({ status: res.statusCode, data: d }); }
            });
        });
        r.on('error', reject);
        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

const server = app.listen(PORT, async () => {
    try {
        console.log('=== Starting JanSetu Full Full-Stack Cross-Role Verification ===');
        
        // Test 1: Logins
        console.log('Testing logins for 4 roles...');
        const citLogin = await req('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, { email: 'citizen@jansetu.gov.in', password: 'JanSetu@2026' });
        assert.strictEqual(citLogin.status, 200);
        const citToken = citLogin.data.token;

        const govLogin = await req('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, { email: 'government@jansetu.gov.in', password: 'JanSetu@2026' });
        assert.strictEqual(govLogin.status, 200);
        const govToken = govLogin.data.token;

        const uniLogin = await req('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, { email: 'university@jansetu.gov.in', password: 'JanSetu@2026' });
        assert.strictEqual(uniLogin.status, 200);
        const uniToken = uniLogin.data.token;

        const indLogin = await req('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, { email: 'industry@jansetu.gov.in', password: 'JanSetu@2026' });
        assert.strictEqual(indLogin.status, 200);
        const indToken = indLogin.data.token;
        console.log('✓ All 4 seed roles authenticated successfully');

        // Test 2: RBAC isolation
        const forbiddenRes = await req('GET', '/api/government/overview', { 'Authorization': 'Bearer ' + citToken });
        assert.strictEqual(forbiddenRes.status, 403);
        console.log('✓ Citizen blocked from Government API with HTTP 403');

        // Test 3: Citizen AI Pre-screening
        const preScreenRes = await req('POST', '/api/citizen/pre-screen', { 'Authorization': 'Bearer ' + citToken, 'Content-Type': 'application/json' }, {
            title: 'Water accumulation on Ring Road',
            description: 'Stagnant wastewater pooling near junction',
            category: 'Sanitation',
            location: 'Ward 12, Civil Lines',
            affectedPopulation: 500
        });
        assert.strictEqual(preScreenRes.status, 200);
        console.log('✓ AI Pre-screening verified: Score ' + preScreenRes.data.data.analysis.priorityScore + ' (' + preScreenRes.data.data.analysis.priorityLevel + ')');

        // Test 4: Citizen Submit Problem
        const probRes = await req('POST', '/api/citizen/problems', { 'Authorization': 'Bearer ' + citToken, 'Content-Type': 'application/json' }, {
            title: 'Collapsed drain culvert on Sector 4 road',
            description: 'Major drain collapse overflowing onto pedestrian sidewalk',
            category: 'Sanitation',
            ward: 'Ward 12, Civil Lines',
            location: 'Sector 4 Junction',
            affectedPopulation: 600,
            urgency: 'HIGH'
        });
        assert.strictEqual(probRes.status, 201);
        const problemId = probRes.data.data.id;
        console.log('✓ Problem lodged with ID: ' + problemId + ' (' + probRes.data.data.code + ')');

        // Test 5: Government Moderation & Status Update
        const statusRes = await req('PATCH', '/api/government/problems/' + problemId + '/status', { 'Authorization': 'Bearer ' + govToken, 'Content-Type': 'application/json' }, {
            status: 'OFFICER ASSIGNED',
            assignedDepartment: 'Public Works Department (PWD)',
            officerRemarks: 'Assigned zonal engineer for culvert repair'
        });
        assert.strictEqual(statusRes.status, 200);
        console.log('✓ Government status update recorded');

        // Test 6: Government Publish Innovation Challenge
        const chalRes = await req('POST', '/api/government/challenges', { 'Authorization': 'Bearer ' + govToken, 'Content-Type': 'application/json' }, {
            problemId: problemId,
            title: 'Modular Prefabricated Bio-Drainage Culvert System',
            description: 'Engineering design for quick deployment culverts with precast polymer concrete',
            category: 'Sanitation & Materials',
            ward: 'Ward 12',
            location: 'Sector 4',
            priorityLevel: 'HIGH',
            affectedPopulation: 600,
            requiredExpertise: ['Civil Engineering', 'Material Science'],
            grantAmount: '₹ 7,00,000'
        });
        assert.strictEqual(chalRes.status, 201);
        const challengeId = chalRes.data.data.id;
        console.log('✓ Challenge published: ' + chalRes.data.data.code);

        // Test 7: University Challenge Feed with AI Match Score
        const chListRes = await req('GET', '/api/university/challenges', { 'Authorization': 'Bearer ' + uniToken });
        assert.strictEqual(chListRes.status, 200);
        const matched = chListRes.data.data.find(c => c.id === challengeId);
        assert(matched && matched.ai_match_percentage >= 50);
        console.log('✓ University received AI compatibility match: ' + matched.ai_match_percentage + '%');

        // Test 8: University Accepts Challenge
        const acceptRes = await req('POST', '/api/university/challenges/accept', { 'Authorization': 'Bearer ' + uniToken, 'Content-Type': 'application/json' }, {
            challengeId: challengeId,
            projectTitle: 'Polymer Bio-Swale Precast Drain Unit',
            description: 'Student research capstone prototype design',
            leadMentor: 'Prof. S. K. Sharma',
            teamName: 'IIT Roorkee Jal Innovation Lab',
            fundingNeeded: '₹ 6,00,000'
        });
        assert.strictEqual(acceptRes.status, 201);
        const projectId = acceptRes.data.data.id;
        console.log('✓ University initialized capstone project ID: ' + projectId);

        // Test 9: Industry Pledges CSR Support
        const supportRes = await req('POST', '/api/industry/support', { 'Authorization': 'Bearer ' + indToken, 'Content-Type': 'application/json' }, {
            projectId: projectId,
            supportType: 'FUNDING',
            amountOrDetails: '₹ 3,50,000 Corporate CSR grant for polymer mold fabrication'
        });
        assert.strictEqual(supportRes.status, 201);
        console.log('✓ Industry pledged CSR support for project');

        // Test 10: Admin Dev Inspection
        const adminKey = process.env.ADMIN_VIEW_KEY || 'jansetu_admin_test_key_2026';
        const adminRes = await req('GET', '/api/viewdataadmin?key=' + adminKey, {});
        assert.strictEqual(adminRes.status, 200);
        assert(adminRes.data.counts.users >= 4);
        assert(adminRes.data.counts.problems >= 1);
        assert(adminRes.data.counts.challenges >= 1);
        assert(adminRes.data.counts.projects >= 1);
        assert(adminRes.data.counts.offers >= 1);
        console.log('✓ GET /api/viewdataadmin verified across all database tables');

        console.log('\n================================================================');
        console.log('🎉 ALL 10 CROSS-ROLE E2E FLOWS EXECUTED & PASSED 100% PERFECTLY! 🎉');
        console.log('================================================================');
        server.close(() => process.exit(0));
    } catch (err) {
        console.error('Test failed:', err);
        server.close(() => process.exit(1));
    }
});
