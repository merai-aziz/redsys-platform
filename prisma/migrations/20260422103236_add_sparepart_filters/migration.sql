-- CreateTable
CREATE TABLE "sparepart_filters" (
    "part_product_id" INTEGER NOT NULL,
    "target_product_id" INTEGER NOT NULL,
    "filter_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sparepart_filters_pkey" PRIMARY KEY ("part_product_id","target_product_id","filter_id")
);

-- CreateIndex
CREATE INDEX "sparepart_filters_target_product_id_idx" ON "sparepart_filters"("target_product_id");

-- CreateIndex
CREATE INDEX "sparepart_filters_filter_id_idx" ON "sparepart_filters"("filter_id");

-- AddForeignKey
ALTER TABLE "sparepart_filters" ADD CONSTRAINT "sparepart_filters_part_product_id_fkey" FOREIGN KEY ("part_product_id") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sparepart_filters" ADD CONSTRAINT "sparepart_filters_target_product_id_fkey" FOREIGN KEY ("target_product_id") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sparepart_filters" ADD CONSTRAINT "sparepart_filters_filter_id_fkey" FOREIGN KEY ("filter_id") REFERENCES "catalog_filters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
