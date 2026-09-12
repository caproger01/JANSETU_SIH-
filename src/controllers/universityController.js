/**
 * University Controller
 * Handles innovation challenges feed with AI compatibility matching, accepting challenges,
 * creating multidisciplinary capstone projects, and managing milestones.
 */
const pool = require('../config/db');
const { calculateMatchScore } = require('../services/ai/challengeMatchingService');

exports.getOverview = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const profileRes = await pool.query('SELECT * FROM university_profiles WHERE user_id = $1', [userId]);
        const profile = profileRes.rows[0] || {};

        // University metrics
        const statsQuery = `
            SELECT
                (SELECT COUNT(*) FROM challenges WHERE status = 'OPEN') as open_challenges,
                (SELECT COUNT(*) FROM projects WHERE university_id = $1) as active_projects,
                (SELECT COUNT(*) FROM project_milestones pm JOIN projects p ON p.id = pm.project_id WHERE p.university_id = $1 AND pm.completed = true) as completed_milestones,
                (SELECT COUNT(*) FROM industry_support_offers iso JOIN projects p ON p.id = iso.project_id WHERE p.university_id = $1 AND iso.status = 'APPROVED') as industry_partnerships
        `;
        const statsRes = await pool.query(statsQuery, [userId]);
        const stats = statsRes.rows[0];

        // Active projects with milestones
        const projects = await pool.query(`
            SELECT p.*,
                   COALESCE(
                       (SELECT json_agg(json_build_object('id', m.id, 'title', m.title, 'target_date', m.target_date, 'completed', m.completed, 'remarks', m.remarks))
                        FROM project_milestones m WHERE m.project_id = p.id), '[]'::json
                   ) as milestones,
                   COALESCE(
                       (SELECT json_agg(json_build_object('id', s.id, 'company_name', s.company_name, 'support_type', s.support_type, 'amount_or_details', s.amount_or_details, 'status', s.status))
                        FROM industry_support_offers s WHERE s.project_id = p.id), '[]'::json
                   ) as industry_offers
            FROM projects p
            WHERE p.university_id = $1
            ORDER BY p.created_at DESC
        `, [userId]);

        return res.json({
            success: true,
            data: {
                stats: {
                    openChallenges: Number(stats.open_challenges),
                    activeProjects: Number(stats.active_projects),
                    completedMilestones: Number(stats.completed_milestones),
                    industryPartnerships: Number(stats.industry_partnerships)
                },
                profile,
                activeProjects: projects.rows
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.getChallenges = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const profileRes = await pool.query('SELECT * FROM university_profiles WHERE user_id = $1', [userId]);
        const profile = profileRes.rows[0];

        const challengesRes = await pool.query(`
            SELECT c.*,
                   (SELECT status FROM challenge_acceptances WHERE challenge_id = c.id AND university_id = $1) as acceptance_status
            FROM challenges c
            ORDER BY c.created_at DESC
        `, [userId]);

        // Augment with AI matching score based on university expertise
        const enriched = challengesRes.rows.map(ch => {
            const matchInfo = calculateMatchScore(ch, profile);
            return {
                ...ch,
                ai_match_percentage: matchInfo.matchScore,
                ai_match_reasons: matchInfo.reasons
            };
        });

        return res.json({
            success: true,
            data: enriched
        });
    } catch (err) {
        next(err);
    }
};

exports.acceptChallenge = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userId = req.user.id;
        const { challengeId, projectTitle, description, leadMentor, teamName, studentMembers, fundingNeeded } = req.body;

        const chRes = await client.query('SELECT * FROM challenges WHERE id = $1', [challengeId]);
        if (chRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Challenge not found.' });
        }
        const challenge = chRes.rows[0];

        // Insert acceptance record
        await client.query(`
            INSERT INTO challenge_acceptances (challenge_id, university_id, status)
            VALUES ($1, $2, 'ACTIVE')
            ON CONFLICT (challenge_id, university_id) DO UPDATE SET status = 'ACTIVE', updated_at = NOW()
        `, [challengeId, userId]);

        // Update challenge status to ACCEPTED
        await client.query("UPDATE challenges SET status = 'ACCEPTED', updated_at = NOW() WHERE id = $1", [challengeId]);

        // Create Project
        const projRes = await client.query(`
            INSERT INTO projects (
                challenge_id, university_id, title, description, lead_mentor,
                team_name, student_members, stage, status, funding_needed, seeking_industry_support,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, 'PROTOTYPE', 'ACTIVE', $8, true, NOW(), NOW()
            ) RETURNING *
        `, [
            challengeId,
            userId,
            projectTitle || `Solution for: ${challenge.title}`,
            description || challenge.description,
            leadMentor || 'Faculty Lead',
            teamName || 'University Innovation Lab Team',
            JSON.stringify(studentMembers || [{ name: 'Research Scholar', role: 'Team Lead' }]),
            fundingNeeded || challenge.grant_amount
        ]);

        const project = projRes.rows[0];

        // Seed initial default milestones
        await client.query(`
            INSERT INTO project_milestones (project_id, title, target_date, completed, remarks)
            VALUES
            ($1, 'Feasibility Assessment & Problem Site Inspection', '15 Days', false, 'Initial field survey and sensor requirement scoping.'),
            ($1, 'Engineering Architecture & Lab Prototype Testing', '45 Days', false, 'Fabrication and benchmark validation.'),
            ($1, 'Municipal Deployment Pilot & Handover Evaluation', '90 Days', false, 'Commissioning with municipal field staff.')
        `, [project.id]);

        // Notify government officer
        await client.query(`
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES ($1, 'Challenge Accepted by University', $2, 'CHALLENGE', '/government')
        `, [challenge.created_by, `University accepted ${challenge.code}: ${challenge.title} and created project "${project.title}".`]);

        await client.query('COMMIT');
        return res.status(201).json({
            success: true,
            message: 'Challenge accepted and project initialized successfully.',
            data: project
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

exports.updateMilestone = async (req, res, next) => {
    try {
        const { milestoneId } = req.params;
        const { completed, remarks } = req.body;

        const result = await pool.query(`
            UPDATE project_milestones
            SET completed = $1,
                completed_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END,
                remarks = COALESCE($2, remarks)
            WHERE id = $3
            RETURNING *
        `, [completed, remarks, milestoneId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Milestone not found.' });
        }

        return res.json({
            success: true,
            message: 'Milestone updated successfully.',
            data: result.rows[0]
        });
    } catch (err) {
        next(err);
    }
};

exports.addMilestone = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { title, targetDate, remarks } = req.body;

        const result = await pool.query(`
            INSERT INTO project_milestones (project_id, title, target_date, completed, remarks)
            VALUES ($1, $2, $3, false, $4)
            RETURNING *
        `, [projectId, title, targetDate || 'TBD', remarks || '']);

        return res.status(201).json({
            success: true,
            message: 'Milestone added.',
            data: result.rows[0]
        });
    } catch (err) {
        next(err);
    }
};
