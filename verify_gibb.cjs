const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const API_BASE = 'http://localhost:3001/api';

async function api(path, method = 'GET', data = null) {
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: data ? { 'Content-Type': 'application/json' } : {},
        body: data ? JSON.stringify(data) : null
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown' }));
        throw new Error(`API Error ${res.status}: ${JSON.stringify(err)}`);
    }
    return res.json();
}

function normalizeHeader(s) {
    if (!s) return "";
    return String(s)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9]/g, "");
}

function processDate(str) {
    if (!str) return null;
    let s = String(str).trim();
    const dotted = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotted) {
        return `${dotted[3]}-${dotted[2].padStart(2, '0')}-${dotted[1].padStart(2, '0')}`;
    }
    return s.includes('-') ? s : null;
}

async function runTest() {
    console.log("Starting GIBB Import Acceptance Test...");

    const csvContent = fs.readFileSync('C:/CODE/zeugnis/test_import_gibb.csv', 'utf8');
    const { data: rows } = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

    if (rows.length === 0) throw new Error("No rows found in CSV");

    const headerKeys = Object.keys(rows[0]);
    const headerMap = {};
    headerKeys.forEach(h => headerMap[normalizeHeader(h)] = h);
    const getOrig = (norm) => headerMap[norm];

    const defaultYear = "2024/2025";
    const defaultSemester = "1. Halbjahr";

    let createdGrades = 0;
    let updatedGrades = 0;

    for (const row of rows) {
        const sEmail = (row[getOrig('emailstudent')] || "").toLowerCase().trim();
        const mName = (row[getOrig('modul')] || "").trim();
        const cName = (row[getOrig('klasse')] || "").trim();

        if (!sEmail || !mName || !cName) continue;

        // 1. Class
        const classes = await api('/classes');
        let cls = classes.find(c => c.name.toLowerCase() === cName.toLowerCase());
        if (!cls) {
            cls = await api('/classes', 'POST', { name: cName, grade_level: 1, school_year: defaultYear });
            console.log(`+ Created Class: ${cName}`);
        }

        // 2. Teacher
        const tEmail = (row[getOrig('dozentemail')] || "").toLowerCase().trim();
        const tNameRaw = row[getOrig('dozentnamevorname')] || "";
        const teachers = await api('/teachers');
        let teacher = teachers.find(t => t.email.toLowerCase() === tEmail);
        if (tEmail && !teacher) {
            const parts = tNameRaw.split(' ');
            teacher = await api('/teachers', 'POST', {
                email: tEmail,
                last_name: parts[0] || "Unbekannt",
                first_name: parts.slice(1).join(' ') || "Dozent"
            });
            console.log(`+ Created Teacher: ${tEmail}`);
        }

        // 3. Subject
        const subjects = await api('/subjects');
        let subject = subjects.find(s => s.name.toLowerCase() === mName.toLowerCase());
        if (!subject) {
            subject = await api('/subjects', 'POST', {
                name: mName,
                short_name: mName.substring(0, 3).toUpperCase(),
                teacher_id: teacher?.id,
                teacher_name: tNameRaw
            });
            console.log(`+ Created Subject: ${mName}`);
        }

        // 4. Student
        const students = await api('/students');
        let student = students.find(s => s.email.toLowerCase() === sEmail);
        const studentPayload = {
            email: sEmail,
            first_name: row[getOrig('vornamestudent')] || "",
            last_name: row[getOrig('namestudent')] || "",
            class_id: cls.id,
            class_name: cls.name,
            address: row[getOrig('adressestudent')] || "",
            date_of_birth: processDate(row[getOrig('geburtsdatum')])
        };
        if (!student) {
            student = await api('/students', 'POST', studentPayload);
            console.log(`+ Created Student: ${sEmail}`);
        } else {
            // Fix: call PUT /api/students/:id
            await fetch(`${API_BASE}/students/${student.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentPayload)
            });
        }

        // 5. Grades
        const allGrades = await api('/grades');
        for (let n = 1; n <= 4; n++) {
            const valChar = row[getOrig(`note${n}lernfeld${n}`)];
            if (!valChar) continue;
            const val = parseFloat(String(valChar).replace(',', '.'));
            if (isNaN(val)) continue;

            const lfName = row[getOrig(`namelernfeld${n}`)] || row[getOrig(`namelernfeld${n}optional`)] || `Lernfeld ${n}`;
            const weight = row[getOrig(`gewichtunglernfeld${n}`)] ? parseFloat(String(row[getOrig(`gewichtunglernfeld${n}`)]).replace(',', '.')) : null;

            const existing = allGrades.find(g =>
                g.student_id === student.id &&
                g.subject_id === subject.id &&
                g.semester === defaultSemester &&
                g.school_year === defaultYear &&
                g.learning_field_name === lfName
            );

            const gradePayload = {
                student_id: student.id,
                student_name: `${student.first_name} ${student.last_name}`,
                class_id: cls.id,
                class_name: cls.name,
                subject_id: subject.id,
                subject_name: subject.name,
                teacher_id: teacher?.id || '',
                teacher_name: tNameRaw || '',
                grade_value: val,
                weight: isNaN(weight) ? null : weight,
                learning_field_name: lfName,
                semester: defaultSemester,
                school_year: defaultYear
            };

            if (existing) {
                await fetch(`${API_BASE}/grades/${existing.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(gradePayload)
                });
                updatedGrades++;
            } else {
                await api('/grades', 'POST', gradePayload);
                createdGrades++;
            }
        }
    }

    console.log("\nResults:");
    console.log(`Grades Created: ${createdGrades}`);
    console.log(`Grades Updated: ${updatedGrades}`);

    // Final check: List all grades
    const finalGrades = await api('/grades');
    console.log("\nSample Grades in DB:");
    finalGrades.slice(-5).forEach(g => {
        console.log(`- ${g.student_name}: ${g.subject_name} (${g.learning_field_name}) = ${g.grade_value}`);
    });
}

runTest().catch(console.error);
