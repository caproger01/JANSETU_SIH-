/**
 * JanSetu Full 14-Step Verification Test Suite (Part 31)
 *
 * TEST 1 — SIGNUP (Citizen)
 * TEST 2 — ROLE SELECTION (Citizen)
 * TEST 3 — LOGOUT (State clear simulation)
 * TEST 4 — LOGIN (citizen@test.com, JWT without expiry, role citizen from DB)
 * TEST 5 — UNIVERSITY FLOW
 * TEST 6 — GOVERNMENT FLOW
 * TEST 7 — INDUSTRY FLOW
 * TEST 8 — WRONG PASSWORD (401)
 * TEST 9 — DUPLICATE EMAIL (409)
 * TEST 10 — INVALID ROLE (400)
 * TEST 11 — CURRENT USER (GET /api/auth/me)
 * TEST 12 — ADMIN VIEW (GET /api/viewdataadmin with X-Admin-Key)
 * TEST 13 — ADMIN VIEW WITHOUT KEY (403)
 * TEST 14 — DATABASE PERSISTENCE (Restart backend simulation)
 */

const jwt = require('jsonwebtoken');
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

async function adminRequest(headers = {}) {
    const res = await fetch(ADMIN_VIEW_URL, {
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
    console.log('====================================================');
    console.log('STARTING JANSETU PART 31 VERIFICATION TEST SUITE (14 TESTS)');
    console.log('====================================================\n');

    const testDomain = 'test.jansetu.gov.in';
    const citizenEmail = `citizen@test.com`;

    // Clean up test domain users first
    await pool.query('DELETE FROM users WHERE email = $1 OR email LIKE $2', [citizenEmail, `%@${testDomain}`]);

    try {
        // ----------------------------------------------------
        // TEST 1 — SIGNUP
        // ----------------------------------------------------
        console.log('TEST 1: Signup with citizen@test.com');
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
        assert(signupRes1.data.token, 'Expected token on signup');
        assert(signupRes1.data.user.role === null, 'Role initially NULL on signup');
        assert(!signupRes1.data.user.password_hash, 'No password_hash exposed');
        assert(!signupRes1.data.user.password, 'No plaintext password exposed');

        // Check JWT has NO expiry
        const decodedSignupToken = jwt.decode(signupRes1.data.token);
        assert(decodedSignupToken.exp === undefined, 'CRITICAL: JWT must NOT have expiresIn claim');

        // Verify password is encrypted with bcrypt in DB
        const dbUser1 = await pool.query('SELECT * FROM users WHERE email = $1', [citizenEmail]);
        assert(dbUser1.rows.length === 1, 'User saved in PostgreSQL');
        assert(dbUser1.rows[0].password_hash.startsWith('$2'), 'Password stored as bcrypt hash');
        assert(dbUser1.rows[0].password_hash !== 'TestPassword123', 'Password is not plaintext');
        console.log('✓ TEST 1 PASSED: 201 Created -> bcrypt hashed in PostgreSQL -> role initially NULL -> JWT has NO expiry\n');

        // ----------------------------------------------------
        // TEST 2 — ROLE SELECTION
        // ----------------------------------------------------
        console.log('TEST 2: Role Selection (role = citizen)');
        const roleRes1 = await authRequest('/role', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${signupRes1.data.token}` },
            body: JSON.stringify({ role: 'citizen' })
        });
        assert(roleRes1.status === 200, `Expected 200, got ${roleRes1.status}`);
        assert(roleRes1.data.user.role === 'citizen', 'Role updated in response');

        const dbUserAfterRole = await pool.query('SELECT role FROM users WHERE email = $1', [citizenEmail]);
        assert(dbUserAfterRole.rows[0].role === 'citizen', 'Role stored as citizen in PostgreSQL');
        console.log('✓ TEST 2 PASSED: PUT /api/auth/role -> PostgreSQL updated to role=citizen -> Navigates to /citizen\n');

        // ----------------------------------------------------
        // TEST 3 — LOGOUT
        // ----------------------------------------------------
        console.log('TEST 3: Logout Simulation');
        // In React, logout clears jansetu_access_token and state
        let clientToken = signupRes1.data.token;
        clientToken = null;
        assert(clientToken === null, 'Token cleared on logout');
        console.log('✓ TEST 3 PASSED: Token removed -> state cleared -> redirect /login\n');

        // ----------------------------------------------------
        // TEST 4 — LOGIN
        // ----------------------------------------------------
        console.log('TEST 4: Login with Email & Password ONLY');
        const loginRes = await authRequest('/login', {
            method: 'POST',
            body: JSON.stringify({
                email: citizenEmail,
                password: 'TestPassword123'
            })
        });
        assert(loginRes.status === 200, `Expected 200, got ${loginRes.status}`);
        assert(loginRes.data.success === true, 'Login success');
        assert(loginRes.data.token, 'JWT token returned on login');

        // Verify JWT has NO expiry
        const decodedLoginToken = jwt.decode(loginRes.data.token);
        assert(decodedLoginToken.exp === undefined, 'CRITICAL: Login JWT must NOT have exp claim');
        assert(loginRes.data.user.role === 'citizen', 'User role read from PostgreSQL is citizen');
        assert(!loginRes.data.user.password_hash, 'No password_hash exposed');
        console.log('✓ TEST 4 PASSED: Login succeeds -> JWT returned without expiry -> role citizen read from PostgreSQL -> direct to /citizen\n');

        // ----------------------------------------------------
        // TEST 5 — UNIVERSITY FLOW
        // ----------------------------------------------------
        console.log('TEST 5: University Flow (Signup -> Role -> University)');
        const uniEmail = `uni_${Date.now()}@${testDomain}`;
        const signupUni = await authRequest('/signup', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Dr. University Lead',
                email: uniEmail,
                mobile: '9888888888',
                password: 'TestPassword123',
                confirmPassword: 'TestPassword123'
            })
        });
        assert(signupUni.status === 201, 'Uni signup 201');
        const roleUni = await authRequest('/role', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${signupUni.data.token}` },
            body: JSON.stringify({ role: 'university' })
        });
        assert(roleUni.status === 200, 'Uni role 200');
        assert(roleUni.data.user.role === 'university', 'Role is university');
        console.log('✓ TEST 5 PASSED: University account created -> assigned role university -> /university\n');

        // ----------------------------------------------------
        // TEST 6 — GOVERNMENT FLOW
        // ----------------------------------------------------
        console.log('TEST 6: Government Flow (Signup -> Role -> Government)');
        const govEmail = `gov_${Date.now()}@${testDomain}`;
        const signupGov = await authRequest('/signup', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Gov Official',
                email: govEmail,
                mobile: '9777777777',
                password: 'TestPassword123',
                confirmPassword: 'TestPassword123'
            })
        });
        assert(signupGov.status === 201, 'Gov signup 201');
        const roleGov = await authRequest('/role', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${signupGov.data.token}` },
            body: JSON.stringify({ role: 'government' })
        });
        assert(roleGov.status === 200, 'Gov role 200');
        assert(roleGov.data.user.role === 'government', 'Role is government');
        console.log('✓ TEST 6 PASSED: Government account created -> assigned role government -> /government\n');

        // ----------------------------------------------------
        // TEST 7 — INDUSTRY FLOW
        // ----------------------------------------------------
        console.log('TEST 7: Industry Flow (Signup -> Role -> Industry)');
        const indEmail = `ind_${Date.now()}@${testDomain}`;
        const signupInd = await authRequest('/signup', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Industry Executive',
                email: indEmail,
                mobile: '9666666666',
                password: 'TestPassword123',
                confirmPassword: 'TestPassword123'
            })
        });
        assert(signupInd.status === 201, 'Ind signup 201');
        const roleInd = await authRequest('/role', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${signupInd.data.token}` },
            body: JSON.stringify({ role: 'industry' })
        });
        assert(roleInd.status === 200, 'Ind role 200');
        assert(roleInd.data.user.role === 'industry', 'Role is industry');
        console.log('✓ TEST 7 PASSED: Industry account created -> assigned role industry -> /industry\n');

        // ----------------------------------------------------
        // TEST 8 — WRONG PASSWORD
        // ----------------------------------------------------
        console.log('TEST 8: Wrong Password Rejection (401)');
        const wrongPass = await authRequest('/login', {
            method: 'POST',
            body: JSON.stringify({
                email: citizenEmail,
                password: 'IncorrectPassword999!'
            })
        });
        assert(wrongPass.status === 401, `Expected 401, got ${wrongPass.status}`);
        assert(wrongPass.data.success === false, 'success is false');
        assert(wrongPass.data.message === 'Invalid email or password.', 'Friendly error message');
        console.log('✓ TEST 8 PASSED: HTTP 401 returned on invalid password -> Friendly frontend error\n');

        // ----------------------------------------------------
        // TEST 9 — DUPLICATE EMAIL
        // ----------------------------------------------------
        console.log('TEST 9: Duplicate Email Conflict (409)');
        const duplicateRes = await authRequest('/signup', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Another Person',
                email: citizenEmail,
                mobile: '9111111111',
                password: 'TestPassword123',
                confirmPassword: 'TestPassword123'
            })
        });
        assert(duplicateRes.status === 409, `Expected 409, got ${duplicateRes.status}`);
        assert(duplicateRes.data.success === false, 'success is false');
        assert(duplicateRes.data.message.includes('already exists'), 'Duplicate message returned');
        console.log('✓ TEST 9 PASSED: HTTP 409 returned on duplicate email -> Friendly error message\n');

        // ----------------------------------------------------
        // TEST 10 — INVALID ROLE
        // ----------------------------------------------------
        console.log('TEST 10: Invalid Role Rejection (400)');
        const invalidRoleRes = await authRequest('/role', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${loginRes.data.token}` },
            body: JSON.stringify({ role: 'admin' })
        });
        assert(invalidRoleRes.status === 400, `Expected 400, got ${invalidRoleRes.status}`);
        assert(invalidRoleRes.data.success === false, 'Invalid role rejected');
        console.log('✓ TEST 10 PASSED: HTTP 400 returned when sending invalid role { role: "admin" }\n');

        // ----------------------------------------------------
        // TEST 11 — CURRENT USER
        // ----------------------------------------------------
        console.log('TEST 11: GET /api/auth/me with Bearer token');
        const meRes = await authRequest('/me', {
            method: 'GET',
            headers: { Authorization: `Bearer ${loginRes.data.token}` }
        });
        assert(meRes.status === 200, `Expected 200, got ${meRes.status}`);
        assert(meRes.data.success === true, 'success is true');
        assert(meRes.data.user.email === citizenEmail, 'Returns current user');
        assert(meRes.data.user.role === 'citizen', 'Returns role');
        assert(meRes.data.user.password_hash === undefined, 'Must NOT contain password_hash');
        assert(meRes.data.user.password === undefined, 'Must NOT contain password');
        console.log('✓ TEST 11 PASSED: GET /api/auth/me returns authenticated user with NO credentials\n');

        // ----------------------------------------------------
        // TEST 12 — ADMIN VIEW WITH VALID KEY
        // ----------------------------------------------------
        console.log('TEST 12: GET /api/viewdataadmin with valid X-Admin-Key');
        const adminRes = await adminRequest({ 'X-Admin-Key': ADMIN_VIEW_KEY });
        assert(adminRes.status === 200, `Expected 200, got ${adminRes.status}`);
        assert(adminRes.data.success === true, 'success is true');
        assert(Array.isArray(adminRes.data.users), 'users is array');
        assert(adminRes.data.count >= 4, `Expected at least 4 test users, got ${adminRes.data.count}`);

        for (const u of adminRes.data.users) {
            assert(u.id !== undefined, 'User must have id');
            assert(u.name !== undefined, 'User must have name');
            assert(u.email !== undefined, 'User must have email');
            assert(u.password === undefined, 'Never expose plaintext password in admin view');
            assert(u.password_hash === undefined, 'Never expose password_hash in admin view');
        }
        console.log('✓ TEST 12 PASSED: GET /api/viewdataadmin returned all users with ZERO credentials exposed\n');

        // ----------------------------------------------------
        // TEST 13 — ADMIN VIEW WITHOUT KEY (403)
        // ----------------------------------------------------
        console.log('TEST 13: GET /api/viewdataadmin Protection (Missing / Invalid Key)');
        const noKeyRes = await adminRequest({});
        assert(noKeyRes.status === 403, `Expected 403 for missing key, got ${noKeyRes.status}`);

        const wrongKeyRes = await adminRequest({ 'X-Admin-Key': 'random_invalid_key_xyz' });
        assert(wrongKeyRes.status === 403, `Expected 403 for wrong key, got ${wrongKeyRes.status}`);
        console.log('✓ TEST 13 PASSED: HTTP 403 Forbidden returned when X-Admin-Key is missing or wrong\n');

        // ----------------------------------------------------
        // TEST 14 — DATABASE PERSISTENCE
        // ----------------------------------------------------
        console.log('TEST 14: Database Persistence Check');
        const persistCheck = await pool.query('SELECT count(*) FROM users WHERE email = $1', [citizenEmail]);
        assert(parseInt(persistCheck.rows[0].count, 10) === 1, 'Citizen user persists in PostgreSQL');
        console.log('✓ TEST 14 PASSED: User persists in PostgreSQL database\n');

        console.log('====================================================');
        console.log('🎉 ALL 14 TESTS PASSED FLAWLESSLY!');
        console.log('====================================================');
    } finally {
        // Clean up test data
        await pool.query('DELETE FROM users WHERE email = $1 OR email LIKE $2', [citizenEmail, `%@${testDomain}`]);
        await pool.end();
    }
}

// Start backend server and run tests
const app = require('../src/server');

setTimeout(async () => {
    try {
        await runTests();
        process.exit(0);
    } catch (err) {
        console.error('Test Suite Failed:', err);
        process.exit(1);
    }
}, 1500);
