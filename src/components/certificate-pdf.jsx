import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { calculateAverages, getPredicate, isPromoted } from '@/lib/grading-utils';

// Standard fonts
Font.register({
    family: 'Roboto',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
    fontWeight: 'light'
});
Font.register({
    family: 'Roboto',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
    fontWeight: 'normal'
});
Font.register({
    family: 'Roboto',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
    fontWeight: 'bold'
});


const styles = StyleSheet.create({
    page: {
        padding: 60,
        fontFamily: 'Roboto',
        fontSize: 10,
        color: '#333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        borderBottom: '1pt solid #eee',
        paddingBottom: 20,
    },
    logo: {
        width: 60,
        height: 60,
        objectFit: 'contain',
    },
    schoolInfo: {
        textAlign: 'right',
    },
    schoolName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1a365d',
        marginBottom: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: '#1a365d',
    },
    studentSection: {
        marginBottom: 30,
        padding: 15,
        backgroundColor: '#f8fafc',
        borderRadius: 4,
    },
    studentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    studentItem: {
        width: '50%',
        marginBottom: 8,
    },
    label: {
        fontSize: 8,
        color: '#64748b',
        marginBottom: 2,
    },
    value: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    table: {
        width: 'auto',
        marginBottom: 30,
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomColor: '#e2e8f0',
        borderBottomWidth: 1,
    },
    tableHeader: {
        backgroundColor: '#f1f5f9',
        fontWeight: 'bold',
    },
    tableCell: {
        borderRightColor: '#e2e8f0',
        borderRightWidth: 1,
        padding: 8,
        justifyContent: 'center',
    },
    colSubject: { width: '40%' },
    colLF: { width: '30%' },
    colGrade: { width: '15%', textAlign: 'center' },
    colWeight: { width: '15%', textAlign: 'center' },

    summaryBox: {
        marginTop: 10,
        padding: 15,
        borderTop: '1pt solid #1a365d',
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    averageText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginRight: 10,
    },
    averageValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a365d',
    },
    footer: {
        position: 'absolute',
        bottom: 60,
        left: 60,
        right: 60,
    },
    signatureRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 40,
    },
    signatureLine: {
        width: '40%',
        borderTop: '1pt solid #333',
        paddingTop: 5,
        textAlign: 'center',
    },
    footerText: {
        marginTop: 40,
        fontSize: 8,
        color: '#94a3b8',
        textAlign: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 60,
    },
    topLabel: {
        fontSize: 8,
        color: '#666',
    },
    logoContainer: {
        width: 80,
        height: 40,
    },
    logoImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    logoText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    titleSection: {
        marginBottom: 40,
    },
    mainTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    studentInfo: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    semesterInfo: {
        fontSize: 12,
        marginTop: 5,
    },
    categorySection: {
        marginBottom: 20,
    },
    categoryTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eeeeee',
        paddingBottom: 2,
    },
    gradeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    gradeText: {
        fontSize: 11,
    },
    gradeValue: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    summarySection: {
        marginTop: 20,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 5,
        marginBottom: 5,
    },
    signatureSection: {
        marginTop: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    signatureBlock: {
        width: '45%',
    },
    signatureImage: {
        width: 100,
        height: 50,
        marginBottom: 5,
        objectFit: 'contain',
    },
    signatureName: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    schoolDetail: {
        fontSize: 8,
        color: '#666',
    },
    dateSection: {
        marginTop: 40,
    },
    footerSection: {
        position: 'absolute',
        bottom: 40,
        left: 60,
        right: 60,
        borderTopWidth: 1,
        borderTopColor: '#eeeeee',
        paddingTop: 10,
    },
    legalText: {
        fontSize: 7,
        color: '#999',
        textAlign: 'center',
    },
});

export const CertificatePDF = ({ data, school, template }) => {
    const { student = {}, grades = [], subjects = [], school_year = '', semester = '' } = data || {};

    // Safety guard for react-pdf
    if (!data || !student.last_name) {
        return (
            <Document>
                <Page size="A4" style={styles.page}>
                    <Text>Warten auf Daten...</Text>
                </Page>
            </Document>
        );
    }

    const safeSchool = school || {};
    const displayMode = template?.layout_config?.display_mode || 'grade';

    // Convert Swiss rounding step (0.1, 0.01) to decimal places for toFixed
    const roundingValue = template?.layout_config?.rounding || '0.1';
    const precision = roundingValue === '0.01' ? 2 : 1;
    const roundingStep = parseFloat(roundingValue) || 0.1;

    const averages = calculateAverages(grades, precision, roundingStep);
    const average = averages.final || '-';
    const finalPredicate = getPredicate(averages.final);
    const promoted = isPromoted(averages.final);

    const categories = groupGradesByCategory(grades, subjects, precision, roundingStep);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Top Header */}
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.topLabel}>gibb | eine Institution des Kantons Bern</Text>
                    </View>
                    <View style={styles.logoContainer}>
                        {safeSchool.logo_url ? (
                            <Image src={safeSchool.logo_url} style={styles.logoImage} />
                        ) : (
                            <Text style={styles.logoText}>gibb</Text>
                        )}
                    </View>
                </View>

                {/* Title and Student Info */}
                <View style={styles.titleSection}>
                    <Text style={styles.mainTitle}>Zeugnis</Text>
                    <Text style={styles.studentInfo}>
                        {student.first_name} {student.last_name}, {student.qualifications || 'Dipl. Informatiker/in HF HF Informatik, gibb Berufsfachschule Bern'}
                    </Text>
                    <Text style={styles.semesterInfo}>{semester}</Text>
                </View>

                {/* Grade Sections */}
                {Object.entries(categories).map(([catName, items]) => (
                    items.length > 0 && (
                        <View key={catName} style={styles.categorySection}>
                            <Text style={styles.categoryTitle}>
                                {catName === 'Fachmodul' ? 'Fachmodule' : catName}
                            </Text>
                            {items.map((item, idx) => (
                                <View key={idx} style={styles.gradeRow}>
                                    <Text style={styles.gradeText}>{item.name}</Text>
                                    <Text style={styles.gradeValue}>
                                        {displayMode === 'predicate' ? item.predicate : (item.grade ? Number(item.grade).toFixed(1) : '-')}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )
                ))}

                {/* Summary */}
                <View style={styles.summarySection}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.gradeText}>Semesterprädikat:</Text>
                        <Text style={styles.gradeValue}>{finalPredicate}</Text>
                    </View>
                    <Text style={styles.gradeText}>
                        {promoted ? 'Die Promotion ist erfüllt' : 'Die Promotion ist nicht erfüllt'}
                    </Text>
                </View>

                {/* Signatures */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureBlock}>
                        {safeSchool.signature_1_url && safeSchool.signature_1_url.startsWith('http') && (
                            <Image src={safeSchool.signature_1_url} style={styles.signatureImage} />
                        )}
                        <Text style={styles.signatureName}>{safeSchool.signature_1_name || 'Ralph Maurer Abteilungsleiter'}</Text>
                        <Text style={styles.schoolDetail}>gibb Berufsfachschule Bern</Text>
                        <Text style={styles.schoolDetail}>Abteilung für Informations- und Energietechnik</Text>
                    </View>
                    <View style={styles.signatureBlock}>
                        {safeSchool.signature_2_url && safeSchool.signature_2_url.startsWith('http') && (
                            <Image src={safeSchool.signature_2_url} style={styles.signatureImage} />
                        )}
                        <Text style={styles.signatureName}>{safeSchool.signature_2_name || 'Marc Aeby Prüfungsleiter'}</Text>
                        <Text style={styles.schoolDetail}>gibb Berufsfachschule Bern</Text>
                        <Text style={styles.schoolDetail}>HF Informatik</Text>
                    </View>
                </View>

                {/* Place and Date */}
                <View style={styles.dateSection}>
                    <Text style={styles.gradeText}>
                        {safeSchool.city || 'Bern'}, {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </Text>
                </View>

                {/* Feedback Footer */}
                <View style={styles.footerSection}>
                    <Text style={styles.legalText}>
                        Rechtshinweisbelehrung: Gegen dieses Zeugnis kann innert 30 Tagen schriftlich und begründet Beschwerde beim Abteilungsleiter erhoben werden.
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
