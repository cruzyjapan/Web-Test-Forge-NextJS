-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseUrl" TEXT NOT NULL,
    "sourcePath" TEXT,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "authEmail" TEXT,
    "authPassword" TEXT,
    "loginUrl" TEXT,
    "screenshotSize" TEXT NOT NULL DEFAULT 'desktop-1920',
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("authEmail", "authPassword", "baseUrl", "createdAt", "description", "id", "loginUrl", "name", "requiresAuth", "sourcePath", "updatedAt", "userId") SELECT "authEmail", "authPassword", "baseUrl", "createdAt", "description", "id", "loginUrl", "name", "requiresAuth", "sourcePath", "updatedAt", "userId" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
