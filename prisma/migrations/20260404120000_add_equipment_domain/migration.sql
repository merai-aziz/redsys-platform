-- CreateEnum
CREATE TYPE "EquipmentStatusEnum" AS ENUM ('AVAILABLE', 'OUT_OF_STOCK', 'DISCONTINUED');

-- CreateTable
CREATE TABLE "equipment_brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "photo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_sub_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "photo" TEXT,
    "categoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_sub_sub_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "photo" TEXT,
    "subCategoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_sub_sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "photo" TEXT,
    "price" DECIMAL(12,2),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "status" "EquipmentStatusEnum" NOT NULL DEFAULT 'AVAILABLE',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "brandId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subCategoryId" TEXT NOT NULL,
    "subSubCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_brands_slug_key" ON "equipment_brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_categories_slug_key" ON "equipment_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_sub_categories_slug_key" ON "equipment_sub_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_sub_sub_categories_slug_key" ON "equipment_sub_sub_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_slug_key" ON "equipment"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_reference_key" ON "equipment"("reference");

-- CreateIndex
CREATE INDEX "equipment_brandId_idx" ON "equipment"("brandId");

-- CreateIndex
CREATE INDEX "equipment_categoryId_idx" ON "equipment"("categoryId");

-- CreateIndex
CREATE INDEX "equipment_subCategoryId_idx" ON "equipment"("subCategoryId");

-- CreateIndex
CREATE INDEX "equipment_subSubCategoryId_idx" ON "equipment"("subSubCategoryId");

-- AddForeignKey
ALTER TABLE "equipment_sub_categories" ADD CONSTRAINT "equipment_sub_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "equipment_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_sub_sub_categories" ADD CONSTRAINT "equipment_sub_sub_categories_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "equipment_sub_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "equipment_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "equipment_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "equipment_sub_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_subSubCategoryId_fkey" FOREIGN KEY ("subSubCategoryId") REFERENCES "equipment_sub_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
