-- CreateTable
CREATE TABLE "WeeklyClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weeklyClassId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    CONSTRAINT "ClassEnrollment_weeklyClassId_fkey" FOREIGN KEY ("weeklyClassId") REFERENCES "WeeklyClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClassAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weeklyClassId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'present',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassAttendance_weeklyClassId_fkey" FOREIGN KEY ("weeklyClassId") REFERENCES "WeeklyClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_weeklyClassId_studentId_key" ON "ClassEnrollment"("weeklyClassId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassAttendance_weeklyClassId_studentId_date_key" ON "ClassAttendance"("weeklyClassId", "studentId", "date");
