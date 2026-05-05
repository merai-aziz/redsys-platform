-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "note" TEXT,
ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'bank',
ADD COLUMN     "shippingMethod" TEXT NOT NULL DEFAULT 'standard';

-- CreateTable
CREATE TABLE "shipping_addresses" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'France',
    "phone" TEXT NOT NULL,
    "invoiceEmail" TEXT,
    "vatNumber" TEXT,
    "orderNumber" TEXT,
    "neutralDelivery" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_addresses_orderId_key" ON "shipping_addresses"("orderId");

-- AddForeignKey
ALTER TABLE "shipping_addresses" ADD CONSTRAINT "shipping_addresses_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
