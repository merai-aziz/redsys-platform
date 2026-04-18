/*
  Warnings:

  - You are about to drop the column `skuId` on the `cart_items` table. All the data in the column will be lost.
  - You are about to drop the column `skuId` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `modelId` on the `recommendation_items` table. All the data in the column will be lost.
  - You are about to drop the `attribute_definitions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attribute_values` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `equipment_brands` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `equipment_domains` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `equipment_filter_groups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `equipment_filter_options` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `equipment_filters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `equipment_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `equipment_models` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `equipment_series` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `equipment_skus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_attributes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `technical_scores` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `productId` to the `recommendation_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('STANDARD', 'CONFIGURABLE');

-- DropForeignKey
ALTER TABLE "attribute_values" DROP CONSTRAINT "attribute_values_attributeDefinitionId_fkey";

-- DropForeignKey
ALTER TABLE "attribute_values" DROP CONSTRAINT "attribute_values_modelId_fkey";

-- DropForeignKey
ALTER TABLE "attribute_values" DROP CONSTRAINT "attribute_values_skuId_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_skuId_fkey";

-- DropForeignKey
ALTER TABLE "equipment_brands" DROP CONSTRAINT "equipment_brands_domainId_fkey";

-- DropForeignKey
ALTER TABLE "equipment_filter_groups" DROP CONSTRAINT "equipment_filter_groups_equipmentModelId_fkey";

-- DropForeignKey
ALTER TABLE "equipment_filter_options" DROP CONSTRAINT "equipment_filter_options_filterId_fkey";

-- DropForeignKey
ALTER TABLE "equipment_filters" DROP CONSTRAINT "equipment_filters_equipmentModelId_fkey";

-- DropForeignKey
ALTER TABLE "equipment_filters" DROP CONSTRAINT "equipment_filters_filterGroupId_fkey";

-- DropForeignKey
ALTER TABLE "equipment_images" DROP CONSTRAINT "equipment_images_modelId_fkey";

-- DropForeignKey
ALTER TABLE "equipment_images" DROP CONSTRAINT "equipment_images_skuId_fkey";

-- DropForeignKey
ALTER TABLE "equipment_models" DROP CONSTRAINT "equipment_models_brandId_fkey";

-- DropForeignKey
ALTER TABLE "equipment_models" DROP CONSTRAINT "equipment_models_domainId_fkey";

-- DropForeignKey
ALTER TABLE "equipment_models" DROP CONSTRAINT "equipment_models_seriesId_fkey";

-- DropForeignKey
ALTER TABLE "equipment_series" DROP CONSTRAINT "equipment_series_brandId_fkey";

-- DropForeignKey
ALTER TABLE "equipment_series" DROP CONSTRAINT "equipment_series_domainId_fkey";

-- DropForeignKey
ALTER TABLE "equipment_skus" DROP CONSTRAINT "equipment_skus_modelId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_skuId_fkey";

-- DropForeignKey
ALTER TABLE "product_attributes" DROP CONSTRAINT "product_attributes_equipmentModelId_fkey";

-- DropForeignKey
ALTER TABLE "product_attributes" DROP CONSTRAINT "product_attributes_filterId_equipmentModelId_fkey";

-- DropForeignKey
ALTER TABLE "product_attributes" DROP CONSTRAINT "product_attributes_filterId_fkey";

-- DropForeignKey
ALTER TABLE "product_attributes" DROP CONSTRAINT "product_attributes_productId_equipmentModelId_fkey";

-- DropForeignKey
ALTER TABLE "product_attributes" DROP CONSTRAINT "product_attributes_productId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_equipmentModelId_fkey";

-- DropForeignKey
ALTER TABLE "recommendation_items" DROP CONSTRAINT "recommendation_items_modelId_fkey";

-- DropForeignKey
ALTER TABLE "technical_scores" DROP CONSTRAINT "technical_scores_modelId_fkey";

-- DropIndex
DROP INDEX "cart_items_skuId_idx";

-- DropIndex
DROP INDEX "order_items_skuId_idx";

-- DropIndex
DROP INDEX "recommendation_items_modelId_idx";

-- AlterTable
ALTER TABLE "cart_items" DROP COLUMN "skuId",
ADD COLUMN     "productId" INTEGER;

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "skuId",
ADD COLUMN     "productId" INTEGER;

-- AlterTable
ALTER TABLE "recommendation_items" DROP COLUMN "modelId",
ADD COLUMN     "productId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "attribute_definitions";

-- DropTable
DROP TABLE "attribute_values";

-- DropTable
DROP TABLE "equipment_brands";

-- DropTable
DROP TABLE "equipment_domains";

-- DropTable
DROP TABLE "equipment_filter_groups";

-- DropTable
DROP TABLE "equipment_filter_options";

-- DropTable
DROP TABLE "equipment_filters";

-- DropTable
DROP TABLE "equipment_images";

-- DropTable
DROP TABLE "equipment_models";

-- DropTable
DROP TABLE "equipment_series";

-- DropTable
DROP TABLE "equipment_skus";

-- DropTable
DROP TABLE "product_attributes";

-- DropTable
DROP TABLE "products";

-- DropTable
DROP TABLE "technical_scores";

-- DropEnum
DROP TYPE "AttributeDataTypeEnum";

-- DropEnum
DROP TYPE "EquipmentFilterFieldTypeEnum";

-- DropEnum
DROP TYPE "EquipmentStatusEnum";

-- DropEnum
DROP TYPE "ProductConditionEnum";

-- CreateTable
CREATE TABLE "catalog_brands" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "catalog_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_families" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "catalog_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "base_price" DECIMAL(12,2) NOT NULL,
    "type" "ProductType" NOT NULL,
    "image_url" TEXT,
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "in_stock" BOOLEAN NOT NULL DEFAULT false,
    "poe" BOOLEAN NOT NULL DEFAULT false,
    "brand_id" INTEGER NOT NULL,
    "family_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuration_options" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,

    CONSTRAINT "configuration_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuration_values" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "configuration_option_id" INTEGER NOT NULL,

    CONSTRAINT "configuration_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_product_specs" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "spec_key" TEXT NOT NULL,
    "spec_value" TEXT NOT NULL,

    CONSTRAINT "catalog_product_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selected_configurations" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "selected_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selected_options" (
    "id" SERIAL NOT NULL,
    "selected_configuration_id" INTEGER NOT NULL,
    "value_id" INTEGER NOT NULL,

    CONSTRAINT "selected_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_filters" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "catalog_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filter_values" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "filter_id" INTEGER NOT NULL,

    CONSTRAINT "filter_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_filter_values" (
    "product_id" INTEGER NOT NULL,
    "filter_value_id" INTEGER NOT NULL,

    CONSTRAINT "product_filter_values_pkey" PRIMARY KEY ("product_id","filter_value_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_brands_name_key" ON "catalog_brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_categories_name_key" ON "catalog_categories"("name");

-- CreateIndex
CREATE INDEX "catalog_families_category_id_idx" ON "catalog_families"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_families_name_category_id_key" ON "catalog_families"("name", "category_id");

-- CreateIndex
CREATE INDEX "catalog_products_brand_id_idx" ON "catalog_products"("brand_id");

-- CreateIndex
CREATE INDEX "catalog_products_family_id_idx" ON "catalog_products"("family_id");

-- CreateIndex
CREATE INDEX "catalog_products_category_id_idx" ON "catalog_products"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_products_name_brand_id_family_id_key" ON "catalog_products"("name", "brand_id", "family_id");

-- CreateIndex
CREATE INDEX "configuration_options_product_id_idx" ON "configuration_options"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "configuration_options_name_product_id_key" ON "configuration_options"("name", "product_id");

-- CreateIndex
CREATE INDEX "configuration_values_configuration_option_id_idx" ON "configuration_values"("configuration_option_id");

-- CreateIndex
CREATE UNIQUE INDEX "configuration_values_value_configuration_option_id_key" ON "configuration_values"("value", "configuration_option_id");

-- CreateIndex
CREATE INDEX "catalog_product_specs_product_id_idx" ON "catalog_product_specs"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_product_specs_product_id_spec_key_spec_value_key" ON "catalog_product_specs"("product_id", "spec_key", "spec_value");

-- CreateIndex
CREATE INDEX "selected_configurations_product_id_idx" ON "selected_configurations"("product_id");

-- CreateIndex
CREATE INDEX "selected_options_selected_configuration_id_idx" ON "selected_options"("selected_configuration_id");

-- CreateIndex
CREATE INDEX "selected_options_value_id_idx" ON "selected_options"("value_id");

-- CreateIndex
CREATE UNIQUE INDEX "selected_options_selected_configuration_id_value_id_key" ON "selected_options"("selected_configuration_id", "value_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_filters_name_key" ON "catalog_filters"("name");

-- CreateIndex
CREATE INDEX "filter_values_filter_id_idx" ON "filter_values"("filter_id");

-- CreateIndex
CREATE UNIQUE INDEX "filter_values_value_filter_id_key" ON "filter_values"("value", "filter_id");

-- CreateIndex
CREATE INDEX "product_filter_values_filter_value_id_idx" ON "product_filter_values"("filter_value_id");

-- CreateIndex
CREATE INDEX "cart_items_productId_idx" ON "cart_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "recommendation_items_productId_idx" ON "recommendation_items"("productId");

-- AddForeignKey
ALTER TABLE "catalog_families" ADD CONSTRAINT "catalog_families_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "catalog_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "catalog_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuration_options" ADD CONSTRAINT "configuration_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuration_values" ADD CONSTRAINT "configuration_values_configuration_option_id_fkey" FOREIGN KEY ("configuration_option_id") REFERENCES "configuration_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_product_specs" ADD CONSTRAINT "catalog_product_specs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selected_configurations" ADD CONSTRAINT "selected_configurations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selected_options" ADD CONSTRAINT "selected_options_selected_configuration_id_fkey" FOREIGN KEY ("selected_configuration_id") REFERENCES "selected_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selected_options" ADD CONSTRAINT "selected_options_value_id_fkey" FOREIGN KEY ("value_id") REFERENCES "configuration_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filter_values" ADD CONSTRAINT "filter_values_filter_id_fkey" FOREIGN KEY ("filter_id") REFERENCES "catalog_filters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_filter_values" ADD CONSTRAINT "product_filter_values_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_filter_values" ADD CONSTRAINT "product_filter_values_filter_value_id_fkey" FOREIGN KEY ("filter_value_id") REFERENCES "filter_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
