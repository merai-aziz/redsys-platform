-- CreateTable
CREATE TABLE "ContractItemOption" (
    "id" SERIAL NOT NULL,
    "contractItemId" TEXT NOT NULL,
    "configurationValueId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ContractItemOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractItemOption_contractItemId_idx" ON "ContractItemOption"("contractItemId");

-- CreateIndex
CREATE INDEX "ContractItemOption_configurationValueId_idx" ON "ContractItemOption"("configurationValueId");

-- AddForeignKey
ALTER TABLE "ContractItemOption" ADD CONSTRAINT "ContractItemOption_contractItemId_fkey" FOREIGN KEY ("contractItemId") REFERENCES "contract_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractItemOption" ADD CONSTRAINT "ContractItemOption_configurationValueId_fkey" FOREIGN KEY ("configurationValueId") REFERENCES "configuration_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
