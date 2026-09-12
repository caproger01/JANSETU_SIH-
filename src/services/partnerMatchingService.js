/**
 * Partner Matching Service
 * Multi-factor recommendation algorithm for project implementation allotment.
 * Recommends Universities, Academic Departments, Student Teams, and Industry Partners.
 *
 * Factors evaluated:
 * 1. Problem Category & Scope
 * 2. Required Technical Expertise
 * 3. Institution Expertise Areas & Departments
 * 4. Project Location & Geographic Capacity
 * 5. Current Load & Active Projects
 * 6. Past Performance / Verification Track Record
 * 7. Industry CSR Sector Alignment
 */
const pool = require('../config/db');

async function getPartnerRecommendations({ category, requiredExpertise, location, estimatedResources }) {
    const required = Array.isArray(requiredExpertise) ? requiredExpertise : [];
    const normalizedCategory = (category || '').toLowerCase();
    const locLower = (location || '').toLowerCase();

    // 1. Fetch eligible Universities with profiles and active project stats
    const unisRes = await pool.query(`
        SELECT u.id, u.name, u.email, up.institution_name, up.campus, up.department, up.expertise_areas,
               COUNT(p.id) as active_projects_count,
               COUNT(p.id) FILTER (WHERE p.status = 'COMPLETED' OR p.status = 'VERIFIED') as completed_projects_count
        FROM users u
        JOIN university_profiles up ON up.user_id = u.id
        LEFT JOIN projects p ON p.university_id = u.id
        WHERE u.role = 'university'
        GROUP BY u.id, u.name, u.email, up.institution_name, up.campus, up.department, up.expertise_areas
    `);

    // 2. Fetch eligible Industry Partners with profiles and CSR capacity
    const indRes = await pool.query(`
        SELECT u.id, u.name, u.email, ip.company_name, ip.industry_sector, ip.csr_budget,
               COUNT(iso.id) as active_pledges_count
        FROM users u
        JOIN industry_profiles ip ON ip.user_id = u.id
        LEFT JOIN industry_support_offers iso ON iso.industry_id = u.id
        WHERE u.role = 'industry'
        GROUP BY u.id, u.name, u.email, ip.company_name, ip.industry_sector, ip.csr_budget
    `);

    // 3. Score Universities
    const universityRecommendations = unisRes.rows.map(uni => {
        let score = 55;
        const reasons = [];
        const expertiseList = Array.isArray(uni.expertise_areas) ? uni.expertise_areas : [];
        const uniText = `${uni.institution_name || ''} ${uni.department || ''} ${expertiseList.join(' ')}`.toLowerCase();

        // Expertise overlap
        let matchedKeywords = 0;
        for (const req of required) {
            const reqWords = req.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const matches = reqWords.some(w => uniText.includes(w)) || uniText.includes(req.toLowerCase());
            if (matches) {
                matchedKeywords++;
                reasons.push(`Direct expertise in '${req}'`);
            }
        }

        if (required.length > 0) {
            score += Math.round((matchedKeywords / required.length) * 25);
        } else {
            score += 15;
        }

        // Category match
        if (normalizedCategory.includes('road') || normalizedCategory.includes('infrastructure')) {
            if (uniText.includes('civil') || uniText.includes('pavement') || uniText.includes('materials')) {
                score += 10;
                reasons.push('Civil & Structural Engineering division alignment');
            }
        } else if (normalizedCategory.includes('water') || normalizedCategory.includes('drainage') || normalizedCategory.includes('flood')) {
            if (uniText.includes('environmental') || uniText.includes('drainage') || uniText.includes('stormwater') || uniText.includes('hydro')) {
                score += 10;
                reasons.push('Hydrology & Environmental Engineering department alignment');
            }
        } else if (normalizedCategory.includes('electric') || normalizedCategory.includes('lighting')) {
            if (uniText.includes('power') || uniText.includes('solar') || uniText.includes('grid')) {
                score += 10;
                reasons.push('Renewable Energy & Power Systems division fit');
            }
        }

        // Capacity and performance check
        const activeCount = Number(uni.active_projects_count);
        const completedCount = Number(uni.completed_projects_count);

        if (activeCount < 3) {
            score += 5;
            reasons.push('High lab and faculty team availability');
        } else {
            score -= 5;
        }

        if (completedCount > 0) {
            score += 5;
            reasons.push(`Demonstrated record: ${completedCount} verified civic solution(s) delivered`);
        }

        // Location proximity bonus
        if (uni.campus && locLower && locLower.includes(uni.campus.toLowerCase())) {
            score += 5;
            reasons.push(`Local campus proximity in ${uni.campus}`);
        }

        const matchScore = Math.min(Math.max(score, 60), 96);
        if (reasons.length === 0) {
            reasons.push('Institutional academic capacity and student research capability');
        }

        return {
            id: uni.id,
            partnerType: 'UNIVERSITY',
            name: uni.institution_name || uni.name,
            department: uni.department || 'Applied Science & Engineering Lab',
            campus: uni.campus || 'Main Campus',
            contactEmail: uni.email,
            matchScore,
            reasons: reasons.slice(0, 3),
            activeProjects: activeCount
        };
    }).sort((a, b) => b.matchScore - a.matchScore);

    // 4. Score Industry Partners
    const industryRecommendations = indRes.rows.map(ind => {
        let score = 50;
        const reasons = [];
        const indText = `${ind.company_name || ''} ${ind.industry_sector || ''}`.toLowerCase();

        if (normalizedCategory.includes('road') || normalizedCategory.includes('infrastructure')) {
            if (indText.includes('infrastructure') || indText.includes('construction') || indText.includes('engineering')) {
                score += 25;
                reasons.push('Corporate sector focus in Municipal Infrastructure & Engineering');
            }
        } else if (normalizedCategory.includes('water') || normalizedCategory.includes('drainage')) {
            if (indText.includes('sustainability') || indText.includes('water') || indText.includes('environment')) {
                score += 25;
                reasons.push('Active CSR mandate in Environmental Sanitation & Water Sustainability');
            }
        } else if (normalizedCategory.includes('smart') || normalizedCategory.includes('lighting')) {
            if (indText.includes('energy') || indText.includes('tech') || indText.includes('iot')) {
                score += 25;
                reasons.push('Technical CSR expertise in Urban IoT & Clean Energy');
            }
        } else {
            score += 15;
            reasons.push('General Section 135 Urban Development CSR Allocation');
        }

        if (ind.csr_budget) {
            score += 10;
            reasons.push(`Committed CSR Budget Capacity: ${ind.csr_budget}`);
        }

        const matchScore = Math.min(Math.max(score, 60), 94);
        return {
            id: ind.id,
            partnerType: 'INDUSTRY',
            name: ind.company_name || ind.name,
            sector: ind.industry_sector || 'Infrastructure & Sustainability',
            csrBudget: ind.csr_budget,
            contactEmail: ind.email,
            matchScore,
            reasons: reasons.slice(0, 3)
        };
    }).sort((a, b) => b.matchScore - a.matchScore);

    return {
        universities: universityRecommendations,
        industry: industryRecommendations,
        topRecommendation: universityRecommendations[0] || null
    };
}

module.exports = {
    getPartnerRecommendations
};
