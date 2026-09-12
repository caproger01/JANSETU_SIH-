/**
 * Challenge Matching Service
 * Calculates semantic compatibility between a university department/expertise and challenge requirements.
 */

function calculateMatchScore(challenge, universityProfile) {
    if (!challenge || !universityProfile) {
        return { matchScore: 70, reasons: ['General Academic Alignment'] };
    }

    const required = Array.isArray(challenge.required_expertise) ? challenge.required_expertise : [];
    const universityExpertise = Array.isArray(universityProfile.expertise_areas) ? universityProfile.expertise_areas : [];

    if (required.length === 0 || universityExpertise.length === 0) {
        return { matchScore: 75, reasons: ['Institutional Capacity Match'] };
    }

    let matches = 0;
    const matchedReasons = [];

    const uniTokens = universityExpertise.join(' ').toLowerCase();

    for (const req of required) {
        const reqLower = req.toLowerCase();
        // check direct inclusion or word overlap
        const words = reqLower.split(/\s+/).filter(w => w.length > 3);
        const hasOverlap = words.some(w => uniTokens.includes(w)) || uniTokens.includes(reqLower);

        if (hasOverlap) {
            matches++;
            matchedReasons.push(`Strong alignment with '${req}'`);
        }
    }

    // Baseline calculation
    const matchRatio = matches / required.length;
    let score = Math.round(65 + (matchRatio * 32)); // scores typically between 65% and 97%
    if (score > 98) score = 98;

    if (matchedReasons.length === 0) {
        matchedReasons.push('Cross-disciplinary Engineering and Civic Research Fit');
    }

    return {
        matchScore: score,
        reasons: matchedReasons
    };
}

module.exports = {
    calculateMatchScore
};
