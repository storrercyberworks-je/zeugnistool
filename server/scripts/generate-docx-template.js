const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType } = require('docx');

const doc = new Document({
    creator: "NotenMeister",
    title: "Zeugnis Vorlage",
    description: "Template for Certificate Generation",
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "Semesterzeugnis",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Student: ", bold: true }),
                    new TextRun("{{student_first_name}} {{student_last_name}}"),
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Geburtsdatum: ", bold: true }),
                    new TextRun("{{student_birth_date}}"),
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Klasse: ", bold: true }),
                    new TextRun("{{class_name}}"),
                ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Zeitraum: ", bold: true }),
                    new TextRun("{{semester}}, {{school_year}} (Erstellt am: {{issue_date_long}})"),
                ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
                text: "Fachmodule",
                heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({ text: "{{#fachmodule}}" }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("{{module_name}}")] }),
                            new TableCell({ children: [new Paragraph("{{module_average}}")] }),
                            new TableCell({ children: [new Paragraph("{{module_predicate}}")] }),
                        ]
                    })
                ]
            }),
            new Paragraph({ text: "{{/fachmodule}}" }),
            new Paragraph({ text: "" }),
            new Paragraph({
                text: "Allgemeinbildung",
                heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({ text: "{{#allgemeinbildung}}" }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("{{module_name}}")] }),
                            new TableCell({ children: [new Paragraph("{{module_average}}")] }),
                            new TableCell({ children: [new Paragraph("{{module_predicate}}")] }),
                        ]
                    })
                ]
            }),
            new Paragraph({ text: "{{/allgemeinbildung}}" }),
            new Paragraph({ text: "" }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Notendurchschnitt: ", bold: true }),
                    new TextRun("{{average_grade}} ({{semester_predicate}})"),
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Promotion: ", bold: true }),
                    new TextRun("{{promotion_status}}"),
                ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
                children: [
                    new TextRun("Unterschriften:"),
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun("1. {{signature_1_name}}, {{signature_1_title}}"),
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun("2. {{signature_2_name}}, {{signature_2_title}}"),
                ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
                text: "{{footer_text}}",
                style: "small"
            })
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    const outDir = path.join(__dirname, '../public/templates');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(path.join(outDir, 'NotenMeister_Zeugnisvorlage.docx'), buffer);
    console.log('DOCX template generated successfully at public/templates/NotenMeister_Zeugnisvorlage.docx');
});
