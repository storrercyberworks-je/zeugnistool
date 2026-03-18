const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const data = [
    {
        'Vorname': 'Max',
        'Nachname': 'Mustermann',
        'Klasse': 'IET-2a',
        'Geburtstag': '2005-05-15',
        'Adresse': 'Musterstrasse 1, 3000 Bern',
        'Email Schule': 'max.mustermann@gibb.ch',
        'Email privat': 'max.m@me.com'
    },
    {
        'Vorname': 'Erika',
        'Nachname': 'Musterfrau',
        'Klasse': 'IET-2a',
        'Geburtstag': '2006-02-20',
        'Adresse': 'Bahnhofplatz 5, 3011 Bern',
        'Email Schule': 'erika.musterfrau@gibb.ch',
        'Email privat': 'erika.f@gmail.com'
    }
];

const targetPath = 'C:\\CODE\\zeugnis\\server\\public\\templates\\vorlage_schuelerimport.xlsx';
const targetDir = path.dirname(targetPath);

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Schüler');

xlsx.writeFile(wb, targetPath);
console.log('Template generated at:', targetPath);
