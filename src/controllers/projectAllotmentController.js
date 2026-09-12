/**
 * Project Allotment Controller
 * Handles the complete lifecycle of civic implementation projects:
 * Challenge Approval → Project Creation → AI Partner Recommendations → Allotment → Implementation Monitoring → Verification → Completion.
 */
const pool = require('../config/db');
const { getPartnerRecommendations } = require('../services/partnerMatchingService');

// Valid state machine transitions
const ALLOWED_TRANSITIONS = {
    DRAFT: ['UNDER_REVIEW', 'CANCELLED'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['ALLOTTED', 'CANCELLED'],
    ALLOTTED: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
    IN_PROGRESS: ['SUBMITTED_FOR_VERIFICATION', 'ON_HOLD', 'CANCELLED'],
    ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
    SUBMITTED_FOR_VERIFICATION: ['VERIFIED', 'IN_PROGRESS', 'REJECTED'],
    VERIFIED: ['COMPLETED', 'IN_PROGRESS'],
    COMPLETED: [],
    REJECTED: ['UNDER_REVIEW', 'CANCELLED'],
    CANCELLED: []
};

// 1. Get all implementation projects (Government filterable by status, council, ward)
exports.getProjects = async (req, res, next) => {
    try {
        const { status, councilId, category, search } = req.query;

        let query = `
            SELECT p.*,
                   gc.name as council_name, gc.code as council_code,
                   gd.name as department_name,
                   u.name as university_name,
                   up.institution_name,
                   ip.company_name as industry_name,
                   prob.title as problem_title, prob.code as problem_code, prob.ward as problem_ward,
                   prob.created_by as citizen_creator_id,
                   ch.title as challenge_title, ch.code as challenge_code,
                   COALESCE(
                       (SELECT json_agg(json_build_object('id', m.id, 'title', m.title, 'target_date', m.target_date, 'completed', m.completed, 'remarks', m.remarks) ORDER BY m.id ASC)
                        FROM project_milestones m WHERE m.project_id = p.id), '[]'::json
                   ) as milestones,
                   COALESCE(
                       (SELECT json_agg(json_build_object('id', s.id, 'company_name', s.company_name, 'support_type', s.support_type, 'amount_or_details', s.amount_or_details, 'status', s.status) ORDER BY s.id ASC)
                        FROM industry_support_offers s WHERE s.project_id = p.id), '[]'::json
                   ) as industry_offers
            FROM projects p
            LEFT JOIN government_councils gc ON gc.id = p.responsible_council_id
            LEFT JOIN government_departments gd ON gd.id = p.responsible_department_id
            LEFT JOIN users u ON u.id = p.university_id
            LEFT JOIN university_profiles up ON up.user_id = p.university_id
            LEFT JOIN industry_profiles ip ON ip.user_id = p.industry_partner_id
            LEFT JOIN problems prob ON prob.id = p.problem_id
            LEFT JOIN challenges ch ON ch.id = p.challenge_id
            WHERE 1=1
        `;
        const params = [];

        if (req.user && req.user.role === 'university') {
            params.push(req.user.id);
            query += ` AND p.university_id = $${params.length}`;
        } else if (req.user && req.user.role === 'industry' && req.query.myProjects === 'true') {
            params.push(req.user.id);
            query += ` AND p.industry_partner_id = $${params.length}`;
        }

        if (status) {
            params.push(status);
            query += ` AND p.status = $${params.length}`;
        }
        if (councilId) {
            params.push(councilId);
            query += ` AND p.responsible_council_id = $${params.length}`;
        }
        if (category) {
            params.push(category);
            query += ` AND p.category = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (p.title ILIKE $${params.length} OR p.code ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
        }

        query += ` ORDER BY p.created_at DESC`;

        const result = await pool.query(query, params);
        return res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
};

// 2. Get single project details with milestones, updates, verifications, and audit history
exports.getProjectById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const pRes = await pool.query(`
            SELECT p.*,
                   gc.name as council_name, gc.code as council_code, gc.contact_email as council_email,
                   gd.name as department_name,
                   u.name as university_contact_name, u.email as university_email,
                   up.institution_name, up.campus as university_campus, up.department as university_dept,
                   ip.company_name as industry_company_name, ind_u.email as industry_email,
                   prob.title as problem_title, prob.code as problem_code, prob.ward as problem_ward,
                   prob.location as problem_location, prob.severity as problem_severity, prob.urgency as problem_urgency,
                   prob.created_by as citizen_creator_id,
                   cit.name as citizen_name, cit.email as citizen_email,
                   ch.title as challenge_title, ch.code as challenge_code, ch.grant_amount as challenge_grant
            FROM projects p
            LEFT JOIN government_councils gc ON gc.id = p.responsible_council_id
            LEFT JOIN government_departments gd ON gd.id = p.responsible_department_id
            LEFT JOIN users u ON u.id = p.university_id
            LEFT JOIN university_profiles up ON up.user_id = p.university_id
            LEFT JOIN industry_profiles ip ON ip.user_id = p.industry_partner_id
            LEFT JOIN users ind_u ON ind_u.id = p.industry_partner_id
            LEFT JOIN problems prob ON prob.id = p.problem_id
            LEFT JOIN users cit ON cit.id = prob.created_by
            LEFT JOIN challenges ch ON ch.id = p.challenge_id
            WHERE p.id = $1
        `, [id]);

        if (pRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        const project = pRes.rows[0];

        // Milestones
        const mRes = await pool.query(`
            SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY id ASC
        `, [id]);

        // Progress updates
        const upRes = await pool.query(`
            SELECT pu.*, u.name as submitter_name
            FROM project_progress_updates pu
            JOIN users u ON u.id = pu.submitted_by
            WHERE pu.project_id = $1
            ORDER BY pu.created_at DESC
        `, [id]);

        // Verifications
        const vRes = await pool.query(`
            SELECT pv.*, u.name as verifier_name
            FROM project_verifications pv
            JOIN users u ON u.id = pv.verified_by
            WHERE pv.project_id = $1
            ORDER BY pv.created_at DESC
        `, [id]);

        // Status history
        const hRes = await pool.query(`
            SELECT sh.*, u.name as changer_name
            FROM project_status_history sh
            LEFT JOIN users u ON u.id = sh.changed_by
            WHERE sh.project_id = $1
            ORDER BY sh.created_at DESC
        `, [id]);

        // Industry support offers
        const isoRes = await pool.query(`
            SELECT iso.*, ip.company_name, u.email as industry_email
            FROM industry_support_offers iso
            JOIN industry_profiles ip ON ip.user_id = iso.industry_id
            JOIN users u ON u.id = iso.industry_id
            WHERE iso.project_id = $1
            ORDER BY iso.created_at DESC
        `, [id]);

        return res.json({
            success: true,
            data: {
                ...project,
                milestones: mRes.rows,
                progressUpdates: upRes.rows,
                verifications: vRes.rows,
                statusHistory: hRes.rows,
                industryOffers: isoRes.rows
            }
        });
    } catch (err) {
        next(err);
    }
};

// 3. Create Project from Challenge or Problem (Government action)
exports.createProject = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            title,
            description,
            challengeId,
            problemId,
            councilId,
            departmentId,
            category,
            location,
            requiredExpertise,
            expectedOutcome,
            priorityLevel,
            targetCompletionDate,
            fundingNeeded
        } = req.body;

        if (!title) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Project title is required.' });
        }

        // Generate tracking code PRJ-2026-XXX
        const maxRes = await client.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM projects');
        const codeNum = Number(maxRes.rows[0].next_id) + 10;
        const code = `PRJ-2026-${String(codeNum).padStart(3, '0')}`;

        // Default university_id to government admin until allotted, or use an unassigned marker
        const uniId = req.body.universityId || req.user.id;

        const insRes = await client.query(`
            INSERT INTO projects (
                code, challenge_id, problem_id, university_id, responsible_council_id, responsible_department_id,
                title, description, category, location, required_expertise, expected_outcome,
                priority_level, target_completion_date, funding_needed, stage, status, progress_percentage,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PLANNING', 'APPROVED', 0, NOW(), NOW()
            ) RETURNING *
        `, [
            code,
            challengeId || null,
            problemId || null,
            uniId,
            councilId || null,
            departmentId || null,
            title,
            description || '',
            category || 'Municipal Infrastructure',
            location || 'District Wide',
            Array.isArray(requiredExpertise) ? requiredExpertise : (requiredExpertise ? [requiredExpertise] : []),
            expectedOutcome || '',
            priorityLevel || 'HIGH',
            targetCompletionDate || null,
            fundingNeeded || null
        ]);

        const project = insRes.rows[0];

        // Audit log
        await client.query(`
            INSERT INTO audit_logs (actor_id, role, action, resource_type, resource_id, metadata)
            VALUES ($1, 'government', 'PROJECT_CREATED', 'project', $2, $3)
        `, [req.user.id, project.id, JSON.stringify({ code, title, status: 'APPROVED' })]);

        await client.query(`
            INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason)
            VALUES ($1, 'DRAFT', 'APPROVED', $2, 'Project approved for academic/industry allotment')
        `, [project.id, req.user.id]);

        await client.query('COMMIT');
        return res.status(201).json({ success: true, data: project, message: 'Implementation Project created and approved for allotment.' });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

// 4. Get multi-factor recommendations for a project
exports.getProjectPartnerRecommendations = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pRes = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
        if (pRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }
        const project = pRes.rows[0];

        const recs = await getPartnerRecommendations({
            category: project.category,
            requiredExpertise: project.required_expertise,
            location: project.location,
            estimatedResources: project.funding_needed
        });

        return res.json({
            success: true,
            data: {
                projectId: project.id,
                projectTitle: project.title,
                requiredExpertise: project.required_expertise,
                recommendations: recs
            }
        });
    } catch (err) {
        next(err);
    }
};

// 5. Allot project to an Institution/University/Team (Official Government Allocation)
exports.allotProject = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { universityId, teamName, industryPartnerId, targetCompletionDate, notes } = req.body;

        if (!universityId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Assigned Institution/University ID is required.' });
        }

        const pRes = await client.query('SELECT * FROM projects WHERE id = $1', [id]);
        if (pRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }
        const project = pRes.rows[0];

        // Verify valid state transition
        const allowedNext = ALLOWED_TRANSITIONS[project.status] || [];
        if (!allowedNext.includes('ALLOTTED') && project.status !== 'APPROVED') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Cannot allot project in '${project.status}' status. Must be in 'APPROVED' status.`
            });
        }

        // Verify target university exists
        const uniRes = await client.query("SELECT u.id, u.name, up.institution_name FROM users u LEFT JOIN university_profiles up ON up.user_id = u.id WHERE u.id = $1 AND u.role = 'university'", [universityId]);
        if (uniRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Selected institution is not a valid registered university user.' });
        }
        const uni = uniRes.rows[0];
        const instName = uni.institution_name || uni.name;

        const updated = await client.query(`
            UPDATE projects
            SET university_id = $1,
                team_name = COALESCE($2, team_name),
                industry_partner_id = $3,
                target_completion_date = COALESCE($4, target_completion_date),
                status = 'ALLOTTED',
                stage = 'RESEARCH',
                allotted_at = NOW(),
                allotted_by = $5,
                updated_at = NOW()
            WHERE id = $6
            RETURNING *
        `, [universityId, teamName || `${instName} Civic Taskforce`, industryPartnerId || null, targetCompletionDate, req.user.id, id]);

        // Audit log
        await client.query(`
            INSERT INTO audit_logs (actor_id, role, action, resource_type, resource_id, metadata)
            VALUES ($1, 'government', 'PROJECT_ALLOTTED', 'project', $2, $3)
        `, [req.user.id, id, JSON.stringify({ university: instName, teamName, notes })]);

        // Status history
        await client.query(`
            INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason)
            VALUES ($1, $2, 'ALLOTTED', $3, $4)
        `, [id, project.status, req.user.id, `Officially allotted by Government Council to ${instName}. ${notes || ''}`]);

        // Notify University
        await client.query(`
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES ($1, 'Civic Project Officially Allotted', $2, 'PROJECT', '/university')
        `, [universityId, `Government has allotted Project ${project.code}: "${project.title}" to your institution.`]);

        // If industry partner attached, notify them
        if (industryPartnerId) {
            await client.query(`
                INSERT INTO notifications (user_id, title, message, type, link)
                VALUES ($1, 'Co-Financing Project Allotted', $2, 'PROJECT', '/industry')
            `, [industryPartnerId, `Project ${project.code} has been allotted to ${instName} with your CSR partnership role.`]);
        }

        // Notify Citizen if linked to a problem
        if (project.problem_id) {
            const prob = await client.query('SELECT created_by, code FROM problems WHERE id = $1', [project.problem_id]);
            if (prob.rows.length > 0) {
                await client.query(`
                    INSERT INTO notifications (user_id, title, message, type, link)
                    VALUES ($1, 'Grievance Project Allotted to Implementation Team', $2, 'PROBLEM', '/citizen')
                `, [prob.rows[0].created_by, `Your report ${prob.rows[0].code} has been allotted to ${instName} for engineering implementation.`]);
            }
        }

        await client.query('COMMIT');
        return res.json({
            success: true,
            data: updated.rows[0],
            message: `Project successfully allotted to ${instName}.`
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

// 6. Verify Project (Official Government Council Certification)
exports.verifyProject = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const verificationStatus = req.body.verificationStatus || req.body.decision || 'VERIFIED';
        const officerComments = req.body.officerComments || req.body.siteInspectionNotes || '';
        const siteInspectionDate = req.body.siteInspectionDate || null;
        const markCompleted = req.body.markCompleted !== undefined ? req.body.markCompleted : (req.body.resolveProblem !== undefined ? req.body.resolveProblem : true);

        if (!verificationStatus || !officerComments) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Verification status and officer inspection comments are required.' });
        }

        const pRes = await client.query('SELECT * FROM projects WHERE id = $1', [id]);
        if (pRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }
        const project = pRes.rows[0];

        // Record verification
        await client.query(`
            INSERT INTO project_verifications (project_id, verified_by, verification_status, officer_comments, site_inspection_date, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
        `, [id, req.user.id, verificationStatus, officerComments, siteInspectionDate || null]);

        let newStatus = verificationStatus === 'VERIFIED' ? (markCompleted ? 'COMPLETED' : 'VERIFIED') : 'IN_PROGRESS';
        let newProgress = verificationStatus === 'VERIFIED' ? 100 : project.progress_percentage;
        let newStage = newStatus === 'COMPLETED' ? 'DEPLOYMENT' : project.stage;

        const updated = await client.query(`
            UPDATE projects
            SET status = $1,
                progress_percentage = $2,
                verified_at = NOW(),
                verified_by = $3,
                verification_notes = $4,
                stage = $5,
                updated_at = NOW()
            WHERE id = $6
            RETURNING *
        `, [newStatus, newProgress, req.user.id, officerComments, newStage, id]);

        // Audit log
        await client.query(`
            INSERT INTO audit_logs (actor_id, role, action, resource_type, resource_id, metadata)
            VALUES ($1, 'government', 'PROJECT_VERIFIED', 'project', $2, $3)
        `, [req.user.id, id, JSON.stringify({ verificationStatus, officerComments, newStatus })]);

        await client.query(`
            INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason)
            VALUES ($1, $2, $3, $4, $5)
        `, [id, project.status, newStatus, req.user.id, `Government verification: ${verificationStatus}. ${officerComments}`]);

        // If marked completed, also resolve linked citizen problem!
        if (newStatus === 'COMPLETED' && project.problem_id) {
            const remarks = `Resolved via verified implementation project ${project.code}: ${officerComments}`;
            await client.query(`
                UPDATE problems
                SET status = 'RESOLVED',
                    resolved_at = NOW(),
                    officer_remarks = $1
                WHERE id = $2
            `, [remarks, project.problem_id]);

            const probRes = await client.query('SELECT created_by, code FROM problems WHERE id = $1', [project.problem_id]);
            if (probRes.rows.length > 0) {
                await client.query(`
                    INSERT INTO notifications (user_id, title, message, type, link)
                    VALUES ($1, 'Grievance Verified & Completed!', $2, 'PROBLEM', '/citizen')
                `, [probRes.rows[0].created_by, `Your problem ${probRes.rows[0].code} has been successfully verified and resolved by the Government Council!`]);
            }
        }

        // Notify University Team
        await client.query(`
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES ($1, 'Project Verification Completed', $2, 'PROJECT', '/university')
        `, [project.university_id, `Council officer has ${verificationStatus} Project ${project.code}. Comments: ${officerComments}`]);

        await client.query('COMMIT');
        return res.json({
            success: true,
            data: updated.rows[0],
            message: `Project inspection recorded. New status: ${newStatus}.`
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

// 7. University Submit Progress Update
exports.submitProjectProgress = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { updateTitle, description, progressPercentage, evidenceNotes } = req.body;
        const isVerificationRequested = Boolean(req.body.submitForVerification || req.body.requestVerification);

        if (!updateTitle || progressPercentage === undefined) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Update title and progress percentage are required.' });
        }

        const pRes = await client.query('SELECT * FROM projects WHERE id = $1', [id]);
        if (pRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }
        const project = pRes.rows[0];

        // Authorization check: Must be assigned university or government officer
        if (req.user.role === 'university' && project.university_id !== req.user.id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'You are not authorized to submit progress for this project.' });
        }

        // Record progress update
        await client.query(`
            INSERT INTO project_progress_updates (project_id, submitted_by, role, update_title, description, progress_percentage, evidence_notes, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [id, req.user.id, req.user.role, updateTitle, description || '', Math.min(100, Math.max(0, progressPercentage)), evidenceNotes || '']);

        let nextStatus = project.status;
        if (isVerificationRequested) {
            nextStatus = 'SUBMITTED_FOR_VERIFICATION';
        } else if (project.status === 'ALLOTTED') {
            nextStatus = 'IN_PROGRESS';
        }

        const updated = await client.query(`
            UPDATE projects
            SET progress_percentage = $1,
                status = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `, [Math.min(100, Math.max(0, progressPercentage)), nextStatus, id]);

        if (nextStatus !== project.status) {
            await client.query(`
                INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason)
                VALUES ($1, $2, $3, $4, $5)
            `, [id, project.status, nextStatus, req.user.id, `Progress updated to ${progressPercentage}%. ${updateTitle}`]);
        }

        // Notify government councils
        const govUsers = await client.query("SELECT id FROM users WHERE role = 'government'");
        for (const g of govUsers.rows) {
            await client.query(`
                INSERT INTO notifications (user_id, title, message, type, link)
                VALUES ($1, 'Project Progress Submitted', $2, 'PROJECT', '/government')
            `, [g.id, `Team submitted ${progressPercentage}% progress update for Project ${project.code}: ${updateTitle}`]);
        }

        // Notify Citizen if progress changed
        if (project.problem_id) {
            const probRes = await client.query('SELECT created_by, code FROM problems WHERE id = $1', [project.problem_id]);
            if (probRes.rows.length > 0) {
                await client.query(`
                    INSERT INTO notifications (user_id, title, message, type, link)
                    VALUES ($1, 'Implementation Update on Your Grievance', $2, 'PROBLEM', '/citizen')
                `, [probRes.rows[0].created_by, `Civic implementation team recorded ${progressPercentage}% completion on ${probRes.rows[0].code}.`]);
            }
        }

        await client.query('COMMIT');
        return res.json({
            success: true,
            data: updated.rows[0],
            message: 'Progress update logged successfully.'
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

// 8. Update Project Team Management (University Action)
exports.updateProjectTeam = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { leadMentor, teamName, studentMembers } = req.body;

        const pRes = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
        if (pRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }
        const project = pRes.rows[0];

        if (req.user.role === 'university' && project.university_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized to configure team for this project.' });
        }

        const updated = await pool.query(`
            UPDATE projects
            SET lead_mentor = COALESCE($1, lead_mentor),
                team_name = COALESCE($2, team_name),
                student_members = COALESCE($3, student_members),
                updated_at = NOW()
            WHERE id = $4
            RETURNING *
        `, [leadMentor, teamName, JSON.stringify(studentMembers || []), id]);

        return res.json({
            success: true,
            data: updated.rows[0],
            message: 'Implementation team roster updated.'
        });
    } catch (err) {
        next(err);
    }
};

// 9. Citizen Public Project Progress (Safe public view without sensitive internal officer notes)
exports.getCitizenProblemProgress = async (req, res, next) => {
    try {
        const { id } = req.params; // problem ID

        // Check ownership
        const probRes = await pool.query(`
            SELECT p.id, p.code, p.title, p.category, p.status, p.created_at, p.resolved_at,
                   p.created_by, p.ward, p.location,
                   gc.name as council_name,
                   gd.name as department_name
            FROM problems p
            LEFT JOIN government_councils gc ON gc.id = p.assigned_council_id
            LEFT JOIN government_departments gd ON gd.id = p.assigned_department_id
            WHERE p.id = $1
        `, [id]);

        if (probRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Grievance not found.' });
        }
        const problem = probRes.rows[0];

        if (req.user.role === 'citizen' && problem.created_by !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized.' });
        }

        // Linked challenge if any
        const chRes = await pool.query('SELECT id, code, title, status FROM challenges WHERE problem_id = $1', [id]);

        // Linked project if any
        const pRes = await pool.query(`
            SELECT pr.id, pr.code, pr.title, pr.status, pr.progress_percentage, pr.start_date, pr.target_completion_date,
                   up.institution_name, pr.team_name, ip.company_name as industry_sponsor
            FROM projects pr
            LEFT JOIN university_profiles up ON up.user_id = pr.university_id
            LEFT JOIN industry_profiles ip ON ip.user_id = pr.industry_partner_id
            WHERE pr.problem_id = $1
            LIMIT 1
        `, [id]);

        const project = pRes.rows[0] || null;

        // Public milestone updates
        let publicUpdates = [];
        if (project) {
            const up = await pool.query(`
                SELECT update_title, description, progress_percentage, created_at
                FROM project_progress_updates
                WHERE project_id = $1
                ORDER BY created_at DESC
            `, [project.id]);
            publicUpdates = up.rows;
        }

        return res.json({
            success: true,
            data: {
                problem,
                council: problem.council_name ? { name: problem.council_name, department: problem.department_name } : null,
                challenge: chRes.rows[0] || null,
                project,
                publicUpdates
            }
        });
    } catch (err) {
        next(err);
    }
};
