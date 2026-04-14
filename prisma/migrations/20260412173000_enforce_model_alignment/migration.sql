-- Enforce strict model alignment for dynamic filters and product attributes.

ALTER TABLE "equipment_filters"
ADD COLUMN "equipmentModelId" TEXT;

UPDATE "equipment_filters" ef
SET "equipmentModelId" = efg."equipmentModelId"
FROM "equipment_filter_groups" efg
WHERE efg."id" = ef."filterGroupId";

ALTER TABLE "equipment_filters"
ALTER COLUMN "equipmentModelId" SET NOT NULL;

ALTER TABLE "product_attributes"
ADD COLUMN "equipmentModelId" TEXT;

UPDATE "product_attributes" pa
SET "equipmentModelId" = p."equipmentModelId"
FROM "products" p
WHERE p."id" = pa."productId";

-- Remove historical mismatches before applying strict FK constraints.
DELETE FROM "product_attributes" pa
USING "equipment_filters" ef
WHERE pa."filterId" = ef."id"
  AND pa."equipmentModelId" <> ef."equipmentModelId";

ALTER TABLE "product_attributes"
ALTER COLUMN "equipmentModelId" SET NOT NULL;

CREATE INDEX "equipment_filters_equipmentModelId_idx"
ON "equipment_filters"("equipmentModelId");

CREATE INDEX "product_attributes_equipmentModelId_idx"
ON "product_attributes"("equipmentModelId");

CREATE UNIQUE INDEX "equipment_filters_id_equipmentModelId_key"
ON "equipment_filters"("id", "equipmentModelId");

CREATE UNIQUE INDEX "products_id_equipmentModelId_key"
ON "products"("id", "equipmentModelId");

ALTER TABLE "equipment_filters"
ADD CONSTRAINT "equipment_filters_equipmentModelId_fkey"
FOREIGN KEY ("equipmentModelId") REFERENCES "equipment_models"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_attributes"
ADD CONSTRAINT "product_attributes_equipmentModelId_fkey"
FOREIGN KEY ("equipmentModelId") REFERENCES "equipment_models"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_attributes"
ADD CONSTRAINT "product_attributes_productId_equipmentModelId_fkey"
FOREIGN KEY ("productId", "equipmentModelId") REFERENCES "products"("id", "equipmentModelId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_attributes"
ADD CONSTRAINT "product_attributes_filterId_equipmentModelId_fkey"
FOREIGN KEY ("filterId", "equipmentModelId") REFERENCES "equipment_filters"("id", "equipmentModelId")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION ensure_equipment_filter_model_consistency()
RETURNS trigger AS $$
DECLARE
  group_model_id TEXT;
BEGIN
  SELECT "equipmentModelId"
  INTO group_model_id
  FROM "equipment_filter_groups"
  WHERE "id" = NEW."filterGroupId";

  IF group_model_id IS NULL THEN
    RAISE EXCEPTION 'Unknown filter group id: %', NEW."filterGroupId";
  END IF;

  IF NEW."equipmentModelId" IS DISTINCT FROM group_model_id THEN
    RAISE EXCEPTION 'equipmentModelId (%) must match filter group model (%)', NEW."equipmentModelId", group_model_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_equipment_filter_model_consistency" ON "equipment_filters";

CREATE TRIGGER "trg_equipment_filter_model_consistency"
BEFORE INSERT OR UPDATE ON "equipment_filters"
FOR EACH ROW
EXECUTE FUNCTION ensure_equipment_filter_model_consistency();
