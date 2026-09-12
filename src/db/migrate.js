const pool = require('../config/db');

async function migrate() {
    console.log('--- Running JanSetu Complete Database Migration ---');

    try {
        // 1. Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                mobile VARCHAR(20),
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT chk_user_role CHECK (role IS NULL OR role IN ('citizen', 'university', 'government', 'industry'))
            );
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `);

        // 2. Profiles
        await pool.query(`
            CREATE TABLE IF NOT EXISTS citizen_profiles (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                ward VARCHAR(100),
                address TEXT,
                bio TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS university_profiles (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                institution_name VARCHAR(255) NOT NULL,
                campus VARCHAR(255),
                department VARCHAR(255),
                expertise_areas TEXT[] DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS government_profiles (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                department VARCHAR(255) NOT NULL,
                designation VARCHAR(255),
                jurisdiction_ward VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS industry_profiles (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                company_name VARCHAR(255) NOT NULL,
                industry_sector VARCHAR(255),
                csr_budget VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Problems & Problem Status History
        await pool.query(`
            CREATE TABLE IF NOT EXISTS problems (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                category VARCHAR(100) NOT NULL,
                subcategory VARCHAR(100),
                ward VARCHAR(100),
                district VARCHAR(100) DEFAULT 'New Delhi',
                location TEXT,
                latitude NUMERIC(10, 6) NOT NULL,
                longitude NUMERIC(10, 6) NOT NULL,
                severity INT DEFAULT 5,
                urgency VARCHAR(20) DEFAULT 'MEDIUM',
                priority_score NUMERIC(5, 2) DEFAULT 5.0,
                priority_level VARCHAR(20) DEFAULT 'MEDIUM',
                affected_population INT DEFAULT 100,
                status VARCHAR(50) DEFAULT 'SUBMITTED',
                ai_summary TEXT,
                ai_keywords TEXT[] DEFAULT '{}',
                assigned_department VARCHAR(100),
                officer_remarks TEXT,
                resolved_at TIMESTAMP WITH TIME ZONE,
                created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_problems_created_by ON problems(created_by);
            CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status);
            CREATE INDEX IF NOT EXISTS idx_problems_ward ON problems(ward);
            CREATE INDEX IF NOT EXISTS idx_problems_category ON problems(category);

            CREATE TABLE IF NOT EXISTS problem_images (
                id SERIAL PRIMARY KEY,
                problem_id INT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                original_filename VARCHAR(255),
                mime_type VARCHAR(100),
                file_size INT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS problem_status_history (
                id SERIAL PRIMARY KEY,
                problem_id INT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
                previous_status VARCHAR(50),
                new_status VARCHAR(50) NOT NULL,
                changed_by INT REFERENCES users(id) ON DELETE SET NULL,
                remarks TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Challenges & Challenge Acceptances
        await pool.query(`
            CREATE TABLE IF NOT EXISTS challenges (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE,
                problem_id INT REFERENCES problems(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                category VARCHAR(100) NOT NULL,
                ward VARCHAR(100),
                location TEXT,
                priority_level VARCHAR(20) DEFAULT 'HIGH',
                affected_population INT DEFAULT 500,
                required_expertise TEXT[] DEFAULT '{}',
                grant_amount VARCHAR(100),
                status VARCHAR(50) DEFAULT 'OPEN',
                created_by INT REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS challenge_acceptances (
                id SERIAL PRIMARY KEY,
                challenge_id INT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
                university_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'ACTIVE',
                accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unq_challenge_uni UNIQUE(challenge_id, university_id)
            );
        `);

        // 5. Projects & Milestones
        await pool.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                challenge_id INT REFERENCES challenges(id) ON DELETE SET NULL,
                university_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                lead_mentor VARCHAR(255),
                team_name VARCHAR(255),
                student_members JSONB DEFAULT '[]'::jsonb,
                stage VARCHAR(50) DEFAULT 'RESEARCH',
                status VARCHAR(50) DEFAULT 'ACTIVE',
                funding_needed VARCHAR(100),
                seeking_industry_support BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_projects_university_id ON projects(university_id);

            CREATE TABLE IF NOT EXISTS project_milestones (
                id SERIAL PRIMARY KEY,
                project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                target_date VARCHAR(100),
                completed BOOLEAN DEFAULT false,
                completed_at TIMESTAMP WITH TIME ZONE,
                remarks TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 6. Industry Support Offers
        await pool.query(`
            CREATE TABLE IF NOT EXISTS industry_support_offers (
                id SERIAL PRIMARY KEY,
                project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                industry_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                company_name VARCHAR(255),
                support_type VARCHAR(100) NOT NULL,
                amount_or_details TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'PENDING',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_support_industry_id ON industry_support_offers(industry_id);
            CREATE INDEX IF NOT EXISTS idx_support_project_id ON industry_support_offers(project_id);
        `);

        // 7. Public Notices
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public_notices (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                summary TEXT NOT NULL,
                body TEXT,
                publisher_department VARCHAR(255),
                published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            );
        `);

        // 8. Notifications
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'SYSTEM',
                link VARCHAR(255),
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        `);

        // 9. Audit Logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                actor_id INT REFERENCES users(id) ON DELETE SET NULL,
                role VARCHAR(50),
                action VARCHAR(100) NOT NULL,
                resource_type VARCHAR(100),
                resource_id INT,
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 10. Government Councils & Departments (Configurable Authority Architecture)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS government_councils (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                code VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                jurisdiction VARCHAR(255) DEFAULT 'Municipal Capital Region',
                contact_email VARCHAR(255),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS government_departments (
                id SERIAL PRIMARY KEY,
                council_id INT NOT NULL REFERENCES government_councils(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50) NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unq_council_dept UNIQUE(council_id, code)
            );

            CREATE TABLE IF NOT EXISTS problem_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                code VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                default_council_id INT REFERENCES government_councils(id) ON DELETE SET NULL,
                default_department_id INT REFERENCES government_departments(id) ON DELETE SET NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS category_council_mapping (
                id SERIAL PRIMARY KEY,
                category_id INT NOT NULL REFERENCES problem_categories(id) ON DELETE CASCADE,
                council_id INT NOT NULL REFERENCES government_councils(id) ON DELETE CASCADE,
                department_id INT REFERENCES government_departments(id) ON DELETE SET NULL,
                priority_level VARCHAR(20) DEFAULT 'MEDIUM',
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unq_cat_council UNIQUE(category_id, council_id)
            );
        `);

        // 11. Schema Alterations for Problems, Challenges & Projects
        await pool.query(`
            ALTER TABLE problems
                ADD COLUMN IF NOT EXISTS assigned_council_id INT REFERENCES government_councils(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS assigned_department_id INT REFERENCES government_departments(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS council_assigned_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS council_assignment_notes TEXT,
                ADD COLUMN IF NOT EXISTS ai_council_recommendation VARCHAR(255),
                ADD COLUMN IF NOT EXISTS ai_council_confidence NUMERIC(5,2);

            ALTER TABLE challenges
                ADD COLUMN IF NOT EXISTS responsible_council_id INT REFERENCES government_councils(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS responsible_department_id INT REFERENCES government_departments(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS expected_outcome TEXT,
                ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS estimated_resources TEXT,
                ADD COLUMN IF NOT EXISTS citizen_problem_id INT REFERENCES problems(id) ON DELETE SET NULL;

            ALTER TABLE projects
                ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE,
                ADD COLUMN IF NOT EXISTS problem_id INT REFERENCES problems(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS responsible_council_id INT REFERENCES government_councils(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS responsible_department_id INT REFERENCES government_departments(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS industry_partner_id INT REFERENCES users(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS location TEXT,
                ADD COLUMN IF NOT EXISTS category VARCHAR(100),
                ADD COLUMN IF NOT EXISTS priority_level VARCHAR(20) DEFAULT 'HIGH',
                ADD COLUMN IF NOT EXISTS required_expertise TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS expected_outcome TEXT,
                ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS target_completion_date TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS progress_percentage INT DEFAULT 0,
                ADD COLUMN IF NOT EXISTS allotted_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS allotted_by INT REFERENCES users(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS verified_by INT REFERENCES users(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS verification_notes TEXT;

            CREATE INDEX IF NOT EXISTS idx_projects_problem_id ON projects(problem_id);
            CREATE INDEX IF NOT EXISTS idx_projects_council_id ON projects(responsible_council_id);
            CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
        `);

        // 12. Project Progress Submissions & Formal Verifications
        await pool.query(`
            CREATE TABLE IF NOT EXISTS project_progress_updates (
                id SERIAL PRIMARY KEY,
                project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                submitted_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(50) NOT NULL,
                update_title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                progress_percentage INT NOT NULL,
                evidence_notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS project_verifications (
                id SERIAL PRIMARY KEY,
                project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                verified_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                verification_status VARCHAR(50) NOT NULL,
                officer_comments TEXT NOT NULL,
                site_inspection_date TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS project_status_history (
                id SERIAL PRIMARY KEY,
                project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                previous_status VARCHAR(50),
                new_status VARCHAR(50) NOT NULL,
                changed_by INT REFERENCES users(id) ON DELETE SET NULL,
                reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✓ JanSetu Database Migration Completed Successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
        throw err;
    }
}

if (require.main === module) {
    migrate()
        .then(() => pool.end())
        .catch(() => process.exit(1));
}

module.exports = migrate;
