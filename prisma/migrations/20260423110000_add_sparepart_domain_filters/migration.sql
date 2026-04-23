CREATE TABLE "sparepart_domain_filters" (
  "domain_code" TEXT NOT NULL,
  "filter_id" INTEGER NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "sparepart_domain_filters_pkey" PRIMARY KEY ("domain_code", "filter_id"),
  CONSTRAINT "sparepart_domain_filters_filter_id_fkey"
    FOREIGN KEY ("filter_id") REFERENCES "catalog_filters"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "sparepart_domain_filters_filter_id_idx"
  ON "sparepart_domain_filters"("filter_id");
