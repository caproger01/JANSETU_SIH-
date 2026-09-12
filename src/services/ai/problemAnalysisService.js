/**
 * Problem Analysis & Pre-screening Service
 * Uses Google Gemini API when GEMINI_API_KEY is available, otherwise provides structured rule-based pre-screening.
 */
const { calculatePriority } = require('./priorityCalculationService');

async function analyzeProblem({ title, description, category, location, affectedPopulation }) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
        try {
            const prompt = `
You are an expert AI municipal triage assistant for the Indian Civic Administration Platform 'JanSetu'.
Analyze the following civic problem report submitted by a citizen:

Title: ${title}
Description: ${description}
Category: ${category || 'General'}
Location: ${location || 'Unspecified'}
Estimated Affected Population: ${affectedPopulation || 100}

Respond ONLY with a valid JSON object matching this schema (do not wrap in markdown quotes if possible, or use standard json):
{
  "summary": "Brief 1-2 sentence executive assessment of the problem",
  "category": "Suggested or confirmed civic category (e.g. Public Infrastructure, Roadways, Sanitation, Electricity & Power, Water Supply, Public Health)",
  "subcategory": "Specific subcategory",
  "department": "Appropriate municipal department (e.g. Public Works Department (PWD), Municipal Corporation, Electricity Board, Delhi Jal Board, Traffic Police)",
  "severity": <integer 1 to 10>,
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "keywords": ["tag1", "tag2", "tag3"],
  "risk_flags": ["Safety Hazard", "Waterborne Disease Risk", etc.],
  "suggested_action": "Initial recommended action for authorities"
}
`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    const parsed = JSON.parse(text);
                    const prio = calculatePriority({
                        severity: parsed.severity,
                        urgency: parsed.urgency,
                        affectedPopulation: affectedPopulation,
                        riskFlags: parsed.risk_flags
                    });

                    return {
                        source: 'GEMINI_AI',
                        summary: parsed.summary,
                        category: parsed.category || category,
                        subcategory: parsed.subcategory,
                        department: parsed.department,
                        severity: parsed.severity,
                        urgency: parsed.urgency,
                        priorityScore: prio.priorityScore,
                        priorityLevel: prio.priorityLevel,
                        keywords: parsed.keywords || [],
                        suggestedAction: parsed.suggested_action
                    };
                }
            }
        } catch (geminiErr) {
            console.warn('Gemini API call failed or timed out, falling back to heuristic pre-screening:', geminiErr.message);
        }
    }

    // Heuristic Fallback Analysis
    const text = `${title} ${description}`.toLowerCase();
    let severity = 5;
    let urgency = 'MEDIUM';
    let department = 'Municipal Corporation Administrative Cell';
    let subcategory = 'General Grievance';
    let riskFlags = [];
    let keywords = ['Civic Issue', 'JanSetu'];

    if (text.includes('pothole') || text.includes('road') || text.includes('asphalt') || text.includes('subsidence')) {
        subcategory = 'Pavement & Surface Damage';
        department = 'Public Works Department (PWD)';
        severity = 7;
        urgency = 'HIGH';
        keywords.push('Roadways', 'Pothole', 'Transit');
        riskFlags.push('Traffic Accident Hazard');
    } else if (text.includes('drain') || text.includes('water') || text.includes('sewage') || text.includes('flood') || text.includes('overflow')) {
        subcategory = 'Drainage & Stormwater';
        department = 'Municipal Water Supply & Drainage Division';
        severity = 8;
        urgency = 'HIGH';
        keywords.push('Sanitation', 'Drainage', 'Contamination');
        riskFlags.push('Public Health Risk', 'Water Stagnation');
    } else if (text.includes('light') || text.includes('dark') || text.includes('lamp') || text.includes('electric') || text.includes('wire')) {
        subcategory = 'Street Lighting & Power Supply';
        department = 'Electricity & Power Board';
        severity = 6;
        urgency = 'MEDIUM';
        keywords.push('Lighting', 'Power', 'Safety');
        riskFlags.push('Pedestrian Night Risk');
    } else if (text.includes('garbage') || text.includes('waste') || text.includes('trash') || text.includes('dump')) {
        subcategory = 'Solid Waste Management';
        department = 'Municipal Sanitation Department';
        severity = 6;
        urgency = 'MEDIUM';
        keywords.push('Waste', 'Sanitation', 'Cleanliness');
        riskFlags.push('Vector Breeding');
    }

    const prio = calculatePriority({
        severity,
        urgency,
        affectedPopulation,
        riskFlags
    });

    return {
        source: 'HEURISTIC_RULE_ENGINE',
        summary: `Automated assessment: ${title}. Categorized under ${subcategory} and routed to ${department}.`,
        category: category || 'Public Infrastructure',
        subcategory,
        department,
        severity,
        urgency,
        priorityScore: prio.priorityScore,
        priorityLevel: prio.priorityLevel,
        keywords,
        suggestedAction: `Dispatch inspection crew from ${department} to verify site conditions.`
    };
}

module.exports = {
    analyzeProblem
};
