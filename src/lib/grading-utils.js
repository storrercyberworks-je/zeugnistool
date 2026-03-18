/**
 * Utility functions for Swiss grading system logic.
 */

/**
 * Calculates weighted and simple averages for a list of grades.
 * @param {Array} grades 
 * @param {number} precision 
 * @returns {Object}
 */
export function calculateAverages(grades, precision = 1, step = 0.1) {
    if (!grades || grades.length === 0) return { weighted: null, simple: null, final: null };

    let totalWeighted = 0;
    let totalWeights = 0;
    let totalSimple = 0;
    let count = 0;

    grades.forEach(g => {
        const val = parseFloat(g.grade_value);
        if (isNaN(val)) return;

        if (g.weight && !isNaN(parseFloat(g.weight))) {
            const w = parseFloat(g.weight) / 100;
            totalWeighted += val * w;
            totalWeights += w;
        } else {
            totalSimple += val;
            count++;
        }
    });

    const weighted = totalWeights > 0 ? (totalWeighted / totalWeights) : null;
    const simple = count > 0 ? (totalSimple / count) : null;
    const rawFinal = weighted !== null ? weighted : simple;

    if (rawFinal === null) return { weighted: null, simple: null, final: null };

    // Swiss rounding logic
    let finalValue = rawFinal;
    const s = parseFloat(step) || 0.1;
    if (s === 0.5 || s === 0.25) {
        finalValue = Math.round(rawFinal / s) * s;
    }

    return {
        weighted: weighted !== null ? weighted.toFixed(precision) : null,
        simple: simple !== null ? simple.toFixed(precision) : null,
        final: parseFloat(finalValue.toFixed(precision))
    };
}

/**
 * Maps a numerical grade (1-6) to a GIBB predicate.
 * @param {number} grade 
 * @returns {string}
 */
export function getPredicate(grade) {
    if (!grade || isNaN(grade)) return '-';
    if (grade >= 5.75) return 'Hervorragend';
    if (grade >= 5.25) return 'Sehr gut';
    if (grade >= 4.75) return 'Gut';
    if (grade >= 4.25) return 'Befriedigend';
    if (grade >= 3.95) return 'Genügend';
    return 'Ungenügend';
}

/**
 * Determines if a student has passed based on the average.
 * @param {number} average 
 * @returns {boolean}
 */
export function isPromoted(average) {
    if (!average || isNaN(average)) return false;
    return average >= 4.0;
}

/**
 * Groups grades by subject and then by category.
 * @param {Array} grades 
 * @param {Array} subjects 
 * @param {number} precision 
 * @returns {Object}
 */
export function groupGradesByCategory(grades, subjects = [], precision = 1, step = 0.1) {
    const subjectMap = new Map(subjects.map(s => [s.id, s]));

    const subjectGrades = {};
    grades.forEach(g => {
        if (!subjectGrades[g.subject_id]) {
            const subject = subjectMap.get(g.subject_id);
            subjectGrades[g.subject_id] = {
                id: g.subject_id,
                name: g.subject_name,
                category: subject?.category || 'Andere',
                grades: []
            };
        }
        subjectGrades[g.subject_id].grades.push(g);
    });

    const categories = {
        'Fachmodul': [],
        'Allgemeinbildung': [],
        'Andere': []
    };

    Object.values(subjectGrades).forEach(sg => {
        const avg = calculateAverages(sg.grades, precision, step).final;
        const catKey = sg.category?.toLowerCase() === 'fachmodul' ? 'Fachmodul' :
            (sg.category?.toLowerCase() === 'allgemeinbildung' ? 'Allgemeinbildung' : 'Andere');

        categories[catKey].push({
            name: sg.name,
            grade: avg,
            predicate: getPredicate(avg)
        });
    });

    return categories;
}
/**
 * Returns CSS classes for grade background and text based on Swiss system.
 * @param {number} grade 
 * @returns {string}
 */
export function getGradeColorClass(grade) {
    if (!grade || isNaN(grade)) return 'bg-muted text-muted-foreground';
    if (grade >= 5.5) return 'text-green-600 bg-green-500/10 border-green-500/20';
    if (grade >= 5.0) return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
    if (grade >= 4.0) return 'text-orange-600 bg-orange-500/10 border-orange-500/20';
    return 'text-red-600 bg-red-500/10 border-red-500/20';
}
