/**
 * Council Controller
 * Handles Government Councils, Departments, Problem Categories, and Category-to-Council Mappings.
 * Only authenticated Government administrators have write access.
 */
const pool = require('../config/db');
const { getCategoriesWithCouncils, getAllCouncilsWithDepartments, recommendCouncilForProblem } = require('../services/councilMappingService');

// Get all configurable categories with default councils
exports.getCategories = async (req, res, next) => {
    try {
        const categories = await getCategoriesWithCouncils();
        return res.json({ success: true, data: categories });
    } catch (err) {
        next(err);
    }
};

// Create a new civic category
exports.createCategory = async (req, res, next) => {
    try {
        const { name, code, description, defaultCouncilId, defaultDepartmentId } = req.body;
        if (!name || !code) {
            return res.status(400).json({ success: false, message: 'Category name and unique code are required.' });
        }

        const ins = await pool.query(`
            INSERT INTO problem_categories (name, code, description, default_council_id, default_department_id, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING *
        `, [name.trim(), code.trim().toUpperCase(), description, defaultCouncilId || null, defaultDepartmentId || null]);

        if (defaultCouncilId) {
            await pool.query(`
                INSERT INTO category_council_mapping (category_id, council_id, priority_level)
                VALUES ($1, $2, 'HIGH')
                ON CONFLICT (category_id, council_id) DO NOTHING
            `, [ins.rows[0].id, defaultCouncilId]);
        }

        return res.status(201).json({ success: true, data: ins.rows[0], message: 'Category created successfully.' });
    } catch (err) {
        next(err);
    }
};

// Update an existing category
exports.updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, defaultCouncilId, defaultDepartmentId, isActive } = req.body;

        const updated = await pool.query(`
            UPDATE problem_categories
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                default_council_id = $3,
                default_department_id = $4,
                is_active = COALESCE($5, is_active),
                updated_at = NOW()
            WHERE id = $6
            RETURNING *
        `, [name, description, defaultCouncilId, defaultDepartmentId, isActive, id]);

        if (updated.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found.' });
        }

        return res.json({ success: true, data: updated.rows[0], message: 'Category updated successfully.' });
    } catch (err) {
        next(err);
    }
};

// Get all councils with their active departments
exports.getCouncils = async (req, res, next) => {
    try {
        const councils = await getAllCouncilsWithDepartments();
        return res.json({ success: true, data: councils });
    } catch (err) {
        next(err);
    }
};

// Create a new Government Council
exports.createCouncil = async (req, res, next) => {
    try {
        const { name, code, description, jurisdiction, contactEmail } = req.body;
        if (!name || !code) {
            return res.status(400).json({ success: false, message: 'Council name and code are required.' });
        }

        const ins = await pool.query(`
            INSERT INTO government_councils (name, code, description, jurisdiction, contact_email, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING *
        `, [name.trim(), code.trim().toUpperCase(), description, jurisdiction || 'Municipal Capital Region', contactEmail]);

        return res.status(201).json({ success: true, data: ins.rows[0], message: 'Council created successfully.' });
    } catch (err) {
        next(err);
    }
};

// Get all Category-to-Council Mappings
exports.getCategoryMappings = async (req, res, next) => {
    try {
        const query = `
            SELECT m.*, pc.name as category_name, pc.code as category_code,
                   gc.name as council_name, gc.code as council_code,
                   gd.name as department_name
            FROM category_council_mapping m
            JOIN problem_categories pc ON pc.id = m.category_id
            JOIN government_councils gc ON gc.id = m.council_id
            LEFT JOIN government_departments gd ON gd.id = m.department_id
            ORDER BY pc.name ASC
        `;
        const resList = await pool.query(query);
        return res.json({ success: true, data: resList.rows });
    } catch (err) {
        next(err);
    }
};

// Update a mapping
exports.updateCategoryMapping = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { councilId, departmentId, priorityLevel, notes } = req.body;

        const updated = await pool.query(`
            UPDATE category_council_mapping
            SET council_id = COALESCE($1, council_id),
                department_id = $2,
                priority_level = COALESCE($3, priority_level),
                notes = COALESCE($4, notes),
                updated_at = NOW()
            WHERE id = $5
            RETURNING *
        `, [councilId, departmentId, priorityLevel, notes, id]);

        if (updated.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Mapping not found.' });
        }

        return res.json({ success: true, data: updated.rows[0], message: 'Mapping updated successfully.' });
    } catch (err) {
        next(err);
    }
};

// Get AI Council recommendation for a problem
exports.getProblemCouncilRecommendation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const probRes = await pool.query('SELECT * FROM problems WHERE id = $1', [id]);
        if (probRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Problem not found.' });
        }

        const problem = probRes.rows[0];
        const recommendation = await recommendCouncilForProblem({
            category: problem.category,
            title: problem.title,
            description: problem.description
        });

        return res.json({
            success: true,
            data: {
                problemId: problem.id,
                currentCategory: problem.category,
                recommendation
            }
        });
    } catch (err) {
        next(err);
    }
};

// Assign council and department to a problem (Official Government Action)
exports.assignCouncilToProblem = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { councilId, departmentId, priorityLevel, notes } = req.body;

        if (!councilId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Council ID is required for assignment.' });
        }

        const probRes = await client.query('SELECT * FROM problems WHERE id = $1', [id]);
        if (probRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Problem not found.' });
        }
        const problem = probRes.rows[0];

        const councilRes = await client.query('SELECT name, code FROM government_councils WHERE id = $1', [councilId]);
        if (councilRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Invalid council ID.' });
        }
        const council = councilRes.rows[0];

        let deptName = null;
        if (departmentId) {
            const dRes = await client.query('SELECT name FROM government_departments WHERE id = $1', [departmentId]);
            deptName = dRes.rows[0]?.name || null;
        }

        const updated = await client.query(`
            UPDATE problems
            SET assigned_council_id = $1,
                assigned_department_id = $2,
                assigned_department = COALESCE($3, assigned_department),
                council_assigned_at = NOW(),
                council_assignment_notes = $4,
                priority_level = COALESCE($5, priority_level),
                status = CASE WHEN status = 'SUBMITTED' THEN 'UNDER REVIEW' ELSE status END,
                updated_at = NOW()
            WHERE id = $6
            RETURNING *
        `, [councilId, departmentId || null, deptName, notes || `Assigned to ${council.name}`, priorityLevel, id]);

        // Audit log
        await client.query(`
            INSERT INTO audit_logs (actor_id, role, action, resource_type, resource_id, metadata)
            VALUES ($1, 'government', 'COUNCIL_ASSIGNED', 'problem', $2, $3)
        `, [req.user.id, id, JSON.stringify({ council: council.name, department: deptName, notes })]);

        // Status history
        await client.query(`
            INSERT INTO problem_status_history (problem_id, previous_status, new_status, changed_by, remarks)
            VALUES ($1, $2, $3, $4, $5)
        `, [id, problem.status, updated.rows[0].status, req.user.id, `Jurisdiction allocated to ${council.name} ${deptName ? '(' + deptName + ')' : ''}`]);

        // Notification to citizen
        await client.query(`
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES ($1, 'Council Allocated to Your Grievance', $2, 'PROBLEM', '/citizen')
        `, [problem.created_by, `Your grievance ${problem.code} has been assigned to ${council.name} for official municipal action.`]);

        await client.query('COMMIT');
        return res.json({
            success: true,
            data: updated.rows[0],
            message: `Problem officially allocated to ${council.name}.`
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

// Council workload summary for Government Dashboard
exports.getCouncilWorkload = async (req, res, next) => {
    try {
        const query = `
            SELECT gc.id, gc.name, gc.code,
                   COUNT(DISTINCT pr.id) as open_problems,
                   COUNT(DISTINCT pr.id) FILTER (WHERE pr.priority_level = 'CRITICAL') as critical_problems,
                   COUNT(DISTINCT p.id) as active_projects,
                   COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'COMPLETED') as completed_projects
            FROM government_councils gc
            LEFT JOIN problems pr ON pr.assigned_council_id = gc.id AND pr.status != 'RESOLVED'
            LEFT JOIN projects p ON p.responsible_council_id = gc.id
            WHERE gc.is_active = true
            GROUP BY gc.id, gc.name, gc.code
            ORDER BY open_problems DESC, active_projects DESC
        `;
        const resList = await pool.query(query);
        return res.json({ success: true, data: resList.rows });
    } catch (err) {
        next(err);
    }
};
