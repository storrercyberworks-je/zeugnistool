-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "department" TEXT,
    "employee_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aktiv',
    "office_room" TEXT,
    "office_hours" TEXT,
    "qualifications" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "school_year" TEXT NOT NULL DEFAULT '2024/2025',
    "grade_level" INTEGER NOT NULL,
    "class_teacher_id" TEXT,
    "class_teacher_name" TEXT,
    "student_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "date_of_birth" TEXT,
    "student_number" TEXT,
    "address" TEXT,
    "attended_course" TEXT,
    "guardian_name" TEXT,
    "guardian_contact" TEXT,
    "remarks" TEXT,
    "birthday_email_sent_date" TEXT,
    "class_id" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'fachmodul',
    "teacher_id" TEXT,
    "teacher_name" TEXT,
    "learning_fields" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GradeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "subject_name" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "teacher_name" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "semester" TEXT NOT NULL DEFAULT '1. Halbjahr',
    "school_year" TEXT NOT NULL DEFAULT '2024/2025',
    "status" TEXT NOT NULL DEFAULT 'offen',
    "file_url" TEXT,
    "uploaded_at" TEXT,
    "notes" TEXT,
    "reminder_days" TEXT NOT NULL DEFAULT '7,3,1',
    "last_reminder_sent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "subject_name" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "teacher_name" TEXT NOT NULL,
    "grade_value" REAL NOT NULL,
    "weight" REAL,
    "learning_field_name" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "school_year" TEXT NOT NULL,
    "comment" TEXT,
    "grade_request_id" TEXT,
    "reexamination_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "file_type" TEXT NOT NULL DEFAULT 'html',
    "html_template" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "logo_url" TEXT,
    "signature_1_url" TEXT,
    "signature_1_name" TEXT,
    "signature_2_url" TEXT,
    "signature_2_name" TEXT,
    "template_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "school_year" TEXT NOT NULL,
    "issued_at" TEXT NOT NULL,
    "average_grade" REAL NOT NULL,
    "grade_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'entwurf',
    "html_snapshot" TEXT,
    "pdf_file_name" TEXT NOT NULL,
    "signature_url" TEXT,
    "signed_by" TEXT,
    "signed_at" TEXT,
    "remarks" TEXT,
    "verification_code" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SchoolProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "school_name" TEXT NOT NULL DEFAULT 'GIBB Bern',
    "unit_name" TEXT NOT NULL DEFAULT 'HF IET GIBB',
    "address_line1" TEXT,
    "address_line2" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "city" TEXT,
    "canton" TEXT,
    "logo_url" TEXT,
    "footer_text" TEXT,
    "signature_1_name" TEXT,
    "signature_1_title" TEXT,
    "signature_1_url" TEXT,
    "signature_2_name" TEXT,
    "signature_2_title" TEXT,
    "signature_2_url" TEXT,
    "default_language" TEXT NOT NULL DEFAULT 'de'
);

-- CreateTable
CREATE TABLE "ArchiveRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "school_year_from" TEXT NOT NULL,
    "school_year_to" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "counts" TEXT,
    "error" TEXT
);

-- CreateTable
CREATE TABLE "ArchiveSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "archive_run_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "original_id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Class_name_key" ON "Class"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");
