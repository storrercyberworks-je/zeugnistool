const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const outputDir = path.join(__dirname, '../public/templates');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const headers = [
    'Name Student',
    'Vorname Student',
    'Email Student',
    'Geburtsdatum',
    'Adresse Student',
    'Klasse',
    'Dozent Name/Vorname',
    'Dozent Email',
    'Modul',
    'Besuchter Kurs',
    'Bemerkungen',
    'Note 1 / Lernfeld 1',
    'Gewichtung Lernfeld 1',
    'Name Lernfeld 1',
    'Note 2 / Lernfeld 2',
    'Gewichtung Lernfeld 2',
    'Name Lernfeld 2',
    'Note 3 / Lernfeld 3',
    'Gewichtung Lernfeld 3',
    'Name Lernfeld 3',
    'Note 4 / Lernfeld 4',
    'Gewichtung Lernfeld 4',
    'Name Lernfeld 4'
];

// 1. Create Empty Template
const templateData = [headers];
const templateWS = XLSX.utils.aoa_to_sheet(templateData);
const templateWB = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(templateWB, templateWS, 'Notenupload');
XLSX.writeFile(templateWB, path.join(outputDir, 'vorlage_notenupload.xlsx'));

// 2. Create Filled Example
const exampleData = [
    headers,
    [
        'Muster', 'Max', 'max.muster@student.gibb.ch', '01.01.2005', 'Musterstrasse 1, 3000 Bern',
        'IET-2A', 'Dr. Schmidt', 'hans.schmidt@gibb.ch', 'Modul 123', 'Informatik Grundlagen',
        'Sehr engagiert', '5.5', '40', 'Programmierung', '6.0', '60', 'Datenbanken', '', '', '', '', '', ''
    ],
    [
        'Tester', 'Anna', 'anna.tester@student.gibb.ch', '15.05.2004', 'Testweg 5, 3012 Bern',
        'IET-2A', 'Dr. Schmidt', 'hans.schmidt@gibb.ch', 'Modul 123', 'Informatik Grundlagen',
        '', '4.0', '50', 'Netzwerktechnik', '4.5', '50', 'Security', '', '', '', '', '', ''
    ]
];
const exampleWS = XLSX.utils.aoa_to_sheet(exampleData);
const exampleWB = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(exampleWB, exampleWS, 'Notenupload (Beispiel)');
XLSX.writeFile(exampleWB, path.join(outputDir, 'beispiel_notenupload_iet-2a_modul.xlsx'));

console.log('Templates generated successfully in:', outputDir);
