-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EMPLOYEE', 'CLIENT');

-- CreateEnum
CREATE TYPE "StatusLogEnum" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "EquipmentStatusEnum" AS ENUM ('AVAILABLE', 'OUT_OF_STOCK', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "CartStatusEnum" AS ENUM ('ACTIVE', 'MERGED', 'CHECKED_OUT', 'ABANDONED');

-- CreateEnum
CREATE TYPE "OrderStatusEnum" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethodEnum" AS ENUM ('CARD', 'VIREMENT', 'CHEQUE', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatusEnum" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TicketStatusEnum" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriorityEnum" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "NotificationTypeEnum" AS ENUM ('ORDER_STATUS_UPDATE', 'TICKET_UPDATE', 'PAYMENT', 'RECOMMENDATION_READY', 'SIMULATION_COMPLETED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RiskLevelEnum" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ApplicationTypeEnum" AS ENUM ('ERP', 'WEB', 'DATABASE', 'VIRTUALIZATION', 'AI_WORKLOAD');

-- CreateEnum
CREATE TYPE "AttributeDataTypeEnum" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'ENUM');

-- CreateEnum
CREATE TYPE "EquipmentFilterFieldTypeEnum" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "ProductConditionEnum" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "RecommendationRunStatusEnum" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RecommendationSourceEnum" AS ENUM ('AUTO_AGENT', 'USER_TRIGGERED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "MetricTypeEnum" AS ENUM ('SALES', 'REVENUE', 'CONVERSION_RATE', 'AVG_ORDER_VALUE', 'CART_ABANDON_RATE', 'CONFIG_COMPLETION_RATE', 'RECOMMENDATION_ACCEPT_RATE', 'STOCK_COVERAGE_DAYS', 'CO2_SAVED_KG', 'ACTIVE_USERS');

-- CreateEnum
CREATE TYPE "MetricScopeEnum" AS ENUM ('GLOBAL', 'DOMAIN', 'BRAND', 'SERIES', 'MODEL', 'USER');

-- CreateEnum
CREATE TYPE "NotificationChannelEnum" AS ENUM ('IN_APP', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatusEnum" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "userRole" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "companyName" TEXT,
    "adresse" TEXT,
    "departement" TEXT,
    "phone" TEXT,
    "photo" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "deviceInfo" TEXT NOT NULL,
    "loginDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusLog" "StatusLogEnum" NOT NULL,

    CONSTRAINT "login_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_domains" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_brands" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_series" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_models" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "shortDescription" TEXT,
    "longDescription" TEXT,
    "basePrice" DECIMAL(12,2),
    "status" "EquipmentStatusEnum" NOT NULL DEFAULT 'AVAILABLE',
    "isConfigurable" BOOLEAN NOT NULL DEFAULT false,
    "warrantyMonths" INTEGER,
    "ratingValue" DOUBLE PRECISION,
    "ratingCount" INTEGER DEFAULT 0,
    "co2SavedKg" DOUBLE PRECISION,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "condition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_skus" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "condition" TEXT,
    "status" "EquipmentStatusEnum" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_images" (
    "id" TEXT NOT NULL,
    "modelId" TEXT,
    "skuId" TEXT,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataType" "AttributeDataTypeEnum" NOT NULL,
    "unit" TEXT,
    "isFilterable" BOOLEAN NOT NULL DEFAULT false,
    "isFacetable" BOOLEAN NOT NULL DEFAULT false,
    "isComparable" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_values" (
    "id" TEXT NOT NULL,
    "modelId" TEXT,
    "skuId" TEXT,
    "attributeDefinitionId" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueBoolean" BOOLEAN,
    "valueEnum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_filter_groups" (
    "id" TEXT NOT NULL,
    "equipmentModelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_filter_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_filters" (
    "id" TEXT NOT NULL,
    "filterGroupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" "EquipmentFilterFieldTypeEnum" NOT NULL,
    "unit" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_filter_options" (
    "id" TEXT NOT NULL,
    "filterId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_filter_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "equipmentModelId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "condition" "ProductConditionEnum" NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "filterId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "guestSessionId" TEXT,
    "userId" TEXT,
    "status" "CartStatusEnum" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "skuId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderStatusEnum" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL,
    "shipping" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "skuId" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethodEnum" NOT NULL,
    "status" "PaymentStatusEnum" NOT NULL DEFAULT 'PENDING',
    "transactionRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatusEnum" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriorityEnum" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationTypeEnum" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "referenceType" TEXT,
    "referenceId" TEXT,
    "priority" TEXT DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannelEnum" NOT NULL,
    "type" "NotificationTypeEnum" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" "NotificationChannelEnum" NOT NULL,
    "status" "NotificationDeliveryStatusEnum" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulations" (
    "id" TEXT NOT NULL,
    "guestSessionId" TEXT,
    "userId" TEXT,
    "name" TEXT,
    "applicationType" "ApplicationTypeEnum" NOT NULL,
    "riskLevel" "RiskLevelEnum" NOT NULL,
    "numberOfUsers" INTEGER NOT NULL,
    "cpuUsagePct" DOUBLE PRECISION NOT NULL,
    "ramUsagePct" DOUBLE PRECISION NOT NULL,
    "storageUsagePct" DOUBLE PRECISION NOT NULL,
    "networkUsagePct" DOUBLE PRECISION NOT NULL,
    "budgetMin" DECIMAL(12,2),
    "budgetMax" DECIMAL(12,2),
    "targetCo2ReductionKg" DOUBLE PRECISION,
    "availabilityTargetPct" DOUBLE PRECISION,
    "growthRatePct" DOUBLE PRECISION,
    "horizonMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_runs" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "status" "RecommendationRunStatusEnum" NOT NULL DEFAULT 'PENDING',
    "source" "RecommendationSourceEnum" NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "globalScore" DOUBLE PRECISION,
    "reasoningSummary" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_items" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "fitScore" DOUBLE PRECISION NOT NULL,
    "performanceScore" DOUBLE PRECISION NOT NULL,
    "costScore" DOUBLE PRECISION NOT NULL,
    "reliabilityScore" DOUBLE PRECISION NOT NULL,
    "sustainabilityScore" DOUBLE PRECISION NOT NULL,
    "estimatedPrice" DECIMAL(12,2),
    "estimatedCo2SavedKg" DOUBLE PRECISION,
    "explanation" TEXT,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_feedbacks" (
    "id" TEXT NOT NULL,
    "recommendationItemId" TEXT NOT NULL,
    "guestSessionId" TEXT,
    "userId" TEXT,
    "feedbackType" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autonomous_agent_jobs" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "triggeredBy" "RecommendationSourceEnum" NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "autonomous_agent_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_metrics" (
    "id" TEXT NOT NULL,
    "metricType" "MetricTypeEnum" NOT NULL,
    "scope" "MetricScopeEnum" NOT NULL,
    "scopeId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "aggregation" TEXT NOT NULL,
    "metadataJson" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_metric_history" (
    "id" TEXT NOT NULL,
    "dashboardMetricId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_metric_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_scores" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "cpuScore" DOUBLE PRECISION NOT NULL,
    "ramScore" DOUBLE PRECISION NOT NULL,
    "storageScore" DOUBLE PRECISION NOT NULL,
    "gpuScore" DOUBLE PRECISION NOT NULL,
    "reliabilityIndex" DOUBLE PRECISION NOT NULL,
    "estimatedRemainingLife" INTEGER NOT NULL,
    "economicComparisonIndex" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technical_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_metrics_legacy" (
    "id" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_metrics_legacy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "guest_sessions_token_key" ON "guest_sessions"("token");

-- CreateIndex
CREATE INDEX "login_logs_userId_idx" ON "login_logs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_domains_code_key" ON "equipment_domains"("code");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_domains_slug_key" ON "equipment_domains"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_brands_slug_key" ON "equipment_brands"("slug");

-- CreateIndex
CREATE INDEX "equipment_brands_domainId_idx" ON "equipment_brands"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_series_slug_key" ON "equipment_series"("slug");

-- CreateIndex
CREATE INDEX "equipment_series_brandId_idx" ON "equipment_series"("brandId");

-- CreateIndex
CREATE INDEX "equipment_series_domainId_idx" ON "equipment_series"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_models_slug_key" ON "equipment_models"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_models_reference_key" ON "equipment_models"("reference");

-- CreateIndex
CREATE INDEX "equipment_models_brandId_idx" ON "equipment_models"("brandId");

-- CreateIndex
CREATE INDEX "equipment_models_seriesId_idx" ON "equipment_models"("seriesId");

-- CreateIndex
CREATE INDEX "equipment_models_domainId_idx" ON "equipment_models"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_skus_reference_key" ON "equipment_skus"("reference");

-- CreateIndex
CREATE INDEX "equipment_skus_modelId_idx" ON "equipment_skus"("modelId");

-- CreateIndex
CREATE INDEX "equipment_images_modelId_idx" ON "equipment_images"("modelId");

-- CreateIndex
CREATE INDEX "equipment_images_skuId_idx" ON "equipment_images"("skuId");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_definitions_code_key" ON "attribute_definitions"("code");

-- CreateIndex
CREATE INDEX "attribute_values_modelId_idx" ON "attribute_values"("modelId");

-- CreateIndex
CREATE INDEX "attribute_values_skuId_idx" ON "attribute_values"("skuId");

-- CreateIndex
CREATE INDEX "attribute_values_attributeDefinitionId_idx" ON "attribute_values"("attributeDefinitionId");

-- CreateIndex
CREATE INDEX "equipment_filter_groups_equipmentModelId_idx" ON "equipment_filter_groups"("equipmentModelId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_filter_groups_equipmentModelId_slug_key" ON "equipment_filter_groups"("equipmentModelId", "slug");

-- CreateIndex
CREATE INDEX "equipment_filters_filterGroupId_idx" ON "equipment_filters"("filterGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_filters_filterGroupId_fieldKey_key" ON "equipment_filters"("filterGroupId", "fieldKey");

-- CreateIndex
CREATE INDEX "equipment_filter_options_filterId_idx" ON "equipment_filter_options"("filterId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_filter_options_filterId_value_key" ON "equipment_filter_options"("filterId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_equipmentModelId_idx" ON "products"("equipmentModelId");

-- CreateIndex
CREATE INDEX "product_attributes_productId_idx" ON "product_attributes"("productId");

-- CreateIndex
CREATE INDEX "product_attributes_filterId_idx" ON "product_attributes"("filterId");

-- CreateIndex
CREATE UNIQUE INDEX "product_attributes_productId_filterId_key" ON "product_attributes"("productId", "filterId");

-- CreateIndex
CREATE INDEX "carts_guestSessionId_idx" ON "carts"("guestSessionId");

-- CreateIndex
CREATE INDEX "carts_userId_idx" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE INDEX "cart_items_skuId_idx" ON "cart_items"("skuId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_skuId_idx" ON "order_items"("skuId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "quotes_userId_idx" ON "quotes"("userId");

-- CreateIndex
CREATE INDEX "tickets_userId_idx" ON "tickets"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_channel_type_key" ON "notification_preferences"("userId", "channel", "type");

-- CreateIndex
CREATE INDEX "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");

-- CreateIndex
CREATE INDEX "simulations_guestSessionId_idx" ON "simulations"("guestSessionId");

-- CreateIndex
CREATE INDEX "simulations_userId_idx" ON "simulations"("userId");

-- CreateIndex
CREATE INDEX "recommendation_runs_simulationId_idx" ON "recommendation_runs"("simulationId");

-- CreateIndex
CREATE INDEX "recommendation_items_runId_idx" ON "recommendation_items"("runId");

-- CreateIndex
CREATE INDEX "recommendation_items_modelId_idx" ON "recommendation_items"("modelId");

-- CreateIndex
CREATE INDEX "recommendation_feedbacks_recommendationItemId_idx" ON "recommendation_feedbacks"("recommendationItemId");

-- CreateIndex
CREATE INDEX "recommendation_feedbacks_guestSessionId_idx" ON "recommendation_feedbacks"("guestSessionId");

-- CreateIndex
CREATE INDEX "recommendation_feedbacks_userId_idx" ON "recommendation_feedbacks"("userId");

-- CreateIndex
CREATE INDEX "dashboard_metrics_metricType_idx" ON "dashboard_metrics"("metricType");

-- CreateIndex
CREATE INDEX "dashboard_metrics_scope_idx" ON "dashboard_metrics"("scope");

-- CreateIndex
CREATE INDEX "dashboard_metric_history_dashboardMetricId_idx" ON "dashboard_metric_history"("dashboardMetricId");

-- CreateIndex
CREATE UNIQUE INDEX "technical_scores_modelId_key" ON "technical_scores"("modelId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_logs" ADD CONSTRAINT "login_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_brands" ADD CONSTRAINT "equipment_brands_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "equipment_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_series" ADD CONSTRAINT "equipment_series_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "equipment_brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_series" ADD CONSTRAINT "equipment_series_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "equipment_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_models" ADD CONSTRAINT "equipment_models_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "equipment_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_models" ADD CONSTRAINT "equipment_models_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "equipment_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_models" ADD CONSTRAINT "equipment_models_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "equipment_domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_skus" ADD CONSTRAINT "equipment_skus_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "equipment_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_images" ADD CONSTRAINT "equipment_images_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "equipment_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_images" ADD CONSTRAINT "equipment_images_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "equipment_skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "equipment_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "equipment_skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attributeDefinitionId_fkey" FOREIGN KEY ("attributeDefinitionId") REFERENCES "attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_filter_groups" ADD CONSTRAINT "equipment_filter_groups_equipmentModelId_fkey" FOREIGN KEY ("equipmentModelId") REFERENCES "equipment_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_filters" ADD CONSTRAINT "equipment_filters_filterGroupId_fkey" FOREIGN KEY ("filterGroupId") REFERENCES "equipment_filter_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_filter_options" ADD CONSTRAINT "equipment_filter_options_filterId_fkey" FOREIGN KEY ("filterId") REFERENCES "equipment_filters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_equipmentModelId_fkey" FOREIGN KEY ("equipmentModelId") REFERENCES "equipment_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_filterId_fkey" FOREIGN KEY ("filterId") REFERENCES "equipment_filters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "guest_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "equipment_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "equipment_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "guest_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_runs" ADD CONSTRAINT "recommendation_runs_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_runId_fkey" FOREIGN KEY ("runId") REFERENCES "recommendation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "equipment_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_feedbacks" ADD CONSTRAINT "recommendation_feedbacks_recommendationItemId_fkey" FOREIGN KEY ("recommendationItemId") REFERENCES "recommendation_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_feedbacks" ADD CONSTRAINT "recommendation_feedbacks_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "guest_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_feedbacks" ADD CONSTRAINT "recommendation_feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_metric_history" ADD CONSTRAINT "dashboard_metric_history_dashboardMetricId_fkey" FOREIGN KEY ("dashboardMetricId") REFERENCES "dashboard_metrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_scores" ADD CONSTRAINT "technical_scores_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "equipment_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
