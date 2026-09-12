// role.js - JanSetu Account Role Selection Logic (Connected to Backend API)

const routes = {
    citizen: 'dashboards/citizen-dashboard.html',
    university: 'dashboards/university-dashboard.html',
    government: 'dashboards/government-dashboard.html',
    industry: 'dashboards/industry-dashboard.html'
};

document.addEventListener('DOMContentLoaded', async () => {
    // Verify user is authenticated
    const token = window.JanSetuAuth ? window.JanSetuAuth.getToken() : localStorage.getItem('jansetu_access_token');
    if (!token) {
        // No session token found, user must log in or sign up first
        alert('Please log in or sign up before selecting your account role.');
        window.location.href = 'login.html';
        return;
    }

    // Optional: If user already has an assigned role, highlight it
    const user = window.JanSetuAuth ? window.JanSetuAuth.getUser() : null;
    if (user && user.role) {
        const option = document.querySelector(`.role-option[onclick*="'${user.role}'"]`);
        if (option) {
            option.style.borderColor = '#004d3d';
            option.style.backgroundColor = '#f0fdf4';
        }
    }
});

async function selectRole(role) {
    const validRoles = ['citizen', 'university', 'government', 'industry'];
    if (!validRoles.includes(role)) {
        alert('Please choose a valid role option.');
        return;
    }

    const buttons = document.querySelectorAll('.role-option');
    buttons.forEach(btn => btn.style.pointerEvents = 'none');

    try {
        const response = await window.JanSetuAuth.updateRole(role);

        if (response.ok && response.data && response.data.success) {
            // Update token if new one is issued
            if (response.data.token) {
                window.JanSetuAuth.setToken(response.data.token);
            }
            // Update user in local storage / JanSetuState
            window.JanSetuAuth.setUser(response.data.user);

            // Redirect to appropriate dashboard
            const targetUrl = routes[role] || routes.citizen;
            window.location.href = targetUrl;
        } else {
            const errorMsg = response.data && response.data.message 
                ? response.data.message 
                : 'Failed to assign role. Please try again.';
            alert(errorMsg);
            buttons.forEach(btn => btn.style.pointerEvents = 'auto');
        }
    } catch (err) {
        console.error('Error assigning role:', err);
        alert('Network error while assigning role. Please check connection and try again.');
        buttons.forEach(btn => btn.style.pointerEvents = 'auto');
    }
}
