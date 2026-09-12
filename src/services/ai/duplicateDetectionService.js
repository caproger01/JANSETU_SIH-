/**
 * Duplicate Grievance Detection Service
 * Detects whether a newly submitted problem closely matches existing active issues in the same ward/area.
 */
const pool = require('../../config/db');

async function checkDuplicates({ ward, title, description, category }) {
    try {
        const query = `
            SELECT id, code, title, description, ward, status, created_at
            FROM problems
            WHERE ward ILIKE $1 OR category ILIKE $2
            ORDER BY created_at DESC
            LIMIT 15
        `;
        const result = await pool.query(query, [ward || '%', category || '%']);

        const candidateWords = new Set(
            `${title} ${description}`
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 3)
        );

        let potentialDuplicate = null;
        let highestSimilarity = 0;

        for (const row of result.rows) {
            const existingWords = new Set(
                `${row.title} ${row.description}`
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .split(/\s+/)
                    .filter(w => w.length > 3)
            );

            let intersection = 0;
            for (const word of candidateWords) {
                if (existingWords.has(word)) intersection++;
            }

            const union = new Set([...candidateWords, ...existingWords]).size;
            const jaccard = union > 0 ? intersection / union : 0;

            if (jaccard > highestSimilarity) {
                highestSimilarity = jaccard;
                if (jaccard >= 0.40) {
                    potentialDuplicate = {
                        id: row.id,
                        code: row.code,
                        title: row.title,
                        status: row.status,
                        similarity: Math.round(jaccard * 100)
                    };
                }
            }
        }

        return {
            hasDuplicate: !!potentialDuplicate,
            potentialDuplicate
        };
    } catch (err) {
        console.error('Duplicate detection error:', err);
        return { hasDuplicate: false, potentialDuplicate: null };
    }
}

module.exports = {
    checkDuplicates
};
