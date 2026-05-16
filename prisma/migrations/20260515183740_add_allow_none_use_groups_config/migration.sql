-- Rendre group_name nullable
ALTER TABLE "configuration_values" ALTER COLUMN "group_name" DROP NOT NULL;

-- Supprimer l'ancien unique sur group_name (group_name peut être null/répété maintenant)
DROP INDEX IF EXISTS "configuration_values_group_name_configuration_option_id_key";

-- Ajouter allow_none sur ConfigurationOption
ALTER TABLE "configuration_options" ADD COLUMN "allow_none" BOOLEAN NOT NULL DEFAULT false;

-- Ajouter use_groups sur ConfigurationOption
ALTER TABLE "configuration_options" ADD COLUMN "use_groups" BOOLEAN NOT NULL DEFAULT false;