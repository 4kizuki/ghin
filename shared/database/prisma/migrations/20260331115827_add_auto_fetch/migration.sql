-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Repository" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autoFetch" BOOLEAN NOT NULL DEFAULT false,
    "fetchRemotes" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_Repository" ("createdAt", "id", "name", "path", "sortOrder") SELECT "createdAt", "id", "name", "path", "sortOrder" FROM "Repository";
DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";
CREATE UNIQUE INDEX "Repository_path_key" ON "Repository"("path");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
