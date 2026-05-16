-- DropForeignKey
ALTER TABLE "configuration_values" DROP CONSTRAINT "configuration_values_standard_product_id_fkey";

-- AddForeignKey
ALTER TABLE "configuration_values" ADD CONSTRAINT "configuration_values_standard_product_id_fkey" FOREIGN KEY ("standard_product_id") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
