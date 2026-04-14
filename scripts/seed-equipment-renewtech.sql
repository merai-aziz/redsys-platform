-- Renewtech-aligned seed using names visible in provided captures
-- Run in pgAdmin (or psql) against the redsys database.

BEGIN;

-- Cleanup products and filters first (they depend on models)
DELETE FROM product_attributes
WHERE "productId" IN (
  SELECT id FROM products 
  WHERE "equipmentModelId" IN (
    SELECT id FROM equipment_models
    WHERE "domainId" IN (
      SELECT id FROM equipment_domains WHERE code IN ('SERVER', 'STORAGE', 'NETWORK', 'COMPONENT')
    )
  )
);

DELETE FROM products
WHERE "equipmentModelId" IN (
  SELECT id FROM equipment_models
  WHERE "domainId" IN (
    SELECT id FROM equipment_domains WHERE code IN ('SERVER', 'STORAGE', 'NETWORK', 'COMPONENT')
  )
);

DELETE FROM equipment_filter_options
WHERE "filterId" IN (
  SELECT id FROM equipment_filters
  WHERE "filterGroupId" IN (
    SELECT id FROM equipment_filter_groups
    WHERE "equipmentModelId" IN (
      SELECT id FROM equipment_models
      WHERE "domainId" IN (
        SELECT id FROM equipment_domains WHERE code IN ('SERVER', 'STORAGE', 'NETWORK', 'COMPONENT')
      )
    )
  )
);

DELETE FROM equipment_filters
WHERE "filterGroupId" IN (
  SELECT id FROM equipment_filter_groups
  WHERE "equipmentModelId" IN (
    SELECT id FROM equipment_models
    WHERE "domainId" IN (
      SELECT id FROM equipment_domains WHERE code IN ('SERVER', 'STORAGE', 'NETWORK', 'COMPONENT')
    )
  )
);

DELETE FROM equipment_filter_groups
WHERE "equipmentModelId" IN (
  SELECT id FROM equipment_models
  WHERE "domainId" IN (
    SELECT id FROM equipment_domains WHERE code IN ('SERVER', 'STORAGE', 'NETWORK', 'COMPONENT')
  )
);

-- Cleanup equipment catalogue for target domains
DELETE FROM equipment_images
WHERE "modelId" IN (
  SELECT id
  FROM equipment_models
  WHERE "domainId" IN (
    SELECT id FROM equipment_domains WHERE code IN ('SERVER', 'STORAGE', 'NETWORK', 'COMPONENT')
  )
);

DELETE FROM equipment_skus
WHERE "modelId" IN (
  SELECT id
  FROM equipment_models
  WHERE "domainId" IN (
    SELECT id FROM equipment_domains WHERE code IN ('SERVER', 'STORAGE', 'NETWORK', 'COMPONENT')
  )
);

DELETE FROM equipment_models
WHERE "domainId" IN (
  SELECT id FROM equipment_domains WHERE code IN ('SERVER', 'STORAGE', 'NETWORK', 'COMPONENT')
);

DELETE FROM equipment_series
WHERE "domainId" IN (
  SELECT id FROM equipment_domains WHERE code IN ('SERVER', 'STORAGE', 'NETWORK', 'COMPONENT')
);

DELETE FROM equipment_brands
WHERE "domainId" IN (
  SELECT id FROM equipment_domains WHERE code IN ('SERVER', 'STORAGE', 'NETWORK', 'COMPONENT')
);

DELETE FROM equipment_domains
WHERE code IN ('SERVER', 'STORAGE', 'NETWORK', 'COMPONENT');

-- Domains
INSERT INTO equipment_domains (id, code, label, slug, icon, "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
('dom-server', 'SERVER', 'Servers', 'servers', null, 1, true, NOW(), NOW()),
('dom-storage', 'STORAGE', 'Storage', 'storage', null, 2, true, NOW(), NOW()),
('dom-network', 'NETWORK', 'Network', 'network', null, 3, true, NOW(), NOW()),
('dom-component', 'COMPONENT', 'Products', 'products', null, 4, true, NOW(), NOW());

-- Brands: Server
INSERT INTO equipment_brands (id, "domainId", name, slug, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
('b-srv-cisco', 'dom-server', 'Cisco', 'srv-cisco-seed26', true, 1, NOW(), NOW()),
('b-srv-dell-emc', 'dom-server', 'Dell EMC', 'srv-dell-emc-seed26', true, 2, NOW(), NOW()),
('b-srv-fujitsu', 'dom-server', 'Fujitsu', 'srv-fujitsu-seed26', true, 3, NOW(), NOW()),
('b-srv-hpe', 'dom-server', 'HPE', 'srv-hpe-seed26', true, 4, NOW(), NOW()),
('b-srv-ibm', 'dom-server', 'IBM', 'srv-ibm-seed26', true, 5, NOW(), NOW()),
('b-srv-lenovo', 'dom-server', 'Lenovo', 'srv-lenovo-seed26', true, 6, NOW(), NOW()),
('b-srv-supermicro', 'dom-server', 'Supermicro', 'srv-supermicro-seed26', true, 7, NOW(), NOW());

-- Brands: Storage
INSERT INTO equipment_brands (id, "domainId", name, slug, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
('b-stg-dell-emc', 'dom-storage', 'Dell EMC', 'stg-dell-emc-seed26', true, 1, NOW(), NOW()),
('b-stg-hpe', 'dom-storage', 'HPE', 'stg-hpe-seed26', true, 2, NOW(), NOW()),
('b-stg-ibm', 'dom-storage', 'IBM', 'stg-ibm-seed26', true, 3, NOW(), NOW()),
('b-stg-lenovo', 'dom-storage', 'Lenovo', 'stg-lenovo-seed26', true, 4, NOW(), NOW()),
('b-stg-netapp', 'dom-storage', 'NetApp', 'stg-netapp-seed26', true, 5, NOW(), NOW()),
('b-stg-fujitsu', 'dom-storage', 'Fujitsu', 'stg-fujitsu-seed26', true, 6, NOW(), NOW());

-- Brands: Network
INSERT INTO equipment_brands (id, "domainId", name, slug, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
('b-net-brocade', 'dom-network', 'Brocade', 'net-brocade-seed26', true, 1, NOW(), NOW()),
('b-net-cisco', 'dom-network', 'Cisco', 'net-cisco-seed26', true, 2, NOW(), NOW()),
('b-net-hpe', 'dom-network', 'HPE', 'net-hpe-seed26', true, 3, NOW(), NOW());

-- Brands: Products grid
INSERT INTO equipment_brands (id, "domainId", name, slug, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
('b-prd-arista', 'dom-component', 'ARISTA', 'prd-arista-seed26', true, 1, NOW(), NOW()),
('b-prd-brocade', 'dom-component', 'BROCADE', 'prd-brocade-seed26', true, 2, NOW(), NOW()),
('b-prd-cisco', 'dom-component', 'CISCO', 'prd-cisco-seed26', true, 3, NOW(), NOW()),
('b-prd-dell', 'dom-component', 'DELL', 'prd-dell-seed26', true, 4, NOW(), NOW()),
('b-prd-emc', 'dom-component', 'EMC', 'prd-emc-seed26', true, 5, NOW(), NOW()),
('b-prd-fujitsu', 'dom-component', 'FUJITSU', 'prd-fujitsu-seed26', true, 6, NOW(), NOW()),
('b-prd-hitachi', 'dom-component', 'HITACHI', 'prd-hitachi-seed26', true, 7, NOW(), NOW()),
('b-prd-hp', 'dom-component', 'HP', 'prd-hp-seed26', true, 8, NOW(), NOW()),
('b-prd-ibm', 'dom-component', 'IBM', 'prd-ibm-seed26', true, 9, NOW(), NOW()),
('b-prd-lenovo', 'dom-component', 'LENOVO', 'prd-lenovo-seed26', true, 10, NOW(), NOW()),
('b-prd-intel', 'dom-component', 'INTEL', 'prd-intel-seed26', true, 11, NOW(), NOW()),
('b-prd-seagate', 'dom-component', 'SEAGATE', 'prd-seagate-seed26', true, 12, NOW(), NOW()),
('b-prd-netapp', 'dom-component', 'NETAPP', 'prd-netapp-seed26', true, 13, NOW(), NOW()),
('b-prd-juniper', 'dom-component', 'JUNIPER', 'prd-juniper-seed26', true, 14, NOW(), NOW()),
('b-prd-supermicro', 'dom-component', 'SUPERMICRO', 'prd-supermicro-seed26', true, 15, NOW(), NOW()),
('b-prd-renewlink', 'dom-component', 'RENEWLINK', 'prd-renewlink-seed26', true, 16, NOW(), NOW()),
('b-prd-nvidia', 'dom-component', 'NVIDIA', 'prd-nvidia-seed26', true, 17, NOW(), NOW()),
('b-prd-amd', 'dom-component', 'AMD', 'prd-amd-seed26', true, 18, NOW(), NOW());

-- Series: Server
INSERT INTO equipment_series (id, "brandId", "domainId", name, slug, description, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
('s-srv-dell-rack', 'b-srv-dell-emc', 'dom-server', 'Rack Servers', 'srv-dell-rack-seed26', 'Rack servers', true, 1, NOW(), NOW()),
('s-srv-dell-tower', 'b-srv-dell-emc', 'dom-server', 'Tower Servers', 'srv-dell-tower-seed26', 'Tower servers', true, 2, NOW(), NOW()),
('s-srv-dell-blade', 'b-srv-dell-emc', 'dom-server', 'Blade Servers', 'srv-dell-blade-seed26', 'Blade servers', true, 3, NOW(), NOW()),
('s-srv-cisco-rack', 'b-srv-cisco', 'dom-server', 'Rack Servers', 'srv-cisco-rack-seed26', 'Rack servers', true, 1, NOW(), NOW()),
('s-srv-cisco-blade', 'b-srv-cisco', 'dom-server', 'Blade Servers', 'srv-cisco-blade-seed26', 'Blade servers', true, 2, NOW(), NOW()),
('s-srv-fujitsu-rack', 'b-srv-fujitsu', 'dom-server', 'Rack Servers', 'srv-fujitsu-rack-seed26', 'Rack servers', true, 1, NOW(), NOW()),
('s-srv-hpe-rack', 'b-srv-hpe', 'dom-server', 'Rack Servers', 'srv-hpe-rack-seed26', 'Rack servers', true, 1, NOW(), NOW()),
('s-srv-ibm-rack', 'b-srv-ibm', 'dom-server', 'Rack Servers', 'srv-ibm-rack-seed26', 'Rack servers', true, 1, NOW(), NOW()),
('s-srv-lenovo-rack', 'b-srv-lenovo', 'dom-server', 'Rack Servers', 'srv-lenovo-rack-seed26', 'Rack servers', true, 1, NOW(), NOW()),
('s-srv-supermicro-rack', 'b-srv-supermicro', 'dom-server', 'Rack Servers', 'srv-supermicro-rack-seed26', 'Rack servers', true, 1, NOW(), NOW());

-- Series: Storage
INSERT INTO equipment_series (id, "brandId", "domainId", name, slug, description, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
('s-stg-dell-powervault', 'b-stg-dell-emc', 'dom-storage', 'PowerVault', 'stg-dell-powervault-seed26', 'PowerVault', true, 1, NOW(), NOW()),
('s-stg-dell-vnx', 'b-stg-dell-emc', 'dom-storage', 'VNX', 'stg-dell-vnx-seed26', 'VNX', true, 2, NOW(), NOW()),
('s-stg-dell-unity', 'b-stg-dell-emc', 'dom-storage', 'Unity', 'stg-dell-unity-seed26', 'Unity', true, 3, NOW(), NOW()),
('s-stg-hpe-main', 'b-stg-hpe', 'dom-storage', 'Storage Series', 'stg-hpe-main-seed26', 'Storage', true, 1, NOW(), NOW()),
('s-stg-ibm-main', 'b-stg-ibm', 'dom-storage', 'Storage Series', 'stg-ibm-main-seed26', 'Storage', true, 1, NOW(), NOW()),
('s-stg-lenovo-main', 'b-stg-lenovo', 'dom-storage', 'Storage Series', 'stg-lenovo-main-seed26', 'Storage', true, 1, NOW(), NOW()),
('s-stg-netapp-main', 'b-stg-netapp', 'dom-storage', 'Storage Series', 'stg-netapp-main-seed26', 'Storage', true, 1, NOW(), NOW()),
('s-stg-fujitsu-main', 'b-stg-fujitsu', 'dom-storage', 'Storage Series', 'stg-fujitsu-main-seed26', 'Storage', true, 1, NOW(), NOW());

-- Series: Network
INSERT INTO equipment_series (id, "brandId", "domainId", name, slug, description, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
('s-net-brocade-300', 'b-net-brocade', 'dom-network', 'Brocade 300 Series', 'net-brocade-300-seed26', 'Brocade 300', true, 1, NOW(), NOW()),
('s-net-brocade-600', 'b-net-brocade', 'dom-network', 'Brocade 600 Series', 'net-brocade-600-seed26', 'Brocade 600', true, 2, NOW(), NOW()),
('s-net-brocade-700', 'b-net-brocade', 'dom-network', 'Brocade 700 Series', 'net-brocade-700-seed26', 'Brocade 700', true, 3, NOW(), NOW()),
('s-net-brocade-6500', 'b-net-brocade', 'dom-network', 'Brocade 6500 Series', 'net-brocade-6500-seed26', 'Brocade 6500', true, 4, NOW(), NOW()),
('s-net-brocade-7000', 'b-net-brocade', 'dom-network', 'Brocade 7000 Series', 'net-brocade-7000-seed26', 'Brocade 7000', true, 5, NOW(), NOW()),
('s-net-cisco-main', 'b-net-cisco', 'dom-network', 'Cisco Network Series', 'net-cisco-main-seed26', 'Cisco network', true, 1, NOW(), NOW()),
('s-net-hpe-main', 'b-net-hpe', 'dom-network', 'HPE Network Series', 'net-hpe-main-seed26', 'HPE network', true, 1, NOW(), NOW());

-- Series: Products (used as category labels)
INSERT INTO equipment_series (id, "brandId", "domainId", name, slug, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
('s-prd-arista-1', 'b-prd-arista', 'dom-component', 'SWITCH', 'prd-arista-switch-seed26', true, 1, NOW(), NOW()),
('s-prd-arista-2', 'b-prd-arista', 'dom-component', 'CHASSIS', 'prd-arista-chassis-seed26', true, 2, NOW(), NOW()),
('s-prd-arista-3', 'b-prd-arista', 'dom-component', 'SFP', 'prd-arista-sfp-seed26', true, 3, NOW(), NOW()),
('s-prd-arista-4', 'b-prd-arista', 'dom-component', 'FAN / VENTILATEUR', 'prd-arista-fan-seed26', true, 4, NOW(), NOW()),

('s-prd-brocade-1', 'b-prd-brocade', 'dom-component', 'FAN / VENTILATEUR', 'prd-brocade-fan-seed26', true, 1, NOW(), NOW()),
('s-prd-brocade-2', 'b-prd-brocade', 'dom-component', 'SWITCH', 'prd-brocade-switch-seed26', true, 2, NOW(), NOW()),
('s-prd-brocade-3', 'b-prd-brocade', 'dom-component', 'PIECE DETACHEE', 'prd-brocade-piece-seed26', true, 3, NOW(), NOW()),
('s-prd-brocade-4', 'b-prd-brocade', 'dom-component', 'SFP', 'prd-brocade-sfp-seed26', true, 4, NOW(), NOW()),

('s-prd-cisco-1', 'b-prd-cisco', 'dom-component', 'SWITCH', 'prd-cisco-switch-seed26', true, 1, NOW(), NOW()),
('s-prd-cisco-2', 'b-prd-cisco', 'dom-component', 'POINT D''ACCES', 'prd-cisco-ap-seed26', true, 2, NOW(), NOW()),
('s-prd-cisco-3', 'b-prd-cisco', 'dom-component', 'ACCESSOIRES', 'prd-cisco-acc-seed26', true, 3, NOW(), NOW()),
('s-prd-cisco-4', 'b-prd-cisco', 'dom-component', 'ROUTEUR', 'prd-cisco-router-seed26', true, 4, NOW(), NOW()),

('s-prd-dell-1', 'b-prd-dell', 'dom-component', 'CPU / PROCESSEUR', 'prd-dell-cpu-seed26', true, 1, NOW(), NOW()),
('s-prd-dell-2', 'b-prd-dell', 'dom-component', 'DISQUE DUR', 'prd-dell-disk-seed26', true, 2, NOW(), NOW()),
('s-prd-dell-3', 'b-prd-dell', 'dom-component', 'MEMOIRES', 'prd-dell-ram-seed26', true, 3, NOW(), NOW()),
('s-prd-dell-4', 'b-prd-dell', 'dom-component', 'CARTE RESEAU', 'prd-dell-nic-seed26', true, 4, NOW(), NOW()),

('s-prd-emc-1', 'b-prd-emc', 'dom-component', 'ACCESSOIRES', 'prd-emc-acc-seed26', true, 1, NOW(), NOW()),
('s-prd-emc-2', 'b-prd-emc', 'dom-component', 'CABLE', 'prd-emc-cable-seed26', true, 2, NOW(), NOW()),
('s-prd-emc-3', 'b-prd-emc', 'dom-component', 'CPU / PROCESSEUR', 'prd-emc-cpu-seed26', true, 3, NOW(), NOW()),
('s-prd-emc-4', 'b-prd-emc', 'dom-component', 'CARTE MERE', 'prd-emc-mobo-seed26', true, 4, NOW(), NOW()),

('s-prd-fujitsu-1', 'b-prd-fujitsu', 'dom-component', 'CPU / PROCESSEUR', 'prd-fujitsu-cpu-seed26', true, 1, NOW(), NOW()),
('s-prd-fujitsu-2', 'b-prd-fujitsu', 'dom-component', 'DISQUE DUR', 'prd-fujitsu-disk-seed26', true, 2, NOW(), NOW()),
('s-prd-fujitsu-3', 'b-prd-fujitsu', 'dom-component', 'MEMOIRES', 'prd-fujitsu-ram-seed26', true, 3, NOW(), NOW()),
('s-prd-fujitsu-4', 'b-prd-fujitsu', 'dom-component', 'CARTE RESEAU', 'prd-fujitsu-nic-seed26', true, 4, NOW(), NOW()),

('s-prd-hitachi-1', 'b-prd-hitachi', 'dom-component', 'BATTERIE', 'prd-hitachi-battery-seed26', true, 1, NOW(), NOW()),
('s-prd-hitachi-2', 'b-prd-hitachi', 'dom-component', 'FAN / VENTILATEUR', 'prd-hitachi-fan-seed26', true, 2, NOW(), NOW()),
('s-prd-hitachi-3', 'b-prd-hitachi', 'dom-component', 'IO EXPANSIONS', 'prd-hitachi-io-seed26', true, 3, NOW(), NOW()),
('s-prd-hitachi-4', 'b-prd-hitachi', 'dom-component', 'SFP', 'prd-hitachi-sfp-seed26', true, 4, NOW(), NOW()),

('s-prd-hp-1', 'b-prd-hp', 'dom-component', 'CPU / PROCESSEUR', 'prd-hp-cpu-seed26', true, 1, NOW(), NOW()),
('s-prd-hp-2', 'b-prd-hp', 'dom-component', 'DISQUE DUR', 'prd-hp-disk-seed26', true, 2, NOW(), NOW()),
('s-prd-hp-3', 'b-prd-hp', 'dom-component', 'MEMOIRES', 'prd-hp-ram-seed26', true, 3, NOW(), NOW()),
('s-prd-hp-4', 'b-prd-hp', 'dom-component', 'CARTE RESEAU', 'prd-hp-nic-seed26', true, 4, NOW(), NOW()),

('s-prd-ibm-1', 'b-prd-ibm', 'dom-component', 'CPU / PROCESSEUR', 'prd-ibm-cpu-seed26', true, 1, NOW(), NOW()),
('s-prd-ibm-2', 'b-prd-ibm', 'dom-component', 'DISQUE DUR', 'prd-ibm-disk-seed26', true, 2, NOW(), NOW()),
('s-prd-ibm-3', 'b-prd-ibm', 'dom-component', 'MEMOIRES', 'prd-ibm-ram-seed26', true, 3, NOW(), NOW()),
('s-prd-ibm-4', 'b-prd-ibm', 'dom-component', 'CARTE RESEAU', 'prd-ibm-nic-seed26', true, 4, NOW(), NOW()),

('s-prd-lenovo-1', 'b-prd-lenovo', 'dom-component', 'CPU / PROCESSEUR', 'prd-lenovo-cpu-seed26', true, 1, NOW(), NOW()),
('s-prd-lenovo-2', 'b-prd-lenovo', 'dom-component', 'DISQUE DUR', 'prd-lenovo-disk-seed26', true, 2, NOW(), NOW()),
('s-prd-lenovo-3', 'b-prd-lenovo', 'dom-component', 'MEMOIRES', 'prd-lenovo-ram-seed26', true, 3, NOW(), NOW()),
('s-prd-lenovo-4', 'b-prd-lenovo', 'dom-component', 'CARTE RESEAU', 'prd-lenovo-nic-seed26', true, 4, NOW(), NOW()),

('s-prd-intel-1', 'b-prd-intel', 'dom-component', 'ADAPTATEUR', 'prd-intel-adapter-seed26', true, 1, NOW(), NOW()),
('s-prd-intel-2', 'b-prd-intel', 'dom-component', 'PIECE DETACHEE', 'prd-intel-piece-seed26', true, 2, NOW(), NOW()),
('s-prd-intel-3', 'b-prd-intel', 'dom-component', 'SFP', 'prd-intel-sfp-seed26', true, 3, NOW(), NOW()),
('s-prd-intel-4', 'b-prd-intel', 'dom-component', 'D''ALIMENTATION (PSU)', 'prd-intel-psu-seed26', true, 4, NOW(), NOW()),

('s-prd-seagate-1', 'b-prd-seagate', 'dom-component', 'DISQUE DUR', 'prd-seagate-disk-seed26', true, 1, NOW(), NOW()),
('s-prd-netapp-1', 'b-prd-netapp', 'dom-component', 'DISQUE DUR', 'prd-netapp-disk-seed26', true, 1, NOW(), NOW()),
('s-prd-netapp-2', 'b-prd-netapp', 'dom-component', 'D''ALIMENTATION (PSU)', 'prd-netapp-psu-seed26', true, 2, NOW(), NOW()),
('s-prd-netapp-3', 'b-prd-netapp', 'dom-component', 'ACCESSOIRES', 'prd-netapp-acc-seed26', true, 3, NOW(), NOW()),
('s-prd-juniper-1', 'b-prd-juniper', 'dom-component', 'PARE-FEU', 'prd-juniper-fw-seed26', true, 1, NOW(), NOW()),
('s-prd-juniper-2', 'b-prd-juniper', 'dom-component', 'SWITCH', 'prd-juniper-switch-seed26', true, 2, NOW(), NOW()),
('s-prd-juniper-3', 'b-prd-juniper', 'dom-component', 'SFP', 'prd-juniper-sfp-seed26', true, 3, NOW(), NOW()),
('s-prd-juniper-4', 'b-prd-juniper', 'dom-component', 'D''ALIMENTATION (PSU)', 'prd-juniper-psu-seed26', true, 4, NOW(), NOW()),

('s-prd-supermicro-1', 'b-prd-supermicro', 'dom-component', 'CPU / PROCESSEUR', 'prd-supermicro-cpu-seed26', true, 1, NOW(), NOW()),
('s-prd-supermicro-2', 'b-prd-supermicro', 'dom-component', 'DISQUE DUR', 'prd-supermicro-disk-seed26', true, 2, NOW(), NOW()),
('s-prd-supermicro-3', 'b-prd-supermicro', 'dom-component', 'MEMOIRES', 'prd-supermicro-ram-seed26', true, 3, NOW(), NOW()),
('s-prd-supermicro-4', 'b-prd-supermicro', 'dom-component', 'CARTE RESEAU', 'prd-supermicro-nic-seed26', true, 4, NOW(), NOW()),

('s-prd-renewlink-1', 'b-prd-renewlink', 'dom-component', 'SFP', 'prd-renewlink-sfp-seed26', true, 1, NOW(), NOW()),
('s-prd-renewlink-2', 'b-prd-renewlink', 'dom-component', 'CABLE', 'prd-renewlink-cable-seed26', true, 2, NOW(), NOW()),
('s-prd-renewlink-3', 'b-prd-renewlink', 'dom-component', 'ACCESSOIRES', 'prd-renewlink-acc-seed26', true, 3, NOW(), NOW()),
('s-prd-renewlink-4', 'b-prd-renewlink', 'dom-component', 'SWITCH', 'prd-renewlink-switch-seed26', true, 4, NOW(), NOW()),

('s-prd-nvidia-1', 'b-prd-nvidia', 'dom-component', 'CARTE GRAPHIQUE', 'prd-nvidia-gpu-seed26', true, 1, NOW(), NOW()),
('s-prd-nvidia-2', 'b-prd-nvidia', 'dom-component', 'SWITCH', 'prd-nvidia-switch-seed26', true, 2, NOW(), NOW()),
('s-prd-nvidia-3', 'b-prd-nvidia', 'dom-component', 'CARTE RESEAU', 'prd-nvidia-nic-seed26', true, 3, NOW(), NOW()),
('s-prd-nvidia-4', 'b-prd-nvidia', 'dom-component', 'PIECE DETACHEE', 'prd-nvidia-piece-seed26', true, 4, NOW(), NOW()),

('s-prd-amd-1', 'b-prd-amd', 'dom-component', 'CPU / PROCESSEUR', 'prd-amd-cpu-seed26', true, 1, NOW(), NOW());

-- Models: Server (names from captures)
INSERT INTO equipment_models (id, "brandId", "seriesId", "domainId", name, slug, reference, "basePrice", status, "isConfigurable", "stockQty", condition, "createdAt", "updatedAt") VALUES
('m-srv-dell-r430', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R430', 'srv-dell-r430-seed26', 'SRV-R430', 4200, 'AVAILABLE', true, 10, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r730', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R730', 'srv-dell-r730-seed26', 'SRV-R730', 5200, 'AVAILABLE', true, 8, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r930', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R930', 'srv-dell-r930-seed26', 'SRV-R930', 6900, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r540', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R540', 'srv-dell-r540-seed26', 'SRV-R540', 5100, 'AVAILABLE', true, 7, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r740', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R740', 'srv-dell-r740-seed26', 'SRV-R740', 6200, 'AVAILABLE', true, 8, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r740xd2', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R740XD2', 'srv-dell-r740xd2-seed26', 'SRV-R740XD2', 6500, 'AVAILABLE', true, 5, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r650', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R650', 'srv-dell-r650-seed26', 'SRV-R650', 6000, 'AVAILABLE', true, 7, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r750', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R750', 'srv-dell-r750-seed26', 'SRV-R750', 7300, 'AVAILABLE', true, 5, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r6515', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R6515', 'srv-dell-r6515-seed26', 'SRV-R6515', 5800, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r7425', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R7425', 'srv-dell-r7425-seed26', 'SRV-R7425', 6100, 'AVAILABLE', true, 4, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r7525', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R7525', 'srv-dell-r7525-seed26', 'SRV-R7525', 6900, 'AVAILABLE', true, 4, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r630', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R630', 'srv-dell-r630-seed26', 'SRV-R630', 4300, 'AVAILABLE', true, 7, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r730xd', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R730XD', 'srv-dell-r730xd-seed26', 'SRV-R730XD', 5600, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r440', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R440', 'srv-dell-r440-seed26', 'SRV-R440', 4700, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r640', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R640', 'srv-dell-r640-seed26', 'SRV-R640', 5900, 'AVAILABLE', true, 5, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r740xd', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R740XD', 'srv-dell-r740xd-seed26', 'SRV-R740XD', 6400, 'AVAILABLE', true, 5, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r940', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R940', 'srv-dell-r940-seed26', 'SRV-R940', 8900, 'AVAILABLE', true, 3, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r650xs', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R650XS', 'srv-dell-r650xs-seed26', 'SRV-R650XS', 6100, 'AVAILABLE', true, 5, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r6415', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R6415', 'srv-dell-r6415-seed26', 'SRV-R6415', 5500, 'AVAILABLE', true, 5, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r6525', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R6525', 'srv-dell-r6525-seed26', 'SRV-R6525', 6900, 'AVAILABLE', true, 4, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-r7515', 'b-srv-dell-emc', 's-srv-dell-rack', 'dom-server', 'PowerEdge R7515', 'srv-dell-r7515-seed26', 'SRV-R7515', 6700, 'AVAILABLE', true, 4, 'REFURBISHED', NOW(), NOW()),

('m-srv-dell-t330', 'b-srv-dell-emc', 's-srv-dell-tower', 'dom-server', 'PowerEdge T330', 'srv-dell-t330-seed26', 'SRV-T330', 3500, 'AVAILABLE', true, 8, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-t440', 'b-srv-dell-emc', 's-srv-dell-tower', 'dom-server', 'PowerEdge T440', 'srv-dell-t440-seed26', 'SRV-T440', 4500, 'AVAILABLE', true, 7, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-t630', 'b-srv-dell-emc', 's-srv-dell-tower', 'dom-server', 'PowerEdge T630', 'srv-dell-t630-seed26', 'SRV-T630', 5200, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-t640', 'b-srv-dell-emc', 's-srv-dell-tower', 'dom-server', 'PowerEdge T640', 'srv-dell-t640-seed26', 'SRV-T640', 5600, 'AVAILABLE', true, 5, 'REFURBISHED', NOW(), NOW()),

('m-srv-dell-m630', 'b-srv-dell-emc', 's-srv-dell-blade', 'dom-server', 'PowerEdge M630', 'srv-dell-m630-seed26', 'SRV-M630', 4800, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-fc630', 'b-srv-dell-emc', 's-srv-dell-blade', 'dom-server', 'PowerEdge FC630', 'srv-dell-fc630-seed26', 'SRV-FC630', 5000, 'AVAILABLE', true, 4, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-m640', 'b-srv-dell-emc', 's-srv-dell-blade', 'dom-server', 'PowerEdge M640', 'srv-dell-m640-seed26', 'SRV-M640', 5600, 'AVAILABLE', true, 5, 'REFURBISHED', NOW(), NOW()),
('m-srv-dell-fc640', 'b-srv-dell-emc', 's-srv-dell-blade', 'dom-server', 'PowerEdge FC640', 'srv-dell-fc640-seed26', 'SRV-FC640', 5800, 'AVAILABLE', true, 3, 'REFURBISHED', NOW(), NOW()),

('m-srv-cisco-c220m4', 'b-srv-cisco', 's-srv-cisco-rack', 'dom-server', 'UCS C220 M4', 'srv-cisco-c220m4-seed26', 'UCS-C220-M4', 3900, 'AVAILABLE', true, 8, 'REFURBISHED', NOW(), NOW()),
('m-srv-cisco-c220m5', 'b-srv-cisco', 's-srv-cisco-rack', 'dom-server', 'UCS C220 M5', 'srv-cisco-c220m5-seed26', 'UCS-C220-M5', 4600, 'AVAILABLE', true, 7, 'REFURBISHED', NOW(), NOW()),
('m-srv-cisco-c220m6', 'b-srv-cisco', 's-srv-cisco-rack', 'dom-server', 'UCS C220 M6', 'srv-cisco-c220m6-seed26', 'UCS-C220-M6', 5300, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-srv-cisco-c240m4', 'b-srv-cisco', 's-srv-cisco-rack', 'dom-server', 'UCS C240 M4', 'srv-cisco-c240m4-seed26', 'UCS-C240-M4', 4200, 'AVAILABLE', true, 8, 'REFURBISHED', NOW(), NOW()),
('m-srv-cisco-c240m5', 'b-srv-cisco', 's-srv-cisco-rack', 'dom-server', 'UCS C240 M5', 'srv-cisco-c240m5-seed26', 'UCS-C240-M5', 4900, 'AVAILABLE', true, 7, 'REFURBISHED', NOW(), NOW()),
('m-srv-cisco-c240m6', 'b-srv-cisco', 's-srv-cisco-rack', 'dom-server', 'UCS C240 M6', 'srv-cisco-c240m6-seed26', 'UCS-C240-M6', 5600, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-srv-cisco-b200m3', 'b-srv-cisco', 's-srv-cisco-blade', 'dom-server', 'UCS B200 M3', 'srv-cisco-b200m3-seed26', 'UCS-B200-M3', 3500, 'AVAILABLE', true, 8, 'REFURBISHED', NOW(), NOW()),
('m-srv-cisco-b200m4', 'b-srv-cisco', 's-srv-cisco-blade', 'dom-server', 'UCS B200 M4', 'srv-cisco-b200m4-seed26', 'UCS-B200-M4', 4200, 'AVAILABLE', true, 7, 'REFURBISHED', NOW(), NOW()),
('m-srv-cisco-b200m5', 'b-srv-cisco', 's-srv-cisco-blade', 'dom-server', 'UCS B200 M5', 'srv-cisco-b200m5-seed26', 'UCS-B200-M5', 4900, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-srv-cisco-b200m6', 'b-srv-cisco', 's-srv-cisco-blade', 'dom-server', 'UCS B200 M6', 'srv-cisco-b200m6-seed26', 'UCS-B200-M6', 5600, 'AVAILABLE', true, 5, 'REFURBISHED', NOW(), NOW());

-- Models: Storage (names from captures)
INSERT INTO equipment_models (id, "brandId", "seriesId", "domainId", name, slug, reference, "basePrice", status, "isConfigurable", "stockQty", condition, "createdAt", "updatedAt") VALUES
('m-stg-pv-md1200', 'b-stg-dell-emc', 's-stg-dell-powervault', 'dom-storage', 'MD1200', 'stg-pv-md1200-seed26', 'STG-MD1200', 1700, 'AVAILABLE', true, 10, 'REFURBISHED', NOW(), NOW()),
('m-stg-pv-md1420', 'b-stg-dell-emc', 's-stg-dell-powervault', 'dom-storage', 'MD1420', 'stg-pv-md1420-seed26', 'STG-MD1420', 1800, 'AVAILABLE', true, 10, 'REFURBISHED', NOW(), NOW()),
('m-stg-pv-md3220', 'b-stg-dell-emc', 's-stg-dell-powervault', 'dom-storage', 'MD3220', 'stg-pv-md3220-seed26', 'STG-MD3220', 2100, 'AVAILABLE', true, 9, 'REFURBISHED', NOW(), NOW()),
('m-stg-pv-md3420', 'b-stg-dell-emc', 's-stg-dell-powervault', 'dom-storage', 'MD3420', 'stg-pv-md3420-seed26', 'STG-MD3420', 2200, 'AVAILABLE', true, 9, 'REFURBISHED', NOW(), NOW()),
('m-stg-pv-md3620', 'b-stg-dell-emc', 's-stg-dell-powervault', 'dom-storage', 'MD3620', 'stg-pv-md3620-seed26', 'STG-MD3620', 2400, 'AVAILABLE', true, 8, 'REFURBISHED', NOW(), NOW()),
('m-stg-pv-md3820', 'b-stg-dell-emc', 's-stg-dell-powervault', 'dom-storage', 'MD3820', 'stg-pv-md3820-seed26', 'STG-MD3820', 2600, 'AVAILABLE', true, 8, 'REFURBISHED', NOW(), NOW()),
('m-stg-pv-me5024', 'b-stg-dell-emc', 's-stg-dell-powervault', 'dom-storage', 'ME5024', 'stg-pv-me5024-seed26', 'STG-ME5024', 3400, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-stg-pv-md1220', 'b-stg-dell-emc', 's-stg-dell-powervault', 'dom-storage', 'MD1220', 'stg-pv-md1220-seed26', 'STG-MD1220', 1750, 'AVAILABLE', true, 10, 'REFURBISHED', NOW(), NOW()),
('m-stg-pv-md3200', 'b-stg-dell-emc', 's-stg-dell-powervault', 'dom-storage', 'MD3200', 'stg-pv-md3200-seed26', 'STG-MD3200', 2050, 'AVAILABLE', true, 9, 'REFURBISHED', NOW(), NOW()),
('m-stg-pv-md3400', 'b-stg-dell-emc', 's-stg-dell-powervault', 'dom-storage', 'MD3400', 'stg-pv-md3400-seed26', 'STG-MD3400', 2250, 'AVAILABLE', true, 9, 'REFURBISHED', NOW(), NOW()),
('m-stg-pv-md3600', 'b-stg-dell-emc', 's-stg-dell-powervault', 'dom-storage', 'MD3600', 'stg-pv-md3600-seed26', 'STG-MD3600', 2450, 'AVAILABLE', true, 8, 'REFURBISHED', NOW(), NOW()),
('m-stg-pv-md3660', 'b-stg-dell-emc', 's-stg-dell-powervault', 'dom-storage', 'MD3660', 'stg-pv-md3660-seed26', 'STG-MD3660', 2550, 'AVAILABLE', true, 8, 'REFURBISHED', NOW(), NOW()),
('m-stg-pv-me4024', 'b-stg-dell-emc', 's-stg-dell-powervault', 'dom-storage', 'ME4024', 'stg-pv-me4024-seed26', 'STG-ME4024', 3200, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),

('m-stg-vnx-5100', 'b-stg-dell-emc', 's-stg-dell-vnx', 'dom-storage', '5100', 'stg-vnx-5100-seed26', 'STG-VNX-5100', 2800, 'AVAILABLE', true, 7, 'REFURBISHED', NOW(), NOW()),
('m-stg-vnx-5300', 'b-stg-dell-emc', 's-stg-dell-vnx', 'dom-storage', '5300', 'stg-vnx-5300-seed26', 'STG-VNX-5300', 3000, 'AVAILABLE', true, 7, 'REFURBISHED', NOW(), NOW()),
('m-stg-vnx-5500', 'b-stg-dell-emc', 's-stg-dell-vnx', 'dom-storage', '5500', 'stg-vnx-5500-seed26', 'STG-VNX-5500', 3200, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-stg-vnx-7600', 'b-stg-dell-emc', 's-stg-dell-vnx', 'dom-storage', '7600', 'stg-vnx-7600-seed26', 'STG-VNX-7600', 3900, 'AVAILABLE', true, 5, 'REFURBISHED', NOW(), NOW()),
('m-stg-vnx-5200', 'b-stg-dell-emc', 's-stg-dell-vnx', 'dom-storage', '5200', 'stg-vnx-5200-seed26', 'STG-VNX-5200', 2900, 'AVAILABLE', true, 7, 'REFURBISHED', NOW(), NOW()),
('m-stg-vnx-5400', 'b-stg-dell-emc', 's-stg-dell-vnx', 'dom-storage', '5400', 'stg-vnx-5400-seed26', 'STG-VNX-5400', 3100, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-stg-vnx-5600', 'b-stg-dell-emc', 's-stg-dell-vnx', 'dom-storage', '5600', 'stg-vnx-5600-seed26', 'STG-VNX-5600', 3300, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),

('m-stg-unity-300', 'b-stg-dell-emc', 's-stg-dell-unity', 'dom-storage', 'Unity 300', 'stg-unity-300-seed26', 'STG-UNITY-300', 2600, 'AVAILABLE', true, 7, 'REFURBISHED', NOW(), NOW()),
('m-stg-unity-350f', 'b-stg-dell-emc', 's-stg-dell-unity', 'dom-storage', 'Unity 350F', 'stg-unity-350f-seed26', 'STG-UNITY-350F', 2900, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-stg-unity-400', 'b-stg-dell-emc', 's-stg-dell-unity', 'dom-storage', 'Unity 400', 'stg-unity-400-seed26', 'STG-UNITY-400', 3000, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-stg-unity-480xt', 'b-stg-dell-emc', 's-stg-dell-unity', 'dom-storage', 'Unity 480XT', 'stg-unity-480xt-seed26', 'STG-UNITY-480XT', 3600, 'AVAILABLE', true, 5, 'REFURBISHED', NOW(), NOW()),
('m-stg-unity-300f', 'b-stg-dell-emc', 's-stg-dell-unity', 'dom-storage', 'Unity 300F', 'stg-unity-300f-seed26', 'STG-UNITY-300F', 2800, 'AVAILABLE', true, 6, 'REFURBISHED', NOW(), NOW()),
('m-stg-unity-380xt', 'b-stg-dell-emc', 's-stg-dell-unity', 'dom-storage', 'Unity 380XT', 'stg-unity-380xt-seed26', 'STG-UNITY-380XT', 3400, 'AVAILABLE', true, 5, 'REFURBISHED', NOW(), NOW()),
('m-stg-unity-480fxt', 'b-stg-dell-emc', 's-stg-dell-unity', 'dom-storage', 'Unity 480FXT', 'stg-unity-480fxt-seed26', 'STG-UNITY-480FXT', 3900, 'AVAILABLE', true, 4, 'REFURBISHED', NOW(), NOW());

-- Models: Network
INSERT INTO equipment_models (id, "brandId", "seriesId", "domainId", name, slug, reference, "basePrice", status, "isConfigurable", "stockQty", condition, "createdAt", "updatedAt") VALUES
('m-net-brocade-300', 'b-net-brocade', 's-net-brocade-300', 'dom-network', 'Brocade 300', 'net-brocade-300-seed26', 'NET-BR-300', 1200, 'AVAILABLE', true, 12, 'REFURBISHED', NOW(), NOW()),
('m-net-brocade-g610', 'b-net-brocade', 's-net-brocade-600', 'dom-network', 'Brocade G610', 'net-brocade-g610-seed26', 'NET-BR-G610', 1800, 'AVAILABLE', true, 10, 'REFURBISHED', NOW(), NOW()),
('m-net-brocade-g630', 'b-net-brocade', 's-net-brocade-600', 'dom-network', 'Brocade G630', 'net-brocade-g630-seed26', 'NET-BR-G630', 2200, 'AVAILABLE', true, 8, 'REFURBISHED', NOW(), NOW()),
('m-net-brocade-g620', 'b-net-brocade', 's-net-brocade-600', 'dom-network', 'Brocade G620', 'net-brocade-g620-seed26', 'NET-BR-G620', 2100, 'AVAILABLE', true, 8, 'REFURBISHED', NOW(), NOW());

COMMIT;

-- Quick checks
SELECT 'domains' AS table_name, COUNT(*) AS seeded_count
FROM equipment_domains
WHERE code IN ('SERVER', 'STORAGE', 'NETWORK', 'COMPONENT')
UNION ALL
SELECT 'brands', COUNT(*) FROM equipment_brands WHERE "domainId" IN ('dom-server', 'dom-storage', 'dom-network', 'dom-component')
UNION ALL
SELECT 'series', COUNT(*) FROM equipment_series WHERE "domainId" IN ('dom-server', 'dom-storage', 'dom-network', 'dom-component')
UNION ALL
SELECT 'models', COUNT(*) FROM equipment_models WHERE "domainId" IN ('dom-server', 'dom-storage', 'dom-network', 'dom-component');
