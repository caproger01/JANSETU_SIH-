const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
    console.log('--- Seeding JanSetu Database with Verified Development Data ---');
    const passwordHash = await bcrypt.hash('JanSetu@2026', 10);

    try {
        // 1. Seed Users
        const users = [
            { name: 'Arun Kumar', email: 'citizen@jansetu.gov.in', mobile: '9876543210', role: 'citizen' },
            { name: 'Prof. S. K. Sharma', email: 'university@jansetu.gov.in', mobile: '9876543211', role: 'university' },
            { name: 'Aditi Verma, IAS', email: 'government@jansetu.gov.in', mobile: '9876543212', role: 'government' },
            { name: 'Rajesh Mehta', email: 'industry@jansetu.gov.in', mobile: '9876543213', role: 'industry' }
        ];

        const userMap = {};

        for (const u of users) {
            const existing = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [u.email]);
            let userId;
            if (existing.rows.length === 0) {
                const inserted = await pool.query(
                    `INSERT INTO users (name, email, mobile, password_hash, role, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                     RETURNING id`,
                    [u.name, u.email.toLowerCase(), u.mobile, passwordHash, u.role]
                );
                userId = inserted.rows[0].id;
                console.log(`Created user: ${u.email} (ID: ${userId})`);
            } else {
                userId = existing.rows[0].id;
                await pool.query('UPDATE users SET role = $1, password_hash = $2 WHERE id = $3', [u.role, passwordHash, userId]);
                console.log(`Updated user: ${u.email} (ID: ${userId})`);
            }
            userMap[u.role] = userId;
        }

        // 2. Profiles
        await pool.query(`
            INSERT INTO citizen_profiles (user_id, ward, address, bio)
            VALUES ($1, 'Ward 12, Civil Lines', '14/B, Rajpur Road, New Delhi', 'Active neighborhood civic contributor.')
            ON CONFLICT (user_id) DO NOTHING
        `, [userMap.citizen]);

        await pool.query(`
            INSERT INTO university_profiles (user_id, institution_name, campus, department, expertise_areas)
            VALUES ($1, 'Indian Institute of Technology', 'Roorkee / Meerut Extension', 'Department of Civil & Environmental Engineering', ARRAY['Drainage & Stormwater', 'Solar Power Grid', 'Waste Management', 'Pavement Materials'])
            ON CONFLICT (user_id) DO NOTHING
        `, [userMap.university]);

        await pool.query(`
            INSERT INTO government_profiles (user_id, department, designation, jurisdiction_ward)
            VALUES ($1, 'Municipal Corporation of Delhi', 'Zonal Municipal Commissioner', 'Ward 12 & Connaught Zone')
            ON CONFLICT (user_id) DO NOTHING
        `, [userMap.government]);

        await pool.query(`
            INSERT INTO industry_profiles (user_id, company_name, industry_sector, csr_budget)
            VALUES ($1, 'Tata Sustainability & Infrastructure Ltd.', 'Renewable Infrastructure & Urban Engineering', '₹ 2.5 Crore (FY 2026)')
            ON CONFLICT (user_id) DO NOTHING
        `, [userMap.industry]);

        // 3. Seed Problems (Citizen submissions)
        const problems = [
            {
                code: 'CB-2026-00124',
                title: 'Streetlight outage along 4th Avenue corridor',
                description: 'Multiple streetlights along 4th Avenue have been dark for 48 hours, creating severe safety risks for pedestrians and night commuters.',
                category: 'Public Infrastructure',
                subcategory: 'Street Lighting & Power',
                ward: 'Ward 12, Civil Lines',
                location: 'Near Central Park Gate 3, 4th Avenue',
                latitude: 28.6139,
                longitude: 77.2090,
                severity: 6,
                urgency: 'MEDIUM',
                priority_score: 6.8,
                priority_level: 'MEDIUM',
                affected_population: 350,
                status: 'SUBMITTED',
                ai_summary: 'Lighting failure in high-footfall residential corridor. High pedestrian risk during peak evening hours.',
                ai_keywords: ['Lighting', 'Infrastructure', 'Safety', 'Ward 12'],
                assigned_department: 'Electricity & Power Board',
                created_by: userMap.citizen
            },
            {
                code: 'CB-2026-00125',
                title: 'Severe Pothole & Road Cave-in on Main Street',
                description: 'Major asphalt subsidence creating a 2-foot pothole on bus transit route. Causing hazardous vehicular congestion and scooter accidents.',
                category: 'Roadways',
                subcategory: 'Pavement & Surface Damage',
                ward: 'Ward 8, Connaught Zone',
                location: 'Main Commercial Market Junction',
                latitude: 28.6219,
                longitude: 77.2150,
                severity: 8,
                urgency: 'HIGH',
                priority_score: 8.5,
                priority_level: 'HIGH',
                affected_population: 1200,
                status: 'UNDER REVIEW',
                ai_summary: 'Sub-base soil erosion suspected following recent monsoon rains. Recommended immediate barricading and structural resurfacing.',
                ai_keywords: ['Pothole', 'Roadways', 'Traffic Hazard', 'Monsoon Damage'],
                assigned_department: 'Public Works Department (PWD)',
                created_by: userMap.citizen
            },
            {
                code: 'CB-2026-00126',
                title: 'Rural Drainage & Monsoon Flooding Overflow',
                description: 'Open canal overflow leading to stagnant storm water in residential sector. Stagnation over 48 hours creating dengue contamination hazard.',
                category: 'Sanitation',
                subcategory: 'Drainage & Stormwater',
                ward: 'Ward 15 / Rural Sector 4',
                location: 'Sector 4 Village Approach Road',
                latitude: 28.6345,
                longitude: 77.2210,
                severity: 9,
                urgency: 'CRITICAL',
                priority_score: 9.2,
                priority_level: 'CRITICAL',
                affected_population: 2500,
                status: 'UNIVERSITY ASSIGNED',
                ai_summary: 'Critical overflow of unlined storm drainage culverts. Recommended structural gravity bio-swale and academic engineering design.',
                ai_keywords: ['Drainage', 'Flooding', 'Sanitation', 'Public Health'],
                assigned_department: 'Delhi Jal Board & Irrigation',
                created_by: userMap.citizen
            }
        ];

        for (const p of problems) {
            const res = await pool.query(
                `INSERT INTO problems (
                    code, title, description, category, subcategory, ward, location,
                    latitude, longitude, severity, urgency, priority_score, priority_level,
                    affected_population, status, ai_summary, ai_keywords, assigned_department,
                    created_by, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW() - INTERVAL '2 days', NOW())
                ON CONFLICT (code) DO NOTHING
                RETURNING id`,
                [
                    p.code, p.title, p.description, p.category, p.subcategory, p.ward, p.location,
                    p.latitude, p.longitude, p.severity, p.urgency, p.priority_score, p.priority_level,
                    p.affected_population, p.status, p.ai_summary, p.ai_keywords, p.assigned_department,
                    p.created_by
                ]
            );

            const probId = res.rows[0]?.id;
            if (probId) {
                // Seed status history
                await pool.query(`
                    INSERT INTO problem_status_history (problem_id, previous_status, new_status, changed_by, remarks)
                    VALUES 
                    ($1, NULL, 'SUBMITTED', $2, 'Problem registered via JanSetu Citizen Portal.'),
                    ($1, 'SUBMITTED', $3, $4, 'Automated AI triage pre-screening complete. Sent to department.')
                `, [probId, p.created_by, p.status, userMap.government]);
            }
        }

        // 4. Seed Challenges (For Universities)
        const challenges = [
            {
                code: 'CH-2026-081',
                title: 'Sustainable Stormwater Drainage & Gravity Filtration',
                description: 'Design a low-cost bio-swale and decentralized gravity-fed drainage system to permanently prevent seasonal flooding in Ward 15.',
                category: 'Sanitation & Environment',
                ward: 'Ward 15',
                location: 'Sector 4 Low-lying Basin',
                priority_level: 'HIGH',
                affected_population: 2500,
                required_expertise: ['Hydraulic Engineering', 'Urban Drainage', 'Environmental Science', 'GIS Mapping'],
                grant_amount: '₹ 8,50,000',
                status: 'ACCEPTED',
                created_by: userMap.government
            },
            {
                code: 'CH-2026-082',
                title: 'Smart Solar-Assisted Streetlight Grid & Motion Sensor Mesh',
                description: 'Retrofit outdated sodium lamps with energy-efficient smart solar LED fixtures featuring mesh-networked fault detection.',
                category: 'Public Infrastructure',
                ward: 'Ward 12',
                location: 'Civil Lines Sector A-D',
                priority_level: 'MEDIUM',
                affected_population: 3500,
                required_expertise: ['Electrical Engineering', 'IoT & Embedded Systems', 'Renewable Energy'],
                grant_amount: '₹ 6,00,000',
                status: 'OPEN',
                created_by: userMap.government
            },
            {
                code: 'CH-2026-083',
                title: 'Rapid Pavement Recycled Aggregate Cold-Mix Resurfacing',
                description: 'Develop polymer-reinforced recycled construction demolition waste asphalt mix for instant pothole repair during heavy monsoon downpours.',
                category: 'Transportation & Roads',
                ward: 'Ward 8',
                location: 'Connaught Transit Corridor',
                priority_level: 'HIGH',
                affected_population: 12000,
                required_expertise: ['Material Science', 'Civil Engineering', 'Transportation Logistics'],
                grant_amount: '₹ 10,00,000',
                status: 'OPEN',
                created_by: userMap.government
            }
        ];

        for (const c of challenges) {
            const chRes = await pool.query(`
                INSERT INTO challenges (
                    code, title, description, category, ward, location, priority_level,
                    affected_population, required_expertise, grant_amount, status, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (code) DO NOTHING
                RETURNING id
            `, [c.code, c.title, c.description, c.category, c.ward, c.location, c.priority_level, c.affected_population, c.required_expertise, c.grant_amount, c.status, c.created_by]);

            const chId = chRes.rows[0]?.id;
            if (chId && c.status === 'ACCEPTED') {
                await pool.query(`
                    INSERT INTO challenge_acceptances (challenge_id, university_id, status)
                    VALUES ($1, $2, 'ACTIVE')
                    ON CONFLICT DO NOTHING;
                `, [chId, userMap.university]);

                // 5. Seed Project for the Accepted Challenge
                const projRes = await pool.query(`
                    INSERT INTO projects (
                        challenge_id, university_id, title, description, lead_mentor,
                        team_name, student_members, stage, status, funding_needed, seeking_industry_support
                    ) VALUES (
                        $1, $2,
                        'Ward 15 EcoDrain Bio-Swale Pilot System',
                        'Multidisciplinary civil engineering capstone deploying decentralized stormwater bio-retention cells and automated water level sensors.',
                        'Dr. S. K. Sharma (Prof. Environmental Engineering)',
                        'Team JalSetu IIT-R',
                        '[
                            {"name": "Ananya Roy", "roll": "2023CE104", "role": "Hydraulic Lead"},
                            {"name": "Karan Singhal", "roll": "2023CS211", "role": "IoT Sensor Engineer"},
                            {"name": "Sneha Patel", "roll": "2024CE305", "role": "Soil & Materials Analyst"}
                        ]'::jsonb,
                        'PROTOTYPE', 'ACTIVE', '₹ 4,50,000', true
                    ) RETURNING id
                `, [chId, userMap.university]);

                const projId = projRes.rows[0]?.id;
                if (projId) {
                    // Milestones
                    await pool.query(`
                        INSERT INTO project_milestones (project_id, title, target_date, completed, completed_at, remarks)
                        VALUES
                        ($1, 'Site Geological Survey & Elevation Mapping', '15 Sep 2026', true, NOW(), 'Completed soil porosity and GIS elevation contour map.'),
                        ($1, 'Bio-Swale Modular Chamber Prototype Build', '30 Sep 2026', true, NOW(), 'Constructed 1:5 scale working pilot cell in hydraulics lab.'),
                        ($1, 'Municipal Field Deployment & Sensor Integration', '20 Oct 2026', false, NULL, 'Pending concrete sub-base trench clearance.'),
                        ($1, 'Monsoon Flow Validation & Handover Report', '15 Nov 2026', false, NULL, 'Final verification with Delhi Jal Board engineers.')
                    `, [projId]);

                    // 6. Seed Industry Support Offer (from Tata Sustainability)
                    await pool.query(`
                        INSERT INTO industry_support_offers (
                            project_id, industry_id, company_name, support_type, amount_or_details, status
                        ) VALUES (
                            $1, $2, 'Tata Sustainability & Infrastructure Ltd.',
                            'FUNDING', '₹ 3,50,000 Corporate CSR grant for bio-filtration media and sensor units', 'APPROVED'
                        )
                    `, [projId, userMap.industry]);
                }
            }
        }

        // 7. Seed Public Notices
        await pool.query(`
            INSERT INTO public_notices (title, category, summary, body, publisher_department)
            VALUES 
            (
                'Monsoon Ward Drainage & Desilting Action Plan 2026',
                'ADVISORY',
                'Citizens in low-lying sectors are requested to keep neighborhood drain grates clear of construction debris. Municipal emergency response teams on standby 24x7.',
                'Full advisory guidelines released by Delhi Municipal Corporation Public Health Division.',
                'Municipal Corporation of Delhi'
            ),
            (
                'PM Surya Ghar Rooftop Solar Civic Subsidy Scheme',
                'SCHEME',
                'Government financial support up to ₹78,000 for residential rooftop solar installation. Apply online through JanSetu energy partner window.',
                'State Ministry of Renewable Energy notification under National Solar Mission.',
                'Ministry of New & Renewable Energy'
            ),
            (
                'Ward 12 Road Surface Overlay & Night Work Schedule',
                'NOTICE',
                'Resurfacing along 4th Avenue corridor will be executed between 11 PM and 5 AM to prevent daytime traffic disruptions. Please observe detour signs.',
                'Public Works Department Road Construction Division notification.',
                'Public Works Department (PWD)'
            )
        `);

        // 8. Seed Scoped Notifications
        await pool.query(`
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES
            ($1, 'Grievance Under Review', 'Your report "Severe Pothole on Main Street" is assigned to Public Works Department.', 'PROBLEM', '/citizen'),
            ($1, 'University Challenge Assigned', 'Municipal authorities linked your Ward 15 drainage report to IIT Roorkee Innovation team.', 'PROBLEM', '/citizen'),
            ($2, 'New Challenge Recommendation', 'AI matched your department profile (96% fit) with "Sustainable Stormwater Drainage".', 'CHALLENGE', '/university'),
            ($2, 'Industry CSR Offer Approved', 'Tata Sustainability approved ₹ 3,50,000 CSR funding for your EcoDrain Project.', 'SUPPORT', '/university'),
            ($3, 'High Severity Grievance Logged', 'A Critical severity drainage overflow was reported in Ward 15 with 2500 citizens affected.', 'PROBLEM', '/government'),
            ($4, 'CSR Support Proposal Approved', 'Your offer of ₹ 3,50,000 for Ward 15 EcoDrain Project has been officially accepted by IIT Roorkee.', 'SUPPORT', '/industry')
        `, [userMap.citizen, userMap.university, userMap.government, userMap.industry]);

        // 8. Seed Configurable Government Councils & Departments
        const councils = [
            { name: 'Public Works / Road Infrastructure Council', code: 'PWRIC', jurisdiction: 'State Capital Metropolitan Region', email: 'pwric@jansetu.gov.in', depts: ['Roadways & Pavement Division', 'Bridges & Flyovers Wing', 'Subgrade Engineering Unit'] },
            { name: 'Water Supply / Drainage Council', code: 'WSDC', jurisdiction: 'Inter-Ward Water & Catchment Board', email: 'wsdc@jansetu.gov.in', depts: ['Stormwater & Culvert Drainage', 'Potable Water Distribution', 'Wastewater Treatment'] },
            { name: 'Municipal Waste Management Department', code: 'MWMD', jurisdiction: 'Zonal Sanitation Command', email: 'mwmd@jansetu.gov.in', depts: ['Solid Waste Collection', 'Bio-Hazard Processing', 'Recycling & Landfills'] },
            { name: 'Transport Department', code: 'TPTD', jurisdiction: 'Urban Transit Authority', email: 'transport@jansetu.gov.in', depts: ['Bus Transit Network', 'Traffic Signal Controls', 'Pedestrian Walkways'] },
            { name: 'Electricity / Urban Lighting Department', code: 'EULD', jurisdiction: 'Urban Energy Distribution Council', email: 'lighting@jansetu.gov.in', depts: ['Corridor Streetlighting', 'Substation Feeder Maintenance', 'Solar Microgrid Division'] },
            { name: 'Environment Department', code: 'ENVD', jurisdiction: 'Pollution & Ecological Conservation Board', email: 'environment@jansetu.gov.in', depts: ['Air Quality Monitoring', 'Industrial Effluents Control', 'Urban Afforestation'] },
            { name: 'Public Safety / Municipal Administration', code: 'PSMA', jurisdiction: 'Public Order & Municipal Vigilance', email: 'safety@jansetu.gov.in', depts: ['Encroachment Prevention', 'Disaster Relief Wing', 'Community Safety Squad'] },
            { name: 'Education Department', code: 'EDUD', jurisdiction: 'Civic Schools & Academic Infrastructure', email: 'education@jansetu.gov.in', depts: ['School Facilities Maintenance', 'Digital Labs Initiative', 'Vocational Training Centers'] },
            { name: 'Public Health Department', code: 'PHLD', jurisdiction: 'Primary Healthcare & Sanitation Health', email: 'health@jansetu.gov.in', depts: ['Epidemic Prevention & Vector Control', 'Primary Health Dispensaries', 'Food Safety Inspection'] },
            { name: 'Parks and Urban Development Department', code: 'PUDD', jurisdiction: 'Recreational & Green Spaces Zone', email: 'parks@jansetu.gov.in', depts: ['Horticulture & Public Parks', 'Urban Landscape Development', 'Lake Rejuvenation'] },
            { name: 'Water/Drainage and Disaster Management Authority', code: 'WDDMA', jurisdiction: 'Monsoon Flood Preparedness Wing', email: 'disaster@jansetu.gov.in', depts: ['Flood Warning Telemetry', 'Emergency Inundation Pumping', 'Catchment Canal Desilting'] },
            { name: 'Smart City / Digital Governance Department', code: 'SCDGD', jurisdiction: 'Civic Intelligence & IoT Network', email: 'smartcity@jansetu.gov.in', depts: ['GIS Sensors & Telemetry Hub', 'Citizen Redressal Automation', 'Smart Traffic Monitoring'] }
        ];

        const councilMap = {};
        const deptMap = {};

        for (const c of councils) {
            const insC = await pool.query(`
                INSERT INTO government_councils (name, code, jurisdiction, contact_email, is_active)
                VALUES ($1, $2, $3, $4, true)
                ON CONFLICT (code) DO UPDATE SET name = $1, jurisdiction = $3, contact_email = $4, is_active = true
                RETURNING id, code
            `, [c.name, c.code, c.jurisdiction, c.email]);
            const councilId = insC.rows[0].id;
            councilMap[c.code] = councilId;

            for (const d of c.depts) {
                const deptCode = d.split(' ')[0].toUpperCase() + '_' + c.code;
                const insD = await pool.query(`
                    INSERT INTO government_departments (council_id, name, code, is_active)
                    VALUES ($1, $2, $3, true)
                    ON CONFLICT (council_id, code) DO UPDATE SET name = $2, is_active = true
                    RETURNING id
                `, [councilId, d, deptCode]);
                deptMap[d] = insD.rows[0].id;
            }
        }

        // 9. Seed Problem Categories & Council Mappings
        const categories = [
            { name: 'Roads & Infrastructure', code: 'ROADS', council: 'PWRIC', desc: 'Potholes, damaged pavements, road subgrade cave-ins, and bridge maintenance.' },
            { name: 'Water & Drainage', code: 'WATER', council: 'WSDC', desc: 'Water pipeline leaks, culvert blockage, stormwater drains, low water pressure.' },
            { name: 'Waste Management', code: 'WASTE', council: 'MWMD', desc: 'Solid garbage accumulation, uncollected dumpsters, sanitation hazards.' },
            { name: 'Public Transport', code: 'TRANSPORT', council: 'TPTD', desc: 'Bus stop damage, commuter safety, broken signal crossings, transit routing.' },
            { name: 'Electricity / Street Lighting', code: 'ELECTRICITY', council: 'EULD', desc: 'Dark corridors, streetlight faults, hazardous hanging cables, power flickers.' },
            { name: 'Environment & Pollution', code: 'ENVIRONMENT', council: 'ENVD', desc: 'Industrial smoke, open burning, dust pollution, effluent dumping.' },
            { name: 'Public Safety', code: 'SAFETY', council: 'PSMA', desc: 'Dangerous open pits, abandoned structures, dark alleyways, crowd safety.' },
            { name: 'Education', code: 'EDUCATION', council: 'EDUD', desc: 'Government school infrastructure, broken desks, water in civic school complexes.' },
            { name: 'Healthcare', code: 'HEALTH', council: 'PHLD', desc: 'Primary health center hygiene, mosquito breeding hotspots, medical dispensary needs.' },
            { name: 'Parks & Public Spaces', code: 'PARKS', council: 'PUDD', desc: 'Overgrown park weeds, broken community benches, unmaintained walking trails.' },
            { name: 'Flooding / Storm Water', code: 'FLOODING', council: 'WDDMA', desc: 'Severe monsoon inundation, blocked retention canals, waterlogging hotspots.' },
            { name: 'Smart City / Digital Civic Services', code: 'SMART_CITY', council: 'SCDGD', desc: 'CCTV offline, municipal portal outages, public WiFi poles, digital meters.' }
        ];

        for (const cat of categories) {
            const councilId = councilMap[cat.council];
            const insCat = await pool.query(`
                INSERT INTO problem_categories (name, code, description, default_council_id, is_active)
                VALUES ($1, $2, $3, $4, true)
                ON CONFLICT (code) DO UPDATE SET name = $1, description = $3, default_council_id = $4, is_active = true
                RETURNING id
            `, [cat.name, cat.code, cat.desc, councilId]);
            const catId = insCat.rows[0].id;

            await pool.query(`
                INSERT INTO category_council_mapping (category_id, council_id, priority_level, notes)
                VALUES ($1, $2, 'HIGH', 'Primary default jurisdictional council for ' || $3)
                ON CONFLICT (category_id, council_id) DO UPDATE SET priority_level = 'HIGH'
            `, [catId, councilId, cat.name]);
        }

        // 10. Update existing seeded problems with council assignments
        await pool.query(`
            UPDATE problems
            SET assigned_council_id = $1,
                council_assigned_at = NOW(),
                council_assignment_notes = 'Assigned to Public Works / Road Infrastructure Council for urgent asphalt restoration'
            WHERE category ILIKE '%Road%' OR category ILIKE '%Pavement%'
        `, [councilMap['PWRIC']]);

        await pool.query(`
            UPDATE problems
            SET assigned_council_id = $1,
                council_assigned_at = NOW(),
                council_assignment_notes = 'Assigned to Water Supply / Drainage Council for stormwater diversion triage'
            WHERE category ILIKE '%Water%' OR category ILIKE '%Drainage%' OR category ILIKE '%Sanitation%'
        `, [councilMap['WSDC']]);

        // 11. Ensure existing seed projects have valid code, council and problem linkage
        const pRes = await pool.query('SELECT id, challenge_id FROM projects WHERE code IS NULL OR responsible_council_id IS NULL');
        for (const pr of pRes.rows) {
            const ch = await pool.query('SELECT problem_id FROM challenges WHERE id = $1', [pr.challenge_id]);
            const probId = ch.rows[0]?.problem_id || null;
            await pool.query(`
                UPDATE projects
                SET code = 'PRJ-2026-00' || id,
                    problem_id = $1,
                    responsible_council_id = $2,
                    status = 'IN_PROGRESS',
                    progress_percentage = 45,
                    allotted_at = NOW() - INTERVAL '5 days',
                    allotted_by = $3,
                    start_date = NOW() - INTERVAL '5 days',
                    target_completion_date = NOW() + INTERVAL '30 days',
                    category = 'Water & Drainage',
                    required_expertise = ARRAY['Civil Engineering', 'Hydraulic Engineering', 'Material Science']
                WHERE id = $4
            `, [probId, councilMap['WSDC'], userMap.government, pr.id]);

            // Add progress update for seed project
            await pool.query(`
                INSERT INTO project_progress_updates (project_id, submitted_by, role, update_title, description, progress_percentage, evidence_notes)
                VALUES ($1, $2, 'university', 'Phase 1 Culvert Simulation Completed', 'Computational fluid dynamic modeling verified 40% reduction in road waterlogging.', 45, 'CAD blueprints uploaded to lab server')
            `, [pr.id, userMap.university]);
        }

        console.log('✓ JanSetu Database Seed Completed Successfully.');
        console.log('\n--- Test Accounts Ready ---');
        console.log('Citizen:    citizen@jansetu.gov.in    | JanSetu@2026');
        console.log('University: university@jansetu.gov.in | JanSetu@2026');
        console.log('Government: government@jansetu.gov.in | JanSetu@2026');
        console.log('Industry:   industry@jansetu.gov.in   | JanSetu@2026');
    } catch (err) {
        console.error('Seeding failed:', err);
        throw err;
    }
}

if (require.main === module) {
    seed()
        .then(() => pool.end())
        .catch(() => process.exit(1));
}

module.exports = seed;
