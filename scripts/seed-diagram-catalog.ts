import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding catalog data...')

  // Create Brands
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { name: 'ARISTA' },
      update: {},
      create: { name: 'ARISTA' },
    }),
    prisma.brand.upsert({
      where: { name: 'BROCADE' },
      update: {},
      create: { name: 'BROCADE' },
    }),
    prisma.brand.upsert({
      where: { name: 'CISCO' },
      update: {},
      create: { name: 'CISCO' },
    }),
    prisma.brand.upsert({
      where: { name: 'DELL' },
      update: {},
      create: { name: 'DELL' },
    }),
    prisma.brand.upsert({
      where: { name: 'FUJITSU' },
      update: {},
      create: { name: 'FUJITSU' },
    }),
  ])

  // Create Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Produits' },
      update: {},
      create: { name: 'Produits' },
    }),
    prisma.category.upsert({
      where: { name: 'Serveur-configurateur' },
      update: {},
      create: { name: 'Serveur-configurateur' },
    }),
    prisma.category.upsert({
      where: { name: 'Storage-configurateur' },
      update: {},
      create: { name: 'Storage-configurateur' },
    }),
  ])

  const productsCategory = categories[0]
  const serverCategory = categories[1]

  // Create Families for Products
  const families = await Promise.all([
    prisma.family.upsert({
      where: { name_category_id: { name: 'SWITCH', category_id: productsCategory.id } },
      update: {},
      create: { name: 'SWITCH', category_id: productsCategory.id },
    }),
    prisma.family.upsert({
      where: { name_category_id: { name: 'CHASSIS', category_id: productsCategory.id } },
      update: {},
      create: { name: 'CHASSIS', category_id: productsCategory.id },
    }),
    prisma.family.upsert({
      where: { name_category_id: { name: 'CPU / PROCESSEUR', category_id: serverCategory.id } },
      update: {},
      create: { name: 'CPU / PROCESSEUR', category_id: serverCategory.id },
    }),
  ])

  // Create Filters
  const filters = await Promise.all([
    prisma.filter.upsert({
      where: { name: 'Ports' },
      update: {},
      create: { name: 'Ports' },
    }),
    prisma.filter.upsert({
      where: { name: 'PoE' },
      update: {},
      create: { name: 'PoE' },
    }),
    prisma.filter.upsert({
      where: { name: 'Interface' },
      update: {},
      create: { name: 'Interface' },
    }),
  ])

  // Create Filter Values
  const filterValues = await Promise.all([
    prisma.filterValue.upsert({
      where: { value_filter_id: { value: '24', filter_id: filters[0].id } },
      update: {},
      create: { value: '24', filter_id: filters[0].id },
    }),
    prisma.filterValue.upsert({
      where: { value_filter_id: { value: '36', filter_id: filters[0].id } },
      update: {},
      create: { value: '36', filter_id: filters[0].id },
    }),
    prisma.filterValue.upsert({
      where: { value_filter_id: { value: '48', filter_id: filters[0].id } },
      update: {},
      create: { value: '48', filter_id: filters[0].id },
    }),
    prisma.filterValue.upsert({
      where: { value_filter_id: { value: 'Non', filter_id: filters[1].id } },
      update: {},
      create: { value: 'Non', filter_id: filters[1].id },
    }),
    prisma.filterValue.upsert({
      where: { value_filter_id: { value: 'BASE-T', filter_id: filters[2].id } },
      update: {},
      create: { value: 'BASE-T', filter_id: filters[2].id },
    }),
    prisma.filterValue.upsert({
      where: { value_filter_id: { value: 'SFP', filter_id: filters[2].id } },
      update: {},
      create: { value: 'SFP', filter_id: filters[2].id },
    }),
  ])

  // Create Products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { name_brand_id_family_id: { name: 'ARISTA DCS-7010T-48-DC', brand_id: brands[0].id, family_id: families[0].id } },
      update: {},
      create: {
        name: 'ARISTA DCS-7010T-48-DC',
        base_price: 910.0,
        type: 'STANDARD',
        brand_id: brands[0].id,
        family_id: families[0].id,
        category_id: productsCategory.id,
      },
    }),
    prisma.product.upsert({
      where: { name_brand_id_family_id: { name: 'ARISTA DCS-7010T-48-F', brand_id: brands[0].id, family_id: families[0].id } },
      update: {},
      create: {
        name: 'ARISTA DCS-7010T-48-F',
        base_price: 245.0,
        type: 'STANDARD',
        brand_id: brands[0].id,
        family_id: families[0].id,
        category_id: productsCategory.id,
      },
    }),
    prisma.product.upsert({
      where: { name_brand_id_family_id: { name: 'DELL PowerEdge R430', brand_id: brands[3].id, family_id: families[2].id } },
      update: {},
      create: {
        name: 'DELL PowerEdge R430',
        base_price: 168.0,
        type: 'CONFIGURABLE',
        brand_id: brands[3].id,
        family_id: families[2].id,
        category_id: serverCategory.id,
      },
    }),
  ])

  // Create Configuration Options for Configurable Products
  const configurableProduct = products[2]
  const cpuOption = await prisma.configurationOption.upsert({
    where: { name_product_id: { name: 'CPU', product_id: configurableProduct.id } },
    update: {},
    create: { name: 'CPU', product_id: configurableProduct.id },
  })

  const psuOption = await prisma.configurationOption.upsert({
    where: { name_product_id: { name: 'Power Supplies', product_id: configurableProduct.id } },
    update: {},
    create: { name: 'Power Supplies', product_id: configurableProduct.id },
  })

  // Create Configuration Values
  await Promise.all([
    prisma.configurationValue.upsert({
      where: { value_configuration_option_id: { value: 'DELL - Intel E5-2623v3 3.00GHz 4-Core 10M 105W', configuration_option_id: cpuOption.id } },
      update: {},
      create: {
        value: 'DELL - Intel E5-2623v3 3.00GHz 4-Core 10M 105W',
        price: 20.0,
        configuration_option_id: cpuOption.id,
      },
    }),
    prisma.configurationValue.upsert({
      where: { value_configuration_option_id: { value: 'DELL - PSU 550W R430 R530', configuration_option_id: psuOption.id } },
      update: {},
      create: {
        value: 'DELL - PSU 550W R430 R530',
        price: 70.0,
        configuration_option_id: psuOption.id,
      },
    }),
  ])

  // Create Product Filter Values
  await Promise.all([
    prisma.productFilterValue.upsert({
      where: { product_id_filter_value_id: { product_id: products[0].id, filter_value_id: filterValues[2].id } },
      update: {},
      create: { product_id: products[0].id, filter_value_id: filterValues[2].id },
    }),
    prisma.productFilterValue.upsert({
      where: { product_id_filter_value_id: { product_id: products[0].id, filter_value_id: filterValues[3].id } },
      update: {},
      create: { product_id: products[0].id, filter_value_id: filterValues[3].id },
    }),
    prisma.productFilterValue.upsert({
      where: { product_id_filter_value_id: { product_id: products[0].id, filter_value_id: filterValues[5].id } },
      update: {},
      create: { product_id: products[0].id, filter_value_id: filterValues[5].id },
    }),
  ])

  console.log('✅ Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
