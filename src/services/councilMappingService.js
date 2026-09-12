/**
 * Council Mapping Service
 * Resolves responsible Government Councils and Departments from category mapping stored in PostgreSQL.
 * Provides explainable AI recommendations (confidence score and reasons) for government review.
 */
const pool = require('../config/db');

async function getCategoriesWithCouncils() {
    const query = `
        SELECT c.*,
               gc.name as default_council_name,
               gc.code as default_council_code,
               gd.name as default_department_name
        FROM problem_categories c
        LEFT JOIN government_councils gc ON gc.id = c.default_council_id
        LEFT JOIN government_departments gd ON gd.id = c.default_department_id
        WHERE c.is_active = true
        ORDER BY c.name ASC
    `;
    const res = await pool.query(query);
    return res.rows;
}

async function getAllCouncilsWithDepartments() {
    const councilsRes = await pool.query(`
        SELECT * FROM government_councils WHERE is_active = true ORDER BY name ASC
    `);
    const deptsRes = await pool.query(`
        SELECT * FROM government_departments WHERE is_active = true ORDER BY name ASC
    `);

    return councilsRes.rows.map(c => ({
        ...c,
        departments: deptsRes.rows.filter(d => d.council_id === c.id)
    }));
}

async function recommendCouncilForProblem({ category, title, description }) {
    // 1. Direct Category Match from PostgreSQL mapping
    if (category) {
        const catRes = await pool.query(`
            SELECT pc.*, gc.id as council_id, gc.name as council_name, gc.code as council_code,
                   gd.id as department_id, gd.name as department_name
            FROM problem_categories pc
            JOIN government_councils gc ON gc.id = pc.default_council_id
            LEFT JOIN government_departments gd ON gd.id = pc.default_department_id
            WHERE pc.is_active = true AND (LOWER(pc.name) = LOWER($1) OR pc.code = $1)
            LIMIT 1
        `, [category]);

        if (catRes.rows.length > 0) {
            const match = catRes.rows[0];
            return {
                councilId: match.council_id,
                councilName: match.council_name,
                councilCode: match.council_code,
                departmentId: match.department_id,
                departmentName: match.department_name,
                confidence: 94,
                reasons: [
                    `Standard civic category alignment with '${match.name}'`,
                    `Designated default jurisdictional authority: ${match.council_name}`
                ]
            };
        }
    }

    // 2. Keyword & Text Similarity Fallback across all active councils
    const textToMatch = `${title || ''} ${description || ''} ${category || ''}`.toLowerCase();

    const allCouncils = await getAllCouncilsWithDepartments();
    let bestCouncil = null;
    let highestScore = 0;
    let matchReason = 'General municipal triage queue';

    for (const c of allCouncils) {
        let score = 50;
        const nameTokens = c.name.toLowerCase().split(/\s+/);
        for (const token of nameTokens) {
            if (token.length > 3 && textToMatch.includes(token)) {
                score += 15;
            }
        }

        for (const dept of c.departments) {
            const deptTokens = dept.name.toLowerCase().split(/\s+/);
            for (const token of deptTokens) {
                if (token.length > 3 && textToMatch.includes(token)) {
                    score += 10;
                }
            }
        }

        if (score > highestScore) {
            highestScore = score;
            bestCouncil = c;
            matchReason = `Contextual match with ${c.name} operational scope`;
        }
    }

    if (bestCouncil && highestScore >= 65) {
        return {
            councilId: bestCouncil.id,
            councilName: bestCouncil.name,
            councilCode: bestCouncil.code,
            departmentId: bestCouncil.departments[0]?.id || null,
            departmentName: bestCouncil.departments[0]?.name || null,
            confidence: Math.min(highestScore, 92),
            reasons: [
                matchReason,
                `Identified relevant departmental units in ${bestCouncil.name}`
            ]
        };
    }

    // Default fallback
    const fallback = allCouncils[0] || { id: null, name: 'Municipal Administration Council', code: 'MAC' };
    return {
        councilId: fallback.id,
        councilName: fallback.name,
        councilCode: fallback.code,
        departmentId: fallback.departments?.[0]?.id || null,
        departmentName: fallback.departments?.[0]?.name || null,
        confidence: 65,
        reasons: ['Default administrative municipal council']
    };
}

module.exports = {
    getCategoriesWithCouncils,
    getAllCouncilsWithDepartments,
    recommendCouncilForProblem
};
