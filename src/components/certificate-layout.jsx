import React from 'react';
import { groupGradesByCategory, calculateAverages, getPredicate } from '@/lib/grading-utils';

export const CertificateLayout = React.forwardRef(({
    student,
    grades,
    subjects,
    template,
    schoolProfile
}, ref) => {

    const safeTemplate = template || {};
    const rounding = safeTemplate.rounding || "0.1";
    const title = safeTemplate.title || "Semesterzeugnis";
    const subtitle = safeTemplate.subtitle;
    const introText = safeTemplate.intro_text;
    const footerText = safeTemplate.footer_text || schoolProfile?.footer_text;
    
    // Group grades
    const categories = groupGradesByCategory(grades, subjects || [], 1, parseFloat(rounding) || 0.1);
    
    // Calculate global average
    const globalAvg = calculateAverages(grades, 1, parseFloat(rounding) || 0.1).final;
    const globalPredicate = getPredicate(globalAvg);

    // Format dates safely
    const issueDate = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const birthDate = student?.birth_date ? student.birth_date : ''; // Assume string like "12.05.2001" or parseable

    // Logo logic (prefer template logo over school profile logo if available)
    const logoSrc = safeTemplate.logo_url || schoolProfile?.logo_url;

    const renderTable = (title, items) => {
        if (!items || items.length === 0) return null;
        return (
            <div className="mb-6 w-full">
                <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase tracking-wider text-gray-800">{title}</h3>
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="py-2 text-gray-600 font-semibold w-2/3">Bezeichnung</th>
                            {safeTemplate.show_weights && <th className="py-2 text-gray-600 font-semibold text-center">Gew.</th>}
                            <th className="py-2 text-gray-600 font-semibold text-right">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100 last:border-0 h-8">
                                <td className="py-1 align-middle">{item.name}</td>
                                {safeTemplate.show_weights && <td className="py-1 align-middle text-center text-gray-500">—</td>}
                                <td className="py-1 align-middle text-right font-bold tabular-nums">
                                    {item.grade ? Number(item.grade).toFixed(1) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div ref={ref} className="bg-white text-gray-900 w-[210mm] min-h-[297mm] p-[20mm] mx-auto shadow-md box-border overflow-hidden relative font-sans print:shadow-none print:p-0 print:w-full print:m-0">
            {/* Header */}
            <div className="flex justify-between items-start mb-12">
                <div className="flex items-center">
                    {safeTemplate.show_logo && logoSrc && (
                        <img src={logoSrc} alt="School Logo" className="max-h-20 max-w-[200px] object-contain object-left" />
                    )}
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-800">{schoolProfile?.school_name || 'Berufsschule'}</h2>
                    <p className="text-sm text-gray-500">{schoolProfile?.unit_name || ''}</p>
                    {schoolProfile?.city && <p className="text-sm text-gray-500">{schoolProfile.city}</p>}
                </div>
            </div>

            {/* Title Block */}
            <div className="text-center mb-10">
                <h1 className="text-4xl font-black uppercase tracking-tight text-gray-900 mb-2">{title}</h1>
                {subtitle && <h3 className="text-xl text-gray-600">{subtitle}</h3>}
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-10 text-base">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-gray-500 font-medium w-1/3">Name</span>
                    <span className="font-bold text-right w-2/3">{student?.last_name || ''}, {student?.first_name || ''}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-gray-500 font-medium w-1/3">Klasse</span>
                    <span className="font-bold text-right w-2/3">{student?.class_name || ''}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-gray-500 font-medium w-1/3">Geburtsdatum</span>
                    <span className="font-bold text-right w-2/3">{birthDate}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-gray-500 font-medium w-1/3">Semester</span>
                    <span className="font-bold text-right w-2/3">{student?.semester || '1. Halbjahr'} {student?.school_year || ''}</span>
                </div>
                {introText && (
                    <div className="col-span-2 mt-4 text-gray-700 leading-relaxed italic">
                        {introText}
                    </div>
                )}
            </div>

            {/* Tables Container */}
            <div className="space-y-4 mb-8">
                {renderTable('Fachmodule', categories['Fachmodul'])}
                {renderTable('Allgemeinbildung', categories['Allgemeinbildung'])}
                {renderTable('Weitere Fächer', categories['Andere'])}
            </div>

            {/* Summary */}
            <div className="w-full bg-gray-50 border border-gray-200 rounded p-6 mb-16 break-inside-avoid">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Gewichteter Durchschnitt</p>
                        <p className="text-3xl font-black text-gray-900">{globalAvg ? Number(globalAvg).toFixed(2) : '-'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Prädikat</p>
                        <p className="text-xl font-bold text-gray-800 mt-2">{globalPredicate}</p>
                    </div>
                </div>
            </div>

            {/* Signatures */}
            {(safeTemplate.show_signature_1 || safeTemplate.show_signature_2) && (
                <div className="flex justify-between items-end mt-16 break-inside-avoid px-4">
                    {safeTemplate.show_signature_1 && (
                        <div className="text-center w-64">
                            {safeTemplate.signature_1_url ? (
                                <img src={safeTemplate.signature_1_url} alt="Signature 1" className="h-16 mx-auto mb-2 object-contain" />
                            ) : (
                                <div className="h-16 border-b border-dashed border-gray-300 w-48 mx-auto mb-2"></div>
                            )}
                            <div className="border-t border-gray-800 pt-2 font-bold text-sm">{safeTemplate.signature_1_name || 'Lehrperson / Schulleitung'}</div>
                            <div className="text-xs text-gray-500">{safeTemplate.signature_1_title || 'Unterschrift'}</div>
                        </div>
                    )}
                    
                    {/* Datum in the middle or left out if signatures exist */}
                    {!safeTemplate.show_signature_2 && safeTemplate.show_signature_1 ? (
                        <div className="text-sm text-gray-500 pb-2">Bern, {issueDate}</div>
                    ) : null}

                    {safeTemplate.show_signature_2 && (
                        <div className="text-center w-64">
                            {safeTemplate.signature_2_url ? (
                                <img src={safeTemplate.signature_2_url} alt="Signature 2" className="h-16 mx-auto mb-2 object-contain" />
                            ) : (
                                <div className="h-16 border-b border-dashed border-gray-300 w-48 mx-auto mb-2"></div>
                            )}
                            <div className="border-t border-gray-800 pt-2 font-bold text-sm">{safeTemplate.signature_2_name || 'Abteilungsleitung'}</div>
                            <div className="text-xs text-gray-500">{safeTemplate.signature_2_title || 'Unterschrift'}</div>
                        </div>
                    )}
                </div>
            )}
            
            {/* If no signatures are shown, just show the issue date */}
            {!safeTemplate.show_signature_1 && !safeTemplate.show_signature_2 && (
                <div className="mt-16 pt-8 text-sm text-gray-500">
                    Ausstellungsdatum: {issueDate}
                </div>
            )}

            {/* Footer */}
            {footerText && (
                <div className="absolute bottom-[10mm] left-[20mm] right-[20mm] text-center text-xs text-gray-400 border-t border-gray-200 pt-2">
                    {footerText}
                </div>
            )}
        </div>
    );
});

CertificateLayout.displayName = 'CertificateLayout';
