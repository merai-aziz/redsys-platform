-- CreateTable
CREATE TABLE "family_filters" (
    "family_id" INTEGER NOT NULL,
    "filter_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "family_filters_pkey" PRIMARY KEY ("family_id","filter_id")
);

-- CreateIndex
CREATE INDEX "family_filters_filter_id_idx" ON "family_filters"("filter_id");

-- AddForeignKey
ALTER TABLE "family_filters" ADD CONSTRAINT "family_filters_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "catalog_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_filters" ADD CONSTRAINT "family_filters_filter_id_fkey" FOREIGN KEY ("filter_id") REFERENCES "catalog_filters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
