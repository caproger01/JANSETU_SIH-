/**
 * Mathematical Priority Calculation Service
 * Deterministic formula:
 * Priority Score (1-10) = (Severity * 0.35) + (UrgencyFactor * 0.25) + (AffectedPopFactor * 0.20) + (RiskFactors * 0.20)
 */

function calculatePriority({ severity, urgency, affectedPopulation, riskFlags = [] }) {
    // 1. Severity: 1 to 10
    const clampedSeverity = Math.min(10, Math.max(1, Number(severity) || 5));

    // 2. Urgency Factor: LOW = 2.5, MEDIUM = 5.0, HIGH = 7.5, CRITICAL = 10.0
    const urgencyMap = {
        'LOW': 2.5,
        'MEDIUM': 5.0,
        'HIGH': 7.5,
        'CRITICAL': 10.0
    };
    const urgencyVal = urgencyMap[(urgency || '').toUpperCase()] || 5.0;

    // 3. Affected Population Factor: Logarithmic/tier scale up to 10
    const pop = Math.max(1, Number(affectedPopulation) || 50);
    let popFactor = 2.0;
    if (pop > 10000) popFactor = 10.0;
    else if (pop > 5000) popFactor = 8.5;
    else if (pop > 1000) popFactor = 7.0;
    else if (pop > 250) popFactor = 5.0;
    else if (pop > 50) popFactor = 3.5;

    // 4. Risk Factors (safety hazard, public health, children/elderly vicinity, arterial roadway)
    let riskScore = 3.0;
    if (Array.isArray(riskFlags)) {
        riskScore = Math.min(10.0, 3.0 + (riskFlags.length * 2.0));
    }

    // Weighted composite
    const score = (clampedSeverity * 0.35) + (urgencyVal * 0.25) + (popFactor * 0.20) + (riskScore * 0.20);
    const finalScore = Number(score.toFixed(1));

    let priorityLevel = 'LOW';
    if (finalScore >= 8.0) priorityLevel = 'CRITICAL';
    else if (finalScore >= 6.5) priorityLevel = 'HIGH';
    else if (finalScore >= 4.0) priorityLevel = 'MEDIUM';

    return {
        priorityScore: finalScore,
        priorityLevel: priorityLevel
    };
}

module.exports = {
    calculatePriority
};
