-- Add missing association from cart items to equipment (kept nullable for existing data safety)
ALTER TABLE "cartItem"
ADD COLUMN "equipmentId" TEXT;

CREATE INDEX "cartItem_equipmentId_idx" ON "cartItem"("equipmentId");

ALTER TABLE "cartItem"
ADD CONSTRAINT "cartItem_equipmentId_fkey"
FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add missing price attribute on order items
ALTER TABLE "orderItem"
ADD COLUMN "price" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "orderItem"
ALTER COLUMN "price" DROP DEFAULT;
