require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const xlsx = require('xlsx');
const Papa = require('papaparse');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-in-prod';

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Kein Token bereitgestellt' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token abgelaufen oder ungültig' });
        req.user = user;
        next();
    });
};

const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { PDFDocument } = require('pdf-lib');
const { buildCertificateModel, renderCertificateHTML } = require('./utils/certificate-renderer');

// Electron/Desktop Portability: Define Data Root
const isElectron = process.env.ELECTRON === 'true';
// Default to /tmp or /app/data on Linux if DATA_PATH is not set, or use project local data for dev
const defaultDataPath = process.platform === 'win32'
    ? path.join(__dirname, '../data')
    : '/app/data';

const DATA_ROOT = process.env.DATA_PATH || (isElectron ? defaultDataPath : path.join(process.cwd(), 'data'));
const UPLOADS_DIR = path.join(DATA_ROOT, 'uploads');
const FILES_DIR = path.join(DATA_ROOT, 'files');
const CERTIFICATES_DIR = path.join(FILES_DIR, 'certificates');
const TEMPLATES_DIR = path.join(FILES_DIR, 'templates');

// Ensure directories exist
[DATA_ROOT, UPLOADS_DIR, FILES_DIR, CERTIFICATES_DIR, TEMPLATES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || `file:${path.join(DATA_ROOT, 'dev.db')}`
        }
    }
});
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.url}`);
    next();
});
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/files', express.static(FILES_DIR));
app.use('/templates', express.static(path.join(__dirname, 'public/templates'))); // Built-in templates stay in app bundle

// Serve Frontend (Production Build)
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    console.log(`[INFO] Serving frontend from ${distPath}`);
}

// Multer setup for multiple destinations
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dir = UPLOADS_DIR;
        if (req.path.includes('/templates')) {
            dir = TEMPLATES_DIR;
        } else if (req.path.includes('/certificates')) {
            dir = CERTIFICATES_DIR;
        }
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// Helper: Run soffice for docx to pdf conversion
const convertDocxToPdf = async (docxPath, outputDir) => {
    return new Promise((resolve, reject) => {
        // Assume soffice is in PATH
        const cmd = `soffice --headless --convert-to pdf --outdir "${outputDir}" "${docxPath}"`;
        shell.exec(cmd, { silent: true }, (code, stdout, stderr) => {
            if (code === 0) {
                const pdfName = path.basename(docxPath, '.docx') + '.pdf';
                resolve(path.join(outputDir, pdfName));
            } else {
                reject(new Error(`LibreOffice conversion failed: ${stderr}`));
            }
        });
    });
};

// Helper: Convert HTML to PDF (Electron or Original fallback)
const pdfRequests = new Map();
if (isElectron) {
    process.on('message', (message) => {
        if (message.type === 'print-pdf-success') {
            const { resolve } = pdfRequests.get(message.id) || {};
            if (resolve) {
                resolve();
                pdfRequests.delete(message.id);
            }
        } else if (message.type === 'print-pdf-error') {
            const { reject } = pdfRequests.get(message.id) || {};
            if (reject) {
                reject(new Error(message.error));
                pdfRequests.delete(message.id);
            }
        }
    });
}

const renderHtmlToPdf = async (html, outputPath) => {
    if (isElectron && process.send) {
        return new Promise((resolve, reject) => {
            const id = randomUUID();
            pdfRequests.set(id, { resolve, reject });
            process.send({ type: 'print-pdf', html, outputPath, id });
        });
    }

    // Fallback/Legacy: Playwright (will be removed in final dist)
    try {
        const { chromium } = require('playwright');
        const browser = await chromium.launch();
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.pdf({
            path: outputPath,
            format: 'A4',
            margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
            printBackground: true
        });
        await browser.close();
    } catch (e) {
        console.error("PDF Render Failed (Playwright fallback):", e.message);
        throw e;
    }
};

const addDeveloperCreditToPdf = async (pdfPath, creditText) => {
    if (!creditText) return;
    try {
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0]; // Apply to first page or all? User says "bottom of application/PDF"

        const { width, height } = firstPage.getSize();
        firstPage.drawText(creditText, {
            x: 20,
            y: 20,
            size: 8,
            color: { type: 'RGB', red: 0.5, green: 0.5, blue: 0.5 },
            opacity: 0.7
        });

        const modifiedPdfBytes = await pdfDoc.save();
        fs.writeFileSync(pdfPath, modifiedPdfBytes);
    } catch (err) {
        console.error("Error adding developer credit to PDF:", err);
    }
};

// Helper: Generic CRUD Factory
const createRouter = (modelName) => {
    const router = express.Router();

    router.get('/', authenticateToken, async (req, res) => {
        try {
            const filters = { tenant_id: req.user.activeTenantId };
            Object.keys(req.query).forEach(key => {
                if (req.query[key]) filters[key] = req.query[key];
            });
            const items = await prisma[modelName].findMany({ where: filters });
            res.json(items);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/:id', authenticateToken, async (req, res) => {
        try {
            const items = await prisma[modelName].findMany({
                where: { id: req.params.id, tenant_id: req.user.activeTenantId }
            });
            if (items.length === 0) return res.status(404).json({ error: 'Not found' });
            res.json(items[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/', authenticateToken, async (req, res) => {
        try {
            req.body.tenant_id = req.user.activeTenantId;
            const item = await prisma[modelName].create({ data: req.body });
            res.json(item);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.put('/:id', authenticateToken, async (req, res) => {
        try {
            const item = await prisma[modelName].updateMany({
                where: { id: req.params.id, tenant_id: req.user.activeTenantId },
                data: req.body
            });
            if (item.count === 0) return res.status(404).json({ error: 'Not found or forbidden' });
            res.json({ success: true, count: item.count });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.delete('/:id', authenticateToken, async (req, res) => {
        try {
            const item = await prisma[modelName].deleteMany({
                where: { id: req.params.id, tenant_id: req.user.activeTenantId }
            });
            if (item.count === 0) return res.status(404).json({ error: 'Not found or forbidden' });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};

// DOCX Template Download
app.get('/api/templates/certificate-docx', authenticateToken, (req, res) => {
    const docxPath = path.join(__dirname, 'public/templates/NotenMeister_Zeugnisvorlage.docx');
    if (fs.existsSync(docxPath)) {
        const buffer = fs.readFileSync(docxPath);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="NotenMeister_Zeugnisvorlage.docx"');
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).send(buffer);
    } else {
        res.status(404).json({ error: 'DOCX Vorlage nicht gefunden' });
    }
});

// AUTH SYSTEM
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await prisma.user.findUnique({ where: { username } });
        
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
        }
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account ist deaktiviert' });
        }

        const access = await prisma.userTenantAccess.findMany({
            where: { user_id: user.id }
        });

        if (access.length === 0) {
            return res.status(403).json({ error: 'Keine Schulen zugewiesen' });
        }

        const tenantIds = access.map(a => a.tenant_id);
        const allowedTenants = await prisma.tenant.findMany({
            where: { id: { in: tenantIds }, is_active: true }
        });

        if (allowedTenants.length === 0) {
            return res.status(403).json({ error: 'Zugewiesene Schulen sind inaktiv' });
        }

        // Default to first active allowed tenant
        const activeTenant = allowedTenants[0];

        const payload = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            allowedTenants,
            activeTenantId: activeTenant.id
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: payload, activeTenant });
    } catch (e) {
        console.error("Login err:", e);
        res.status(500).json({ error: 'Interner Server-Fehler beim Login' });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: req.user.activeTenantId }});
        res.json({ user: req.user, activeTenant: tenant, allowedTenants: req.user.allowedTenants });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/switch-tenant', authenticateToken, async (req, res) => {
    try {
        const { tenant_id } = req.body;
        const hasAccess = req.user.allowedTenants.some(t => t.id === tenant_id);
        if (!hasAccess) return res.status(403).json({ error: 'Zugriff auf diese Schule verweigert' });

        const { exp, iat, ...userData } = req.user;
        const payload = { ...userData, activeTenantId: tenant_id };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: payload });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin User Management
app.get('/api/tenants', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const tenants = await prisma.tenant.findMany();
        res.json(tenants);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forsbidden' });
        const users = await prisma.user.findMany({
            include: { tenants: true }
        });
        // We shouldn't send password hashes to frontend
        const safeUsers = users.map(u => {
            const { password_hash, ...rest } = u;
            return rest;
        });
        res.json(safeUsers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const { username, password, full_name, role, is_active, tenant_ids } = req.body;
        
        const password_hash = await bcrypt.hash(password, 10);
        
        const newUser = await prisma.user.create({
            data: {
                username, password_hash, full_name, role, is_active,
                tenants: {
                    create: (tenant_ids || []).map(tid => ({ tenant_id: tid }))
                }
            }
        });
        res.json({ success: true, id: newUser.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const { username, password, full_name, role, is_active, tenant_ids } = req.body;
        
        const updateData = { username, full_name, role, is_active };
        if (password) {
            updateData.password_hash = await bcrypt.hash(password, 10);
        }

        await prisma.user.update({
            where: { id: req.params.id },
            data: updateData
        });

        // Update tenants
        if (tenant_ids) {
            await prisma.userTenantAccess.deleteMany({ where: { user_id: req.params.id } });
            await prisma.userTenantAccess.createMany({
                data: tenant_ids.map(tid => ({ user_id: req.params.id, tenant_id: tid }))
            });
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot delete yourself' });
        // Prisma cascade deletes aren't configured in schema for UserTenantAccess natively without relation directives, so manual delete
        await prisma.userTenantAccess.deleteMany({ where: { user_id: req.params.id } });
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Register CRUD Routes
const entities = [
    { path: 'teachers', model: 'teacher' },
    { path: 'classes', model: 'class' },
    { path: 'students', model: 'student' },
    { path: 'subjects', model: 'subject' },
    { path: 'grade-requests', model: 'gradeRequest' },
    { path: 'grades', model: 'grade' },
    { path: 'templates', model: 'certificateTemplate' },
    { path: 'certificates', model: 'certificate' },
    { path: 'archive-runs', model: 'archiveRun' },
    { path: 'archive-snapshots', model: 'archiveSnapshot' },
    { path: 'teacher-subject-assignments', model: 'teacherSubjectAssignment' },
    { path: 'class-subject-assignments', model: 'classSubjectAssignment' }
];

entities.forEach(ent => {
    app.use(`/api/${ent.path}`, createRouter(ent.model));
});

// Grade Management: Completeness Evaluation
app.get('/api/completeness', authenticateToken, async (req, res) => {
    const { classId, semester, schoolYear } = req.query;
    if (!classId) return res.status(400).json({ error: 'classId is required' });

    try {
        const students = await prisma.student.findMany({ where: { class_id: classId, tenant_id: req.user.activeTenantId } });
        const grades = await prisma.grade.findMany({
            where: {
                tenant_id: req.user.activeTenantId,
                class_id: classId,
                semester: semester || '1. Halbjahr',
                school_year: schoolYear || '2024/2025'
            }
        });

        const perStudent = {};
        students.forEach(s => {
            perStudent[s.id] = { missingModules: [], totalMissingCount: 0 };
        });

        const subjectGrades = {};
        grades.forEach(g => {
            if (!subjectGrades[g.subject_id]) subjectGrades[g.subject_id] = {};
            subjectGrades[g.subject_id][g.student_id] = (subjectGrades[g.subject_id][g.student_id] || 0) + 1;
        });

        const perSubjectExpected = {};
        for (const [subId, studentCounts] of Object.entries(subjectGrades)) {
            const counts = Object.values(studentCounts);
            if (counts.length < 2) {
                perSubjectExpected[subId] = 0;
                continue;
            }
            perSubjectExpected[subId] = Math.max(...counts);
        }

        for (const [subId, expected] of Object.entries(perSubjectExpected)) {
            if (expected === 0) continue;
            const subject = await prisma.subject.findUnique({ where: { id: subId } });
            students.forEach(s => {
                const actual = subjectGrades[subId]?.[s.id] || 0;
                if (actual < expected) {
                    perStudent[s.id].missingModules.push({
                        subject_id: subId,
                        subject_name: subject?.name || 'Unbekannt',
                        expectedCount: expected,
                        actualCount: actual,
                        missingCount: expected - actual
                    });
                    perStudent[s.id].totalMissingCount += (expected - actual);
                }
            });
        }

        res.json({ perStudent });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Special: School Profile (Single Row)
app.get('/api/school-profile', authenticateToken, async (req, res) => {
    try {
        let profile = await prisma.schoolProfile.findUnique({ where: { tenant_id: req.user.activeTenantId } });
        if (!profile) {
            profile = await prisma.schoolProfile.create({ data: { tenant_id: req.user.activeTenantId, school_name: 'GIBB Bern' } });
        }
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/school-profile', authenticateToken, async (req, res) => {
    try {
        const profile = await prisma.schoolProfile.update({
            where: { tenant_id: req.user.activeTenantId },
            data: req.body
        });
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// File Upload
app.post('/api/files/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    res.json({
        file_url: `/uploads/${req.file.filename}`,
        filename: req.file.filename
    });
});

// DOCX / PDF Template Upload
app.post('/api/templates/docx/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded.' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.docx' && ext !== '.pdf') {
        return res.status(400).json({ ok: false, error: 'Only .docx or .pdf allowed' });
    }

    res.json({
        ok: true,
        file_url: `/files/templates/${req.file.filename}`,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype
    });
});

// Data Extraction Logic
app.post('/api/files/extract', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    try {
        let data = [];
        if (ext === '.xlsx' || ext === '.xls') {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        } else if (ext === '.csv') {
            const content = fs.readFileSync(filePath, 'utf8');
            const result = Papa.parse(content, { header: true, skipEmptyLines: true });
            data = result.data;
        }

        // Return raw data rows
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        // Cleanup temp file after extraction if needed? 
        // Actually, the user wants to store it in /uploads, so we leave it.
    }
});

// Student Import Logic (Excel)
app.post('/api/students/import', authenticateToken, async (req, res) => {
    try {
        const { students, school_year } = req.body;
        const tenant_id = req.user.activeTenantId;
        const results = {
            created: 0,
            updated: 0,
            classesCreated: 0,
            classesExisting: 0,
            errors: []
        };

        const involvedClasses = new Set();
        const createdClasses = new Set();

        for (const s of students) {
            try {
                if (!s.Klasse || !s.Vorname || !s.Nachname) {
                    throw new Error('Pflichtfelder fehlen (Klasse, Vorname, Nachname)');
                }

                const className = String(s.Klasse).trim();
                if (!className) throw new Error('Klassenname ist leer');

                // Find or create class
                let targetClass = await prisma.class.findFirst({
                    where: { tenant_id, name: className, school_year: school_year || '2024/2025' }
                });

                if (!targetClass) {
                    targetClass = await prisma.class.create({
                        data: {
                            tenant_id,
                            name: className,
                            school_year: school_year || '2024/2025',
                            grade_level: 2 // Default as requested
                        }
                    });
                    results.classesCreated++;
                    createdClasses.add(targetClass.id);
                } else {
                    if (!createdClasses.has(targetClass.id) && !involvedClasses.has(targetClass.id)) {
                        results.classesExisting++;
                    }
                }

                involvedClasses.add(targetClass.id);

                // Find or create student
                const studentData = {
                    tenant_id,
                    first_name: String(s.Vorname).trim(),
                    last_name: String(s.Nachname).trim(),
                    birth_date: s.Geburtstag ? String(s.Geburtstag) : null,
                    address: s.Adresse ? String(s.Adresse) : null,
                    email_school: s['Email Schule'] || s.EmailSchule || null,
                    email_private: s['Email privat'] || s.EmailPrivat || null,
                    class_id: targetClass.id,
                    class_name: targetClass.name,
                    school_year: targetClass.school_year
                };

                const existing = await prisma.student.findFirst({
                    where: {
                        tenant_id,
                        first_name: studentData.first_name,
                        last_name: studentData.last_name,
                        class_id: targetClass.id
                    }
                });

                if (existing) {
                    await prisma.student.update({
                        where: { id: existing.id },
                        data: studentData
                    });
                    results.updated++;
                } else {
                    await prisma.student.create({ data: studentData });
                    results.created++;
                }

            } catch (err) {
                results.errors.push(`Zeile mit ${s.Vorname || 'Unbekannt'} ${s.Nachname || ''}: ${err.message}`);
            }
        }

        // Update student counts for all involved classes
        for (const classId of involvedClasses) {
            const count = await prisma.student.count({ where: { class_id: classId } });
            await prisma.class.update({
                where: { id: classId },
                data: { student_count: count }
            });
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/system/clear', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Nur Admins können das System leeren.' });
        
        const models = ['grade', 'gradeRequest', 'certificate', 'student', 'class', 'subject', 'teacher', 'certificateTemplate'];
        for (const m of models) {
            await prisma[m].deleteMany({ where: { tenant_id: req.user.activeTenantId }});
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/certificates/generate', authenticateToken, async (req, res) => {
    try {
        const tenant_id = req.user.activeTenantId;
        const { template_id, student_id, semester, school_year, issue_date } = req.body;

        const template = await prisma.certificateTemplate.findFirst({ where: { id: template_id, tenant_id } });
        const student = await prisma.student.findFirst({ where: { id: student_id, tenant_id } });
        const profile = await prisma.schoolProfile.findUnique({ where: { tenant_id } });

        if (!template) return res.status(404).json({ error: 'Template nicht gefunden' });
        if (!student) return res.status(404).json({ error: 'Schüler nicht gefunden' });

        // Fetch all grades for this student, semester, and school year
        const grades = await prisma.grade.findMany({
            where: {
                tenant_id,
                student_id: student_id,
                semester: semester || '1. Halbjahr',
                school_year: school_year || '2024/2025'
            }
        });

        // Group grades by subject
        const subjectGroups = {};
        for (const g of grades) {
            if (!subjectGroups[g.subject_id]) {
                const subject = await prisma.subject.findFirst({ where: { id: g.subject_id, tenant_id } });
                subjectGroups[g.subject_id] = {
                    subject_id: g.subject_id,
                    subject_name: subject?.name || 'Unbekannt',
                    category: subject?.category || 'fachmodul',
                    grades: [],
                    totalWeight: 0,
                    weightedSum: 0
                };
            }
            const group = subjectGroups[g.subject_id];
            group.grades.push(g);
            const weight = g.weight || 1.0;
            group.totalWeight += weight;
            group.weightedSum += (g.grade_value * weight);
        }

        // Calculate averages and group by category
        const fachmodule = [];
        const allgemeinbildung = [];
        const allProcessed = [];

        Object.values(subjectGroups).forEach(group => {
            const average = group.totalWeight > 0 ? (group.weightedSum / group.totalWeight) : 0;
            const processed = {
                name: group.subject_name,
                category: group.category,
                average: average > 0 ? average.toFixed(1) : '-',
                gradesText: group.grades.map(g => g.grade_value).join(', '),
                reexamination_required: group.grades.some(g => g.reexamination_required)
            };

            if (group.category === 'allgemeinbildung') {
                allgemeinbildung.push(processed);
            } else {
                fachmodule.push(processed);
            }
            allProcessed.push(processed);
        });

        const fileName = `certificate_${student_id}_${Date.now()}.pdf`;
        const outputPath = path.join(CERTIFICATES_DIR, fileName);

        const developerCredit = profile?.show_developer_credit_in_pdf
            ? `NotenMeister – Konzeption, Entwicklung und Design: STORRER Cyberworks & Guidance © ${new Date().getFullYear()}`
            : null;

        // Overall logic
        const moduleAverages = allProcessed.map(p => parseFloat(p.average)).filter(a => !isNaN(a) && a > 0);
        const overallAverage = moduleAverages.length > 0
            ? moduleAverages.reduce((s, a) => s + a, 0) / moduleAverages.length
            : 0;

        const hasModuleFailure = allProcessed.some(p => parseFloat(p.average) < 4.0);
        const hasManual = allProcessed.some(p => p.reexamination_required);
        const reexamRequired = (overallAverage > 0 && overallAverage < 4.0) || hasModuleFailure || hasManual;

        const data = {
            first_name: student.first_name,
            last_name: student.last_name,
            birth_date: student.birth_date,
            class_name: student.class_name,
            school_year: school_year,
            semester: semester,
            issue_date: issue_date || new Date().toISOString().split('T')[0],
            fachmodule,
            allgemeinbildung,
            school_name: profile?.school_name,
            unit_name: profile?.unit_name, ...student_data,
            ...grades_data,
            average_grade: overallAverage > 0 ? overallAverage.toFixed(1) : '-',
            promotion_status: (overallAverage >= 4.0 && !hasModuleFailure) ? 'Erfüllt' : 'Nicht erfüllt',
            reexamination_required: reexamRequired ? 'Ja' : 'Nein',
            reexamination_reason: reasons.join(', ') || '-',
            issue_date_long: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
        };

        if (template.template_type === 'builder' || template.template_type === 'guided') {
            const allRawGrades = Array.isArray(grades_data) ? grades_data : (grades_data.raw || [...(grades_data.fachmodule || []), ...(grades_data.allgemeinbildung || [])]);

            const model = buildCertificateModel(student_data, allRawGrades, [], '1. Halbjahr', '2024/2025', template);
            let html = renderCertificateHTML(template, model);

            if (developerCredit) {
                html += `
                    <div style="position: fixed; bottom: 5mm; left: 0; right: 0; text-align: center; color: #888; font-size: 8pt; font-family: sans-serif; opacity: 0.7;">
                        ${developerCredit}
                    </div>
                `;
            }

            await renderHtmlToPdf(html, outputPath);

        } else if (template.template_type === 'docx') {
            const docxContent = fs.readFileSync(path.join(__dirname, '../', template.file_url));
            const zip = new PizZip(docxContent);
            const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

            doc.render(data);
            const buf = doc.getZip().generate({ type: 'nodebuffer' });

            const tempDocxPath = path.join(CERTIFICATES_DIR, `temp_${fileName.replace('.pdf', '.docx')}`);
            fs.writeFileSync(tempDocxPath, buf);

            await convertDocxToPdf(tempDocxPath, CERTIFICATES_DIR);
            fs.unlinkSync(tempDocxPath);

            const loPdfPath = tempDocxPath.replace('.docx', '.pdf');
            if (fs.existsSync(loPdfPath)) {
                fs.renameSync(loPdfPath, outputPath);
            }

            if (developerCredit) {
                await addDeveloperCreditToPdf(outputPath, developerCredit);
            }

        } else if (template.template_type === 'pdf_form') {
            const pdfBytes = fs.readFileSync(path.join(__dirname, '../', template.file_url));
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const form = pdfDoc.getForm();

            const mappings = typeof template.mapping_config === 'string' ? JSON.parse(template.mapping_config) : (template.mapping_config || {});

            Object.entries(mappings).forEach(([pdfField, sysField]) => {
                const field = form.getField(pdfField);
                if (field) {
                    field.setText(String(data[sysField] || ''));
                }
            });

            form.flatten();
            const resultBytes = await pdfDoc.save();
            fs.writeFileSync(outputPath, resultBytes);

            if (developerCredit) {
                await addDeveloperCreditToPdf(outputPath, developerCredit);
            }
        }

        res.json({
            success: true,
            file_url: `/files/certificates/${fileName}`,
            file_name: fileName
        });

    } catch (error) {
        console.error('Generation Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Catch-all for SPA
app.get(/.*/, (req, res) => {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // Only return 404 if it's not an API call (API calls should have matched previous routes)
        if (!req.path.startsWith('/api')) {
            res.status(404).send('Frontend not built. Run npm run build.');
        }
    }
});

// SPA Catch-all: If no API route matches, and it's not a file, serve index.html
app.get(/^(?!\/(api|uploads|templates)).*$/, (req, res) => {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend not built or index.html missing');
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`[ENV] Mode: ${isElectron ? 'Desktop/Electron' : 'Web/Standard'}`);
    console.log(`[DATA] Root: ${DATA_ROOT}`);
});
