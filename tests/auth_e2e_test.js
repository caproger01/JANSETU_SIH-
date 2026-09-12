/**
 * JanSetu Milestone 1 Automated End-to-End Test Suite
 * Tests all required scenarios against live server and PostgreSQL database:
 * - Signup & Hashing
 * - Role Selection
 * - Login (Email + Password only)
 * - Wrong Password (401)
 * - Duplicate Email (409)
 * - University, Government, Industry Flows
 * - GET /api/viewdataadmin with X-Admin-Key
 * - GET /api/viewdataadmin key protection (403)
 * - Sensitive credentials exclusion check
 * - PostgreSQL persistence
 */

const pool = require('../src/config/db');

const AUTH_URL = 'http://localhost:5001/api/auth';
const ADMIN_VIEW_URL = 'http://localhost:5001/api/viewdataadmin';
const ADMIN_VIEW_KEY = process.env.ADMIN_VIEW_KEY || 'jansetu_admin_test_key_2026';

async function authRequest(path, options = {}) {
    const url = `${AUTH_URL}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const res = await fetch(url, {
        ...options,
        headers
    });

    const data = await res.json().catch(() => null);
    return { status: res.status, data };
}

async function adminRequest(headers = {}, query = '') {
    const url = `${ADMIN_VIEW_URL}${query}`;
    const res = await fetch(url, {
        method: 'GET',
        headers
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(`ASSERTION FAILED: ${message}`);
    }
}

async function runTests() {
    console.log('--- Starting JanSetu Auth, Role & Admin View E2E Test Suite ---\n');

    const testDomain = 'test.jansetu.gov.in';
    // Clean test user data before starting
    await pool.query('DELETE FROM users WHERE email LIKE $1', [`%@${testDomain}`]);

    try {
        // TEST 1: Citizen Account Creation Flow
        console.log('TEST 1: Citizen Account Creation Flow');
        const citizenEmail = `citizen_${Date.now()}@${testDomain}`;
        const signupRes1 = await authRequest('/signup', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Test Citizen',
                email: citizenEmail,
                mobile: '9999999999',
                password: 'TestPassword123',
                confirmPassword: 'TestPassword123'
            })
        });

        assert(signupRes1.status === 201, `Expected 201, got ${signupRes1.status}: ${JSON.stringify(signupRes1.data)}`);
        assert(signupRes1.data.success === true, 'Expected success: true');
        assert(signupRes1.data.token, 'Expected JWT token returned on signup');
        assert(signupRes1.data.user.email === citizenEmail.toLowerCase(), 'Email matches normalized');
        assert(signupRes1.data.user.role === null, 'Role initially NULL on signup');
        assert(!signupRes1.data.user.password_hash, 'Must never return password_hash');
        assert(!signupRes1.data.user.password, 'Must never return plaintext password');

        // Check password in PostgreSQL is bcrypt hashed
        const dbUser1 = await pool.query('SELECT * FROM users WHERE email = $1', [citizenEmail.toLowerCase()]);
        assert(dbUser1.rows.length === 1, 'User exists in PostgreSQL');
        assert(dbUser1.rows[0].password_hash.startsWith('$2'), 'Password stored as bcrypt hash');
        assert(dbUser1.rows[0].password_hash !== 'TestPassword123', 'Password is not plaintext');
        console.log('✓ TEST 1 PASSED: 201 Created -> user created in DB -> password hashed -> role initially NULL\n');

        // TEST 2: Role Selection
        console.log('TEST 2: Citizen Role Selection (PUT /api/auth/role)');
        const roleRes1 = await authRequest('/role', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${signupRes1.data.token}` },
            body: JSON.stringify({ role: 'citizen' })
        });
        assert(roleRes1.status === 200, `Expected 200, got ${roleRes1.status}`);
        assert(roleRes1.data.user.role === 'citizen', 'Role updated to citizen in response');

        const dbUserAfterRole1 = await pool.query('SELECT role FROM users WHERE email = $1', [citizenEmail.toLowerCase()]);
        assert(dbUserAfterRole1.rows[0].role === 'citizen', 'Role stored as citizen in PostgreSQL');
        console.log('✓ TEST 2 PASSED: PUT /api/auth/role -> role becomes citizen in PostgreSQL\n');

        // TEST 3: Login (Email + Password ONLY)
        console.log('TEST 3: Login with Email & Password ONLY');
        const loginRes = await authRequest('/login', {
            method: 'POST',
            body: JSON.stringify({
                email: citizenEmail,
                password: 'TestPassword123'
            })
        });
        assert(loginRes.status === 200, `Expected 200, got ${loginRes.status}`);
        assert(loginRes.data.success === true, 'Expected success: true');
        assert(loginRes.data.token, 'Expected JWT token returned on login');
        assert(loginRes.data.user.role === 'citizen', 'User role read from database is citizen');
        assert(!loginRes.data.user.password_hash, 'No password_hash exposed on login');
        assert(!loginRes.data.user.password, 'No plaintext password exposed on login');

        // Verify GET /api/auth/me
        const meRes = await authRequest('/me', {
            method: 'GET',
            headers: { Authorization: `Bearer ${loginRes.data.token}` }
        });
        assert(meRes.status === 200, 'GET /me succeeds');
        assert(meRes.data.user.email === citizenEmail.toLowerCase(), '/me returns authenticated user');
        assert(meRes.data.user.role === 'citizen', '/me returns verified role');
        console.log('✓ TEST 3 PASSED: Login succeeds -> JWT returned -> role citizen read from PostgreSQL -> GET /me verified\n');

        // TEST 4: Wrong Password
        console.log('TEST 4: Wrong Password Rejection');
        const wrongPassRes = await authRequest('/login', {
            method: 'POST',
            body: JSON.stringify({
                email: citizenEmail,
                password: 'WrongPassword999!'
            })
        });
        assert(wrongPassRes.status === 401, `Expected 401, got ${wrongPassRes.status}`);
        assert(wrongPassRes.data.success === false, 'success is false');
        assert(!wrongPassRes.data.token, 'No token returned on wrong password');
        console.log('✓ TEST 4 PASSED: 401 returned on invalid password\n');

        // TEST 5: Duplicate Email
        console.log('TEST 5: Duplicate Email Conflict');
        const dupRes = await authRequest('/signup', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Duplicate Test',
                email: citizenEmail,
                mobile: '9999999999',
                password: 'TestPassword123',
                confirmPassword: 'TestPassword123'
            })
        });
        assert(dupRes.status === 409, `Expected 409, got ${dupRes.status}`);
        assert(dupRes.data.success === false, 'Duplicate signup rejected with 409');
        assert(dupRes.data.message.includes('already exists'), 'Friendly duplicate message returned');
        console.log('✓ TEST 5 PASSED: 409 Conflict returned for duplicate email\n');

        // TEST 6: University Account
        console.log('TEST 6: University Account Creation & Role Assignment');
        const uniEmail = `uni_${Date.now()}@${testDomain}`;
        const signupRes6 = await authRequest('/signup', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Prof. University',
                email: uniEmail,
                mobile: '9888888888',
                password: 'TestPassword123',
                confirmPassword: 'TestPassword123'
            })
        });
        assert(signupRes6.status === 201, 'Signup 201');
        const roleRes6 = await authRequest('/role', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${signupRes6.data.token}` },
            body: JSON.stringify({ role: 'university' })
        });
        assert(roleRes6.status === 200, 'Role 200');
        assert(roleRes6.data.user.role === 'university', 'Role is university');
        console.log('✓ TEST 6 PASSED: University user created and assigned university role\n');

        // TEST 7: Government Account
        console.log('TEST 7: Government Account Creation & Role Assignment');
        const govEmail = `gov_${Date.now()}@${testDomain}`;
        const signupRes7 = await authRequest('/signup', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Gov Admin',
                email: govEmail,
                mobile: '9777777777',
                password: 'TestPassword123',
                confirmPassword: 'TestPassword123'
            })
        });
        assert(signupRes7.status === 201, 'Signup 201');
        const roleRes7 = await authRequest('/role', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${signupRes7.data.token}` },
            body: JSON.stringify({ role: 'government' })
        });
        assert(roleRes7.status === 200, 'Role 200');
        assert(roleRes7.data.user.role === 'government', 'Role is government');
        console.log('✓ TEST 7 PASSED: Government user created and assigned government role\n');

        // TEST 8: Industry Account
        console.log('TEST 8: Industry Account Creation & Role Assignment');
        const indEmail = `ind_${Date.now()}@${testDomain}`;
        const signupRes8 = await authRequest('/signup', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Industry Partner',
                email: indEmail,
                mobile: '9666666666',
                password: 'TestPassword123',
                confirmPassword: 'TestPassword123'
            })
        });
        assert(signupRes8.status === 201, 'Signup 201');
        const roleRes8 = await authRequest('/role', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${signupRes8.data.token}` },
            body: JSON.stringify({ role: 'industry' })
        });
        assert(roleRes8.status === 200, 'Role 200');
        assert(roleRes8.data.user.role === 'industry', 'Role is industry');
        console.log('✓ TEST 8 PASSED: Industry user created and assigned industry role\n');

        // TEST 9: View Data Admin API with correct X-Admin-Key
        console.log('TEST 9: GET /api/viewdataadmin with Valid X-Admin-Key');
        const adminRes = await adminRequest({ 'X-Admin-Key': ADMIN_VIEW_KEY });
        assert(adminRes.status === 200, `Expected 200, got ${adminRes.status}`);
        assert(adminRes.data.success === true, 'success is true');
        assert(Array.isArray(adminRes.data.users), 'users is an array');
        assert(adminRes.data.count >= 4, `Expected at least 4 test users, got ${adminRes.data.count}`);

        // Rigorous credential exclusion check across all returned user records
        for (const u of adminRes.data.users) {
            assert(u.id !== undefined, 'User must have id');
            assert(u.name !== undefined, 'User must have name');
            assert(u.email !== undefined, 'User must have email');
            assert(u.created_at !== undefined, 'User must have created_at');
            assert(u.password === undefined, 'CRITICAL: Plaintext password must NOT appear in admin view');
            assert(u.password_hash === undefined, 'CRITICAL: password_hash must NOT appear in admin view');
        }
        console.log('✓ TEST 9 PASSED: GET /api/viewdataadmin returns all user records with NO credentials exposed\n');

        // TEST 10: View Data Admin API Key Protection
        console.log('TEST 10: GET /api/viewdataadmin Protection (Missing & Invalid Keys)');
        const noKeyRes = await adminRequest({});
        assert(noKeyRes.status === 403, `Expected 403 for missing key, got ${noKeyRes.status}`);
        assert(noKeyRes.data.success === false, 'success is false');

        const wrongKeyRes = await adminRequest({ 'X-Admin-Key': 'incorrect_random_key_xyz' });
        assert(wrongKeyRes.status === 403, `Expected 403 for wrong key, got ${wrongKeyRes.status}`);
        assert(wrongKeyRes.data.success === false, 'success is false');
        console.log('✓ TEST 10 PASSED: 403 Forbidden returned when X-Admin-Key is missing or invalid\n');

        // TEST 11: Data Persistence in PostgreSQL
        console.log('TEST 11: PostgreSQL Data Persistence Check');
        const countRes = await pool.query('SELECT count(*) FROM users WHERE email LIKE $1', [`%@${testDomain}`]);
        assert(parseInt(countRes.rows[0].count, 10) === 4, `Expected 4 persistent users in DB, got ${countRes.rows[0].count}`);
        console.log('✓ TEST 11 PASSED: All 4 test users remain safely stored in PostgreSQL\n');

        console.log('====================================================');
        console.log('🎉 ALL 11 TEST SCENARIOS COMPLETED SUCCESSFULLY!');
        console.log('====================================================');
    } finally {
        // Clean up test data
        await pool.query('DELETE FROM users WHERE email LIKE $1', [`%@${testDomain}`]);
        await pool.end();
    }
}

// Start app server and run tests
const app = require('../src/server');

let testServer;
new Promise((resolve) => {
    testServer = app.listen(5001, resolve);
}).then(async () => {
    try {
        await runTests();
        testServer.close(() => process.exit(0));
    } catch (err) {
        console.error('Test Suite Failed:', err);
        testServer.close(() => process.exit(1));
    }
});
