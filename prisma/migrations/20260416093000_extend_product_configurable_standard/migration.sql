DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'catalog_products'
  ) THEN
    ALTER TABLE "catalog_products"
    ADD COLUMN IF NOT EXISTS "image_url" TEXT,
    ADD COLUMN IF NOT EXISTS "stock_qty" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "in_stock" BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS "poe" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'configuration_values'
  ) THEN
    ALTER TABLE "configuration_values"
    ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'catalog_products'
  ) THEN
    CREATE TABLE IF NOT EXISTS "catalog_product_specs" (
      "id" SERIAL PRIMARY KEY,
      "product_id" INTEGER NOT NULL REFERENCES "catalog_products"("id") ON DELETE CASCADE,
      "spec_key" TEXT NOT NULL,
      "spec_value" TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "catalog_product_specs_product_id_idx"
    ON "catalog_product_specs"("product_id");

    CREATE UNIQUE INDEX IF NOT EXISTS "catalog_product_specs_product_id_spec_key_spec_value_key"
    ON "catalog_product_specs"("product_id", "spec_key", "spec_value");
  END IF;
END
$$;
