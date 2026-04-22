CREATE TABLE IF NOT EXISTS product_compatibilities (
  part_product_id INT NOT NULL,
  target_product_id INT NOT NULL,
  PRIMARY KEY (part_product_id, target_product_id),
  CONSTRAINT product_compatibilities_part_product_id_fkey
    FOREIGN KEY (part_product_id)
    REFERENCES catalog_products(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT product_compatibilities_target_product_id_fkey
    FOREIGN KEY (target_product_id)
    REFERENCES catalog_products(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS product_compatibilities_target_product_id_idx
  ON product_compatibilities(target_product_id);
