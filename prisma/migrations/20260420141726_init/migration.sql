-- CreateTable
CREATE TABLE "Apartment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "rooms" REAL,
    "size" REAL,
    "floor" INTEGER,
    "totalFloors" INTEGER,
    "neighborhood" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Tel Aviv',
    "lat" REAL,
    "lng" REAL,
    "furnished" BOOLEAN,
    "parking" BOOLEAN,
    "elevator" BOOLEAN,
    "balcony" BOOLEAN,
    "petsAllowed" BOOLEAN,
    "images" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "contactPhone" TEXT,
    "contactName" TEXT,
    "postedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScraperConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Apartment_externalId_key" ON "Apartment"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ScraperConfig_source_key" ON "ScraperConfig"("source");
