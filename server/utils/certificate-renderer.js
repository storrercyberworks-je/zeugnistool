function calculateAverages(grades, precision = 1) {
    if (!grades || grades.length === 0) return { final: null };
    let totalWeighted = 0, totalWeights = 0, totalSimple = 0, count = 0;
    grades.forEach(g => {
        const val = parseFloat(g.grade_value || g.grade);
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
    if (rawFinal === null) return { final: null };

    return { final: parseFloat(rawFinal.toFixed(precision)) };
}

function getPredicate(grade) {
    if (!grade || isNaN(grade)) return '-';
    if (grade >= 5.75) return 'Hervorragend';
    if (grade >= 5.25) return 'Sehr gut';
    if (grade >= 4.75) return 'Gut';
    if (grade >= 4.25) return 'Befriedigend';
    if (grade >= 3.95) return 'Genügend';
    return 'Ungenügend';
}

function buildCertificateModel(student, grades = [], subjects = [], semester = '1. Halbjahr', schoolYear = '2024/2025', template = {}) {
    if (!student) student = { first_name: 'Muster', last_name: 'Student', class_name: 'Beispielklasse' };

    const studentGrades = grades.filter(g =>
        (!semester || g.semester === semester) &&
        (!schoolYear || g.school_year === schoolYear) &&
        (!student.id || g.student_id === student.id)
    );

    const subjectMap = new Map((subjects || []).map(s => [s.id || s.name, s]));
    const gradesBySubject = {};
    studentGrades.forEach(g => {
        const subKey = g.subject_id || g.subject_name;
        if (!gradesBySubject[subKey]) gradesBySubject[subKey] = [];
        gradesBySubject[subKey].push(g);
    });

    const precision = template.layout_config?.rounding === '0.01' ? 2 : 1;

    let fachmoduleRows = [];
    let allgemeinbildungRows = [];

    Object.entries(gradesBySubject).forEach(([subKey, sg]) => {
        const sub = subjectMap.get(subKey) || subjectMap.get(sg[0].subject_id);
        const avg = calculateAverages(sg, precision).final;
        const row = {
            module_name: sg[0].subject_name,
            module_average: avg !== null ? avg.toFixed(precision) : '-',
            module_predicate: avg !== null ? getPredicate(avg) : '-'
        };
        const cat = sub?.category?.toLowerCase() || 'fachmodul';
        if (cat === 'allgemeinbildung') allgemeinbildungRows.push(row);
        else fachmoduleRows.push(row);
    });

    if (fachmoduleRows.length === 0 && allgemeinbildungRows.length === 0 && !student.id) {
        fachmoduleRows.push({ module_name: 'Beispielmodul 1', module_average: '5.5', module_predicate: 'Sehr gut' });
        fachmoduleRows.push({ module_name: 'Beispielmodul 2', module_average: '4.0', module_predicate: 'Genügend' });
        allgemeinbildungRows.push({ module_name: 'ABU', module_average: '5.0', module_predicate: 'Gut' });
    }

    const hasManual = studentGrades.some(g => g.reexamination_required);
    const moduleAverages = [...fachmoduleRows, ...allgemeinbildungRows].map(r => parseFloat(r.module_average)).filter(a => !isNaN(a));
    const overallAverage = moduleAverages.length > 0 ? moduleAverages.reduce((s, a) => s + a, 0) / moduleAverages.length : 0;
    const roundedAvg = overallAverage > 0 ? parseFloat(overallAverage.toFixed(precision)) : (student.id ? 0 : 4.8);

    const hasOverallFailure = roundedAvg > 0 && roundedAvg < 4.0;
    const hasModuleFailure = moduleAverages.some(a => a > 0 && a < 4.0);
    const isPromoted = roundedAvg >= 4.0 && !hasModuleFailure;

    const scalarFields = {
        student_first_name: student.first_name || '',
        student_last_name: student.last_name || '',
        student_birth_date: student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('de-DE') : '01.01.2000',
        class_name: student.class_name || 'Beispielklasse',
        semester: semester || '',
        school_year: schoolYear || '',
        issue_date_long: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }),
        average_grade: roundedAvg > 0 ? roundedAvg.toFixed(precision) : '-',
        semester_predicate: roundedAvg > 0 ? getPredicate(roundedAvg) : '-',
        promotion_status: isPromoted ? 'Erfüllt' : 'Nicht erfüllt',
        signature_1_name: template.assets_config?.signatures?.[0]?.name || template.signature_1_name || '',
        signature_1_title: template.assets_config?.signatures?.[0]?.title || '',
        signature_2_name: template.assets_config?.signatures?.[1]?.name || template.signature_2_name || '',
        signature_2_title: template.assets_config?.signatures?.[1]?.title || '',
        footer_text: template.content_config?.footer_text || '',
    };

    return {
        scalarFields,
        fachmoduleRows,
        allgemeinbildungRows,
        summary: {
            average: roundedAvg,
            isPromoted,
            hasManualReexam: hasManual
        }
    };
}

const SECTIONS = {
    HEADER: 'header', TITLE: 'title', STUDENT: 'student',
    TABLE_F: 'table_f', TABLE_A: 'table_a', SUMMARY: 'summary',
    SIGNATURES: 'signatures', FOOTER: 'footer'
};

function renderCertificateHTML(template, model) {
    if (!template) return '';
    const { layout_config = {}, content_config = {}, assets_config = {} } = template;
    const { scalarFields, fachmoduleRows, allgemeinbildungRows } = model;

    let html = '';

    if (template.template_type === 'builder' || template.template_type === 'guided') {
        const sections = layout_config.sections || [];

        const renderTable = (config, rows, title) => {
            if (!rows || rows.length === 0) return `<div style="margin-bottom: 10mm;"><h3 style="font-size: 10pt; text-transform: uppercase; letter-spacing: 0.5pt; color: #000; margin-bottom: 3mm; border-bottom: 1pt solid #eee; padding-bottom: 1mm;">${title}</h3><p style="font-size: 9pt; color: #000;">Keine Daten vorhanden.</p></div>`;
            const cols = config.columns || {};
            const rowHtml = rows.map(r => `
                <tr style="${config.zebra ? 'background: #fff;' : ''} border-bottom: 0.5pt solid #f3f4f6;">
                    ${cols.module !== false ? `<td style="padding: 2mm;">${r.module_name || ''}</td>` : ''}
                    ${cols.grade !== false ? `<td style="padding: 2mm; text-align: right; font-weight: bold;">${r.module_average || ''}</td>` : ''}
                    ${cols.predicate !== false ? `<td style="padding: 2mm; text-align: right; font-style: italic;">${r.module_predicate || ''}</td>` : ''}
                </tr>
            `).join('');

            return `<div style="margin-bottom: 10mm;">
                <h3 style="font-size: 10pt; text-transform: uppercase; letter-spacing: 0.5pt; color: #000; margin-bottom: 3mm; border-bottom: 1pt solid #eee; padding-bottom: 1mm;">${title}</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                    <thead>
                        <tr style="text-align: left; background: #f3f4f6;">
                            ${cols.module !== false ? '<th style="padding: 2mm; border-bottom: 1pt solid #ddd;">Modul</th>' : ''}
                            ${cols.grade !== false ? '<th style="padding: 2mm; text-align: right; border-bottom: 1pt solid #ddd;">Note</th>' : ''}
                            ${cols.predicate !== false ? '<th style="padding: 2mm; text-align: right; border-bottom: 1pt solid #ddd;">Prädikat</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${rowHtml}
                    </tbody>
                </table>
            </div>`;
        };

        sections.forEach(sec => {
            if (!sec.active) return;
            switch (sec.type) {
                case SECTIONS.HEADER:
                    html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20mm;">
                        <div style="font-size: 8pt; text-transform: uppercase; color: #000;">${content_config.header_text || ''}</div>
                        ${assets_config.logo_url ? `<img src="${assets_config.logo_url}" style="height: 12mm; object-fit: contain;" />` : ''}
                    </div>`;
                    break;
                case SECTIONS.TITLE:
                    html += `<h1 style="font-size: 24pt; font-weight: bold; margin-bottom: 10mm; font-family: sans-serif;">${content_config.title_text || 'Zeugnis'}</h1>`;
                    break;
                case SECTIONS.STUDENT:
                    const name = scalarFields.student_first_name ? `${scalarFields.student_first_name} ${scalarFields.student_last_name}` : 'Muster-Student';
                    html += `<div style="margin-bottom: 15mm; font-size: 11pt; line-height: 1.6; color: #000;">
                        <p><strong>${name}</strong></p>
                        <p>${scalarFields.class_name || 'Klasse'}</p>
                        <p style="color: #000;">${scalarFields.semester || ''} ${scalarFields.school_year || ''}</p>
                    </div>`;
                    break;
                case SECTIONS.TABLE_F:
                    html += renderTable(layout_config.table_f || {}, fachmoduleRows, 'Fachmodule');
                    break;
                case SECTIONS.TABLE_A:
                    html += renderTable(layout_config.table_a || {}, allgemeinbildungRows, 'Allgemeinbildung');
                    break;
                case SECTIONS.SUMMARY:
                    html += `<div style="margin-top: 10mm; padding: 5mm; background: #f9fafb; border-radius: 2mm; color: #000;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: bold;">Notendurchschnitt:</span>
                            <span style="font-size: 14pt; color: #000;">${scalarFields.average_grade || '-'}</span>
                        </div>
                        <div style="margin-top: 2mm; font-size: 9pt; color: #000;">Prädikat: ${scalarFields.semester_predicate || '-'}</div>
                    </div>`;
                    break;
                case SECTIONS.SIGNATURES:
                    html += `<div style="display: flex; justify-content: space-between; margin-top: 25mm;">
                        ${(assets_config.signatures || []).map((sig, i) => `
                            <div style="width: 30%; border-top: 0.5pt solid #ccc; padding-top: 3mm;">
                                ${assets_config[`signature_${i + 1}_url`] ? `<img src="${assets_config[`signature_${i + 1}_url`]}" style="height: 10mm; display: block; margin-bottom: 2mm;" />` : '<div style="height: 10mm;"></div>'}
                                <div style="font-weight: bold; font-size: 9pt; color: #000;">${sig.name || ''}</div>
                                <div style="font-size: 7pt; color: #000;">${sig.title || ''}</div>
                            </div>
                        `).join('')}
                    </div>`;
                    break;
                case SECTIONS.FOOTER:
                    html += `<div style="position: absolute; bottom: 20mm; left: 20mm; right: 20mm; font-size: 7pt; color: #000; text-align: center; border-top: 0.2pt solid #eee; padding-top: 5mm;">
                        ${content_config.footer_text || ''}
                    </div>`;
                    break;
            }
        });

    } else {
        html = template.html_template || '';
        Object.entries(scalarFields).forEach(([k, v]) => {
            html = html.replace(new RegExp(`{{${k}}}`, 'gi'), v !== null && v !== undefined ? v : '');
        });

        const renderLegacyRows = (items) => (items || []).map(item => `
            <tr style="border-bottom: 0.5pt solid #f3f4f6;">
                <td style="padding: 2mm;">${item.module_name || ''}</td>
                <td style="padding: 2mm; text-align: right; font-weight: bold;">${item.module_average || ''}</td>
                <td style="padding: 2mm; text-align: right; font-style: italic;">${item.module_predicate || ''}</td>
            </tr>
        `).join('');

        html = html.replace(/{{#fachmodule}}[\s\S]*?{{\/fachmodule}}/gi, renderLegacyRows(fachmoduleRows));
        html = html.replace(/{{#allgemeinbildung}}[\s\S]*?{{\/allgemeinbildung}}/gi, renderLegacyRows(allgemeinbildungRows));

        // Final cleanup of any remaining curly braces
        html = html.replace(/{{[#/]?[a-zA-Z0-9_]+}}/g, '');
    }

    return `<div style="color: #000; font-family: sans-serif;">${html}</div>`;
}

module.exports = {
    calculateAverages,
    getPredicate,
    buildCertificateModel,
    renderCertificateHTML
};
