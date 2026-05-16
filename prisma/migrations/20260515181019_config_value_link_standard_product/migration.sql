-- Vider les données existantes incompatibles
TRUNCATE TABLE "configuration_values" CASCADE;
TRUNCATE TABLE "configuration_options" CASCADE;

-- Supprimer l'ancienne colonne value
ALTER TABLE "configuration_values" DROP COLUMN IF EXISTS "value";

-- Ajouter les nouvelles colonnes
ALTER TABLE "configuration_values" ADD COLUMN "group_name" TEXT NOT NULL;
ALTER TABLE "configuration_values" ADD COLUMN "standard_product_id" INTEGER NOT NULL;

-- Ajouter la contrainte FK vers catalog_products
ALTER TABLE "configuration_values" ADD CONSTRAINT "configuration_values_standard_product_id_fkey"
  FOREIGN KEY ("standard_product_id") REFERENCES "catalog_products"("id") ON DELETE CASCADE;

-- Mettre à jour l'index unique (remplacer value par group_name)
DROP INDEX IF EXISTS "configuration_values_value_configuration_option_id_key";
CREATE UNIQUE INDEX "configuration_values_group_name_configuration_option_id_key"
  ON "configuration_values"("group_name", "configuration_option_id");

-- Ajouter index sur standard_product_id
CREATE INDEX "configuration_values_standard_product_id_idx"
  ON "configuration_values"("standard_product_id");