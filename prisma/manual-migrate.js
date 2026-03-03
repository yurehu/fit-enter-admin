// Raw SQLite DB creation script (no Prisma dependency)
// Node.js v22+ の built-in sqlite モジュールを使用

const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "dev.db");
const db = new DatabaseSync(dbPath);

console.log("🗄️  SQLite データベースを作成中...");
console.log(`   Path: ${dbPath}\n`);

// WAL モード（パフォーマンス向上）
db.exec("PRAGMA journal_mode=WAL");

// テーブル作成
db.exec(`
    CREATE TABLE IF NOT EXISTS "Student" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "grade" TEXT NOT NULL,
        "parentEmail" TEXT NOT NULL,
        "qrToken" TEXT NOT NULL,
        "schoolId" TEXT,
        "targetSchools" TEXT,
        "lineUserId" TEXT,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Student_qrToken_key" ON "Student"("qrToken");
    CREATE INDEX IF NOT EXISTS "Student_schoolId_idx" ON "Student"("schoolId");
`);
console.log("  ✅ Student");

db.exec(`
    CREATE TABLE IF NOT EXISTS "Attendance" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "Attendance_studentId_idx" ON "Attendance"("studentId");
    CREATE INDEX IF NOT EXISTS "Attendance_timestamp_idx" ON "Attendance"("timestamp");
`);
console.log("  ✅ Attendance");

db.exec(`
    CREATE TABLE IF NOT EXISTS "Admin" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "pin" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key" ON "Admin"("email");
`);
console.log("  ✅ Admin");

db.exec(`
    CREATE TABLE IF NOT EXISTS "WeeklyClass" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "weekday" INTEGER NOT NULL,
        "startTime" TEXT NOT NULL,
        "endTime" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
`);
console.log("  ✅ WeeklyClass");

db.exec(`
    CREATE TABLE IF NOT EXISTS "ClassEnrollment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "weeklyClassId" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        CONSTRAINT "ClassEnrollment_weeklyClassId_fkey" FOREIGN KEY ("weeklyClassId") REFERENCES "WeeklyClass"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "ClassEnrollment_weeklyClassId_studentId_key" ON "ClassEnrollment"("weeklyClassId", "studentId");
`);
console.log("  ✅ ClassEnrollment");

db.exec(`
    CREATE TABLE IF NOT EXISTS "ClassAttendance" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "weeklyClassId" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "date" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'present',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ClassAttendance_weeklyClassId_fkey" FOREIGN KEY ("weeklyClassId") REFERENCES "WeeklyClass"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ClassAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "ClassAttendance_weeklyClassId_studentId_date_key" ON "ClassAttendance"("weeklyClassId", "studentId", "date");
`);
console.log("  ✅ ClassAttendance");

db.exec(`
    CREATE TABLE IF NOT EXISTS "School" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "School_name_key" ON "School"("name");
`);
console.log("  ✅ School");

db.exec(`
    CREATE TABLE IF NOT EXISTS "ExamResult" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentId" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "score" INTEGER NOT NULL,
        "maxScore" INTEGER NOT NULL DEFAULT 100,
        "examName" TEXT NOT NULL,
        "examDate" TEXT NOT NULL,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "ExamResult_studentId_idx" ON "ExamResult"("studentId");
    CREATE INDEX IF NOT EXISTS "ExamResult_examDate_idx" ON "ExamResult"("examDate");
`);
console.log("  ✅ ExamResult");

db.exec(`
    CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "action" TEXT NOT NULL,
        "adminId" TEXT,
        "adminEmail" TEXT,
        "targetId" TEXT,
        "detail" TEXT,
        "ip" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
    CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
`);
console.log("  ✅ AuditLog");

// Prisma の内部テーブル
db.exec(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "checksum" TEXT NOT NULL,
        "finished_at" DATETIME,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT,
        "rolled_back_at" DATETIME,
        "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
`);

// 管理者アカウントを作成
const email = process.env.ADMIN_EMAIL || "admin@example.com";
const password = process.env.ADMIN_PASSWORD || "password123";

const existingAdmin = db.prepare(`SELECT id FROM "Admin" WHERE email = ?`).get(email);

if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync(password, 12);
    const adminId = "cm" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 10);

    db.prepare(`INSERT INTO "Admin" (id, email, password) VALUES (?, ?, ?)`).run(adminId, email, hashedPassword);
    console.log(`\n👤 管理者アカウントを作成: ${email}`);
} else {
    console.log(`\n👤 管理者アカウント既存: ${email}`);
}

// サンプル学校データ
const sampleSchools = [
    { name: "松山東高校", type: "高校" },
    { name: "松山南高校", type: "高校" },
    { name: "愛光高校", type: "高校" },
    { name: "松山北高校", type: "高校" },
    { name: "済美高校", type: "高校" },
    { name: "松山市立雄新中学校", type: "中学校" },
    { name: "松山市立南中学校", type: "中学校" },
    { name: "松山市立東中学校", type: "中学校" },
];

console.log("\n🏫 学校マスタを登録中...");
const insertSchool = db.prepare(`INSERT OR IGNORE INTO "School" (id, name, type) VALUES (?, ?, ?)`);
for (const school of sampleSchools) {
    const id = "cm" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 10);
    insertSchool.run(id, school.name, school.type);
}
console.log(`  ✅ ${sampleSchools.length} 校を登録`);

// テーブル一覧
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all();
console.log("\n📋 テーブル一覧:");
tables.forEach(t => console.log(`   - ${t.name}`));

db.close();
console.log("\n🎉 データベースセットアップ完了！");
