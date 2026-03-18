import { calculateAverages } from './grading-utils';

/**
 * Evaluates if a student requires a re-examination based on grades.
 * 
 * @param {Array} grades - All grades for the student in specified semester/year
 * @returns {Object} Re-examination evaluation result
 */
export function evaluateReexamination(grades) {
    if (!grades || grades.length === 0) {
        return {
            overallAverage: 0,
            hasOverallFailure: false,
            failedModules: [],
            hasModuleFailure: false,
            hasManualFlag: false,
            finalReexaminationRequired: false,
            reexaminationReasons: []
        };
    }

    // 1. Group by module (subject_id)
    const moduleMap = new Map();
    let hasManualFlag = false;

    grades.forEach(g => {
        if (!moduleMap.has(g.subject_id)) {
            moduleMap.set(g.subject_id, {
                id: g.subject_id,
                name: g.subject_name,
                grades: []
            });
        }
        moduleMap.get(g.subject_id).grades.push(g);

        if (g.reexamination_required === true) {
            hasManualFlag = true;
        }
    });

    // 2. Calculate module averages
    const moduleResults = [];
    const averagesForOverall = [];

    moduleMap.forEach(mod => {
        const avgResult = calculateAverages(mod.grades);
        const avg = avgResult.final || 0;

        moduleResults.push({
            subject_id: mod.id,
            subject_name: mod.name,
            moduleAverage: avg
        });

        if (avg > 0) {
            averagesForOverall.push(avg);
        }
    });

    // 3. Calculate overall average (average of all module averages)
    const overallAverage = averagesForOverall.length > 0
        ? parseFloat((averagesForOverall.reduce((sum, a) => sum + a, 0) / averagesForOverall.length).toFixed(2))
        : 0;

    // 4. Check failure conditions
    const hasOverallFailure = overallAverage > 0 && overallAverage < 4.0;
    const failedModules = moduleResults.filter(m => m.moduleAverage > 0 && m.moduleAverage < 4.0);
    const hasModuleFailure = failedModules.length > 0;

    const reasons = [];
    if (hasOverallFailure) reasons.push("Gesamtschnitt unter 4.0");
    if (hasModuleFailure) reasons.push("Ungenügendes Modul");
    if (hasManualFlag) reasons.push("Manuelle Markierung");

    return {
        overallAverage,
        hasOverallFailure,
        failedModules,
        hasModuleFailure,
        hasManualFlag,
        finalReexaminationRequired: hasOverallFailure || hasModuleFailure || hasManualFlag,
        reexaminationReasons: reasons
    };
}

/**
 * Promotion check based on GIBB rules.
 */
export function evaluatePromotion(evalResult) {
    // promotion_status = overallAverage >= 4.0 AND hasModuleFailure == false
    const isPromoted = evalResult.overallAverage >= 4.0 && !evalResult.hasModuleFailure;
    return {
        isPromoted,
        status: isPromoted ? "Erfüllt" : "Nicht erfüllt"
    };
}
