/**
 * JanSetu Frontend API & Authentication Service
 * Centralizes all backend API communication, token storage, and session handling
 */

(function () {
    const TOKEN_KEY = 'jansetu_access_token';
    const USER_KEY = 'janSetu_user';
    const DEMO_ROLE_KEY = 'demoRole';

    // Automatically detect whether frontend is served by the backend or another dev server
    const isBackendHost = window.location.port === '5001';
    const API_BASE_URL = isBackendHost 
        ? `${window.location.origin}/api` 
        : 'http://localhost:5001/api';

    const DASHBOARD_ROUTES = {
        citizen: 'dashboards/citizen-dashboard.html',
        university: 'dashboards/university-dashboard.html',
        government: 'dashboards/government-dashboard.html',
        industry: 'dashboards/industry-dashboard.html'
    };

    const JanSetuAuth = {
        API_BASE_URL,
        TOKEN_KEY,
        USER_KEY,

        getToken() {
            return localStorage.getItem(TOKEN_KEY);
        },

        setToken(token) {
            if (token) {
                localStorage.setItem(TOKEN_KEY, token);
            }
        },

        removeToken() {
            localStorage.removeItem(TOKEN_KEY);
        },

        getUser() {
            try {
                const u = localStorage.getItem(USER_KEY);
                return u ? JSON.parse(u) : null;
            } catch (e) {
                return null;
            }
        },

        setUser(user) {
            if (user) {
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                if (user.role) {
                    localStorage.setItem(DEMO_ROLE_KEY, user.role);
                }
                if (window.JanSetuState && typeof window.JanSetuState.setUser === 'function') {
                    window.JanSetuState.setUser(user);
                }
            }
        },

        removeUser() {
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem(DEMO_ROLE_KEY);
        },

        logout() {
            this.removeToken();
            this.removeUser();
            const isInDashboards = window.location.pathname.includes('/dashboards/');
            window.location.href = isInDashboards ? '../login.html' : 'login.html';
        },

        getDashboardUrl(role, fromSubdir = false) {
            const path = DASHBOARD_ROUTES[role] || DASHBOARD_ROUTES.citizen;
            return fromSubdir ? `../${path}` : path;
        },

        /**
         * Centralized fetch wrapper
         */
        async request(endpoint, options = {}) {
            const url = `${API_BASE_URL}${endpoint}`;
            const headers = {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            };

            const token = this.getToken();
            if (token && !headers['Authorization']) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            try {
                const response = await fetch(url, {
                    ...options,
                    headers
                });

                const data = await response.json().catch(() => ({
                    success: false,
                    message: 'Invalid server response'
                }));

                // Handle session expiration on protected requests
                if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) {
                    this.removeToken();
                    this.removeUser();
                }

                return {
                    ok: response.ok,
                    status: response.status,
                    data
                };
            } catch (err) {
                console.error(`API request failed [${url}]:`, err);
                return {
                    ok: false,
                    status: 0,
                    data: {
                        success: false,
                        message: 'Unable to connect to the server. Please check if the backend is running.'
                    }
                };
            }
        },

        // API Methods
        signup(formData) {
            return this.request('/auth/signup', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
        },

        login(credentials) {
            return this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
        },

        updateRole(role) {
            return this.request('/auth/role', {
                method: 'PUT',
                body: JSON.stringify({ role })
            });
        },

        getMe() {
            return this.request('/auth/me', {
                method: 'GET'
            });
        }
    };

    window.JanSetuAuth = JanSetuAuth;
})();
