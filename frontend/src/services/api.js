// Centralized API client for JanSetu Frontend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export function getStoredToken() {
  return localStorage.getItem('jansetu_access_token');
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('jansetu_access_token', token);
  } else {
    localStorage.removeItem('jansetu_access_token');
  }
}

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;
  
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  const token = getStoredToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => null);

    return {
      ok: res.ok,
      status: res.status,
      data: data || {}
    };
  } catch (err) {
    console.error(`API request failed [${endpoint}]:`, err);
    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        message: 'Unable to connect to JanSetu server. Please verify backend is running on port 5001.'
      }
    };
  }
}

export const api = {
  // Auth
  async signup(data) {
    return apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(data) });
  },
  async login(data) {
    return apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateRole(role) {
    return apiFetch('/auth/role', { method: 'PUT', body: JSON.stringify({ role }) });
  },
  async getMe() {
    return apiFetch('/auth/me', { method: 'GET' });
  },

  // Citizen
  async getCitizenOverview() {
    return apiFetch('/citizen/overview', { method: 'GET' });
  },
  async getCitizenProblems(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/citizen/problems${query ? '?' + query : ''}`, { method: 'GET' });
  },
  async getCitizenProblemById(id) {
    return apiFetch(`/citizen/problems/${id}`, { method: 'GET' });
  },
  async getCitizenProblemProgress(id) {
    return apiFetch(`/citizen/problems/${id}/progress`, { method: 'GET' });
  },
  async preScreenProblem(data) {
    return apiFetch('/citizen/pre-screen', { method: 'POST', body: JSON.stringify(data) });
  },
  async submitCitizenProblem(formData) {
    return apiFetch('/citizen/problems', { method: 'POST', body: formData });
  },
  async submitCitizenProblemJSON(data) {
    return apiFetch('/citizen/problems', { method: 'POST', body: JSON.stringify(data) });
  },
  async getCitizenNotices() {
    return apiFetch('/citizen/notices', { method: 'GET' });
  },
  async deleteCitizenProblem(id) {
    return apiFetch(`/citizen/problems/${id}`, { method: 'DELETE' });
  },

  // Government Overview & Problems
  async getGovernmentOverview() {
    return apiFetch('/government/overview', { method: 'GET' });
  },
  async getGovernmentProblems(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/government/problems${query ? '?' + query : ''}`, { method: 'GET' });
  },
  async updateGovernmentProblemStatus(id, data) {
    return apiFetch(`/government/problems/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async publishChallenge(data) {
    return apiFetch('/government/challenges', { method: 'POST', body: JSON.stringify(data) });
  },
  async getGovernmentMapProblems() {
    return apiFetch('/government/map-problems', { method: 'GET' });
  },
  async getGovernmentAiInsights() {
    return apiFetch('/government/ai-insights', { method: 'GET' });
  },

  // Council & Department Architecture
  async getCategories() {
    return apiFetch('/government/categories', { method: 'GET' });
  },
  async createCategory(data) {
    return apiFetch('/government/categories', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateCategory(id, data) {
    return apiFetch(`/government/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async getCouncils() {
    return apiFetch('/government/councils', { method: 'GET' });
  },
  async createCouncil(data) {
    return apiFetch('/government/councils', { method: 'POST', body: JSON.stringify(data) });
  },
  async getCategoryMappings() {
    return apiFetch('/government/category-mappings', { method: 'GET' });
  },
  async updateCategoryMapping(id, data) {
    return apiFetch(`/government/category-mappings/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async getCouncilWorkload() {
    return apiFetch('/government/council-workload', { method: 'GET' });
  },
  async getProblemCouncilRecommendation(id) {
    return apiFetch(`/government/problems/${id}/council-recommendation`, { method: 'GET' });
  },
  async assignCouncilToProblem(id, data) {
    return apiFetch(`/government/problems/${id}/assign-council`, { method: 'POST', body: JSON.stringify(data) });
  },

  // Implementation Projects (Government)
  async getGovernmentProjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/government/projects${query ? '?' + query : ''}`, { method: 'GET' });
  },
  async getGovernmentProjectById(id) {
    return apiFetch(`/government/projects/${id}`, { method: 'GET' });
  },
  async createImplementationProject(data) {
    return apiFetch('/government/projects', { method: 'POST', body: JSON.stringify(data) });
  },
  async getProjectPartnerRecommendations(id) {
    return apiFetch(`/government/projects/${id}/recommendations`, { method: 'GET' });
  },
  async allotProject(id, data) {
    return apiFetch(`/government/projects/${id}/allot`, { method: 'POST', body: JSON.stringify(data) });
  },
  async verifyProject(id, data) {
    return apiFetch(`/government/projects/${id}/verify`, { method: 'POST', body: JSON.stringify(data) });
  },
  async updateGovernmentProjectMilestone(milestoneId, data) {
    return apiFetch(`/government/milestones/${milestoneId}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async addGovernmentProjectMilestone(projectId, data) {
    return apiFetch(`/government/projects/${projectId}/milestones`, { method: 'POST', body: JSON.stringify(data) });
  },

  // University
  async getUniversityOverview() {
    return apiFetch('/university/overview', { method: 'GET' });
  },
  async getUniversityChallenges() {
    return apiFetch('/university/challenges', { method: 'GET' });
  },
  async acceptUniversityChallenge(data) {
    return apiFetch('/university/challenges/accept', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateProjectMilestone(milestoneId, data) {
    return apiFetch(`/university/milestones/${milestoneId}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async addProjectMilestone(projectId, data) {
    return apiFetch(`/university/projects/${projectId}/milestones`, { method: 'POST', body: JSON.stringify(data) });
  },
  async getUniversityProjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/university/projects${query ? '?' + query : ''}`, { method: 'GET' });
  },
  async getUniversityProjectById(id) {
    return apiFetch(`/university/projects/${id}`, { method: 'GET' });
  },
  async submitUniversityProjectProgress(id, data) {
    return apiFetch(`/university/projects/${id}/progress`, { method: 'POST', body: JSON.stringify(data) });
  },
  async updateUniversityProjectTeam(id, data) {
    return apiFetch(`/university/projects/${id}/team`, { method: 'POST', body: JSON.stringify(data) });
  },

  // Industry
  async getIndustryOverview() {
    return apiFetch('/industry/overview', { method: 'GET' });
  },
  async getIndustryDiscoverProjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/industry/projects${query ? '?' + query : ''}`, { method: 'GET' });
  },
  async submitIndustrySupportOffer(data) {
    return apiFetch('/industry/support', { method: 'POST', body: JSON.stringify(data) });
  },
  async getIndustryAllottedProjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/industry/allotted-projects${query ? '?' + query : ''}`, { method: 'GET' });
  },
  async getIndustryProjectById(id) {
    return apiFetch(`/industry/projects/${id}`, { method: 'GET' });
  },

  // Notifications
  async getNotifications() {
    return apiFetch('/notifications', { method: 'GET' });
  },
  async markNotificationRead(id) {
    return apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
  }
};

export default api;
