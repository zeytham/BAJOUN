import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed imezimwa. Haiundi nenosiri la kuanzia na haifuti stoo.');
  return;

  // Clean existing products and units for a fresh seed
  await prisma.saleItem.deleteMany();
  await prisma.phoneUnit.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productCompatibility.deleteMany();
  await prisma.product.deleteMany();
  await prisma.phoneModel.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();

  // 1. Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@phoneshop.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@phoneshop.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log('👤 Admin user seeded:', admin.email);

  // 2. Seed Brands
  const brandData = [
    { name: 'Apple', logo: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=200&q=80' },
    { name: 'Samsung', logo: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=200&q=80' },
    { name: 'Anker', logo: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=200&q=80' },
    { name: 'Oraimo', logo: '' },
    { name: 'Baseus', logo: '' },
    { name: 'JBL', logo: '' },
    { name: 'Xiaomi', logo: '' },
    { name: 'Tecno', logo: '' },
  ];

  const brands = {};
  for (const b of brandData) {
    const created = await prisma.brand.upsert({
      where: { name: b.name },
      update: {},
      create: b,
    });
    brands[b.name] = created.id;
  }
  console.log('🏷️ Brands seeded');

  // 3. Seed Categories
  const categoryData = [
    { name: 'Smartphones & Tablets', slug: 'smartphones', icon: 'Smartphone', description: 'Phones tracked by IMEI' },
    { name: 'Chargers & Power', slug: 'chargers', icon: 'Zap', description: 'Fast wall chargers, car adapters & GaN blocks' },
    { name: 'Audio & AirPods', slug: 'audio', icon: 'Headphones', description: 'AirPods, TWS Wireless Earbuds & Bluetooth Speakers' },
    { name: 'Power Banks', slug: 'power-banks', icon: 'BatteryCharging', description: 'Portable MagSafe & Fast-charge battery packs' },
    { name: 'Smartwatches & Straps', slug: 'smartwatches', icon: 'Watch', description: 'Smartwatches, fitness trackers & straps' },
    { name: 'Covers & Skins', slug: 'covers-skins', icon: 'Shield', description: 'Phone covers, MagSafe cases & back vinyl skins' },
    { name: 'Screen Protectors', slug: 'screen-protectors', icon: 'Maximize2', description: 'Privacy glass, matte gaming guards & UV curved glass' },
    { name: 'Cables & Adapters', slug: 'cables', icon: 'Cable', description: 'Type-C, Lightning, 3-in-1 braided cables & OTG adapters' },
    { name: 'Storage & Memory', slug: 'storage', icon: 'HardDrive', description: 'MicroSD cards & Dual OTG flash drives' },
    { name: 'Spare Parts & Tools', slug: 'spare-parts', icon: 'Wrench', description: 'Replacement screens, batteries & ports' },
  ];

  const categories = {};
  for (const c of categoryData) {
    const created = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
    categories[c.slug] = created.id;
  }
  console.log('📁 Categories seeded');

  // 4. Seed Phone Models
  const phoneModels = [
    { brandId: brands['Apple'], modelName: 'iPhone 15 Pro Max', modelCode: 'A3106', releaseYear: 2023, screenSize: '6.7"' },
    { brandId: brands['Apple'], modelName: 'iPhone 14 Pro', modelCode: 'A2890', releaseYear: 2022, screenSize: '6.1"' },
    { brandId: brands['Samsung'], modelName: 'Galaxy S24 Ultra', modelCode: 'SM-S928B', releaseYear: 2024, screenSize: '6.8"' },
    { brandId: brands['Samsung'], modelName: 'Galaxy A54 5G', modelCode: 'SM-A546B', releaseYear: 2023, screenSize: '6.4"' },
    { brandId: brands['Tecno'], modelName: 'Camon 30 Pro', modelCode: 'CL8', releaseYear: 2024, screenSize: '6.78"' },
  ];

  const seededModels = [];
  for (const pm of phoneModels) {
    const created = await prisma.phoneModel.create({ data: pm });
    seededModels.push(created);
  }
  console.log('📱 Phone Models seeded');

  // 5. Seed Products & Inventory Items

  // Item 1: iPhone 15 Pro Max (PHONE Product with IMEIs)
  const iphoneProduct = await prisma.product.create({
    data: {
      name: 'iPhone 15 Pro Max',
      type: 'PHONE',
      categoryId: categories['smartphones'],
      brandId: brands['Apple'],
      description: 'Titanium design, A17 Pro chip, 48MP camera system with 5x Telephoto lens.',
      imageUrls: JSON.stringify(['https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80']),
      hasVariants: false,
      specifications: JSON.stringify({ chipset: 'A17 Pro', display: '6.7" Super Retina XDR OLED 120Hz', camera: '48MP Main + 12MP 5x Telephoto' }),
      phoneUnits: {
        create: [
          {
            imei1: '358921104829101',
            imei2: '358921104829102',
            serialNumber: 'DX7K90123L1',
            condition: 'NEW_SEALED',
            color: 'Natural Titanium',
            storage: '256GB',
            ram: '8GB',
            buyingPrice: 2400000,
            retailPrice: 2850000,
            minSellingPrice: 2750000,
            status: 'IN_STOCK',
            warrantyMonths: 12,
          },
          {
            imei1: '358921104829103',
            imei2: '358921104829104',
            serialNumber: 'DX7K90123L2',
            condition: 'USED_LIKE_NEW',
            color: 'Black Titanium',
            storage: '512GB',
            ram: '8GB',
            batteryHealth: 98,
            buyingPrice: 2600000,
            retailPrice: 3100000,
            minSellingPrice: 2980000,
            status: 'IN_STOCK',
            warrantyMonths: 6,
          },
        ],
      },
    },
  });

  // Item 2: Anker 20W Nano Fast Charger (Single Product)
  await prisma.product.create({
    data: {
      name: 'Anker 20W Nano USB-C Fast Charger',
      type: 'GADGET',
      categoryId: categories['chargers'],
      brandId: brands['Anker'],
      description: 'Ultra-compact 20W PD fast wall charger for iPhone & Android.',
      imageUrls: JSON.stringify(['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80']),
      hasVariants: false,
      basePrice: 45000,
      costPrice: 28000,
      stockQuantity: 25,
      barcode: '694801230011',
      sku: 'ANK-CHG-20W',
      reorderLevel: 5,
      specifications: JSON.stringify({ wattage: '20W PD', port: 'USB-C', technology: 'PowerIQ 3.0' }),
    },
  });

  // Item 3: AirPods Pro 2 Wireless Earbuds
  await prisma.product.create({
    data: {
      name: 'Apple AirPods Pro (2nd Gen) USB-C',
      type: 'GADGET',
      categoryId: categories['audio'],
      brandId: brands['Apple'],
      description: 'Active Noise Cancellation, Transparency mode, MagSafe charging case with speaker.',
      imageUrls: JSON.stringify(['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=600&q=80']),
      hasVariants: false,
      basePrice: 580000,
      costPrice: 480000,
      stockQuantity: 8,
      barcode: '194253397168',
      sku: 'APP-AIRPODS-PRO2',
      reorderLevel: 2,
      specifications: JSON.stringify({ bluetooth: '5.3', batteryLife: '30 hours with case', anc: true, connector: 'USB-C' }),
    },
  });

  // Item 4: MagSafe Armor Silicone Case (Multi-Variant Product: Color x Compatibility)
  const caseProduct = await prisma.product.create({
    data: {
      name: 'MagSafe Shield Armor Silicone Case',
      type: 'ACCESSORY',
      categoryId: categories['covers-skins'],
      brandId: brands['Apple'],
      description: 'Premium soft silicone case with built-in N52 MagSafe magnetic ring.',
      imageUrls: JSON.stringify(['https://images.unsplash.com/photo-1603313011101-320f26a4f6f6?auto=format&fit=crop&w=600&q=80']),
      hasVariants: true,
      variants: {
        create: [
          {
            sku: 'COV-MAG-15PM-BLK',
            barcode: '88019283001',
            color: 'Black',
            size: 'iPhone 15 Pro Max',
            material: 'Silicone + MagSafe Ring',
            price: 25000,
            costPrice: 12000,
            stockQuantity: 18,
            reorderLevel: 5,
          },
          {
            sku: 'COV-MAG-15PM-CLR',
            barcode: '88019283002',
            color: 'Transparent Clear',
            size: 'iPhone 15 Pro Max',
            material: 'Clear Acrylic + MagSafe',
            price: 25000,
            costPrice: 12000,
            stockQuantity: 3, // LOW STOCK ALERT
            reorderLevel: 5,
          },
          {
            sku: 'COV-MAG-14P-BLU',
            barcode: '88019283003',
            color: 'Navy Blue',
            size: 'iPhone 14 Pro',
            material: 'Silicone + MagSafe Ring',
            price: 22000,
            costPrice: 10000,
            stockQuantity: 10,
            reorderLevel: 4,
          },
        ],
      },
    },
  });

  // Add compatibility link for cases
  if (seededModels[0]) {
    await prisma.productCompatibility.create({
      data: {
        productId: caseProduct.id,
        phoneModelId: seededModels[0].id,
      },
    });
  }

  // Item 5: Anker MagSafe Magnetic Power Bank 10,000mAh
  await prisma.product.create({
    data: {
      name: 'Anker 633 Magnetic Power Bank 10,000mAh',
      type: 'GADGET',
      categoryId: categories['power-banks'],
      brandId: brands['Anker'],
      description: 'Snap-and-charge wireless magnetic power bank with built-in foldable stand.',
      imageUrls: JSON.stringify(['https://images.unsplash.com/photo-1622445268465-843d39575f0a?auto=format&fit=crop&w=600&q=80']),
      hasVariants: true,
      specifications: JSON.stringify({ capacity: '10000mAh', wirelessOutput: '7.5W', wiredOutput: '20W PD' }),
      variants: {
        create: [
          {
            sku: 'ANK-PW-10K-BLK',
            barcode: '848061031122',
            color: 'Black',
            size: '10,000mAh',
            price: 135000,
            costPrice: 95000,
            stockQuantity: 12,
            reorderLevel: 3,
          },
          {
            sku: 'ANK-PW-10K-WHT',
            barcode: '848061031123',
            color: 'Arctic White',
            size: '10,000mAh',
            price: 135000,
            costPrice: 95000,
            stockQuantity: 6,
            reorderLevel: 3,
          },
        ],
      },
    },
  });

  // Item 6: Privacy 9H Tempered Glass Screen Guard
  await prisma.product.create({
    data: {
      name: 'Privacy 9H Anti-Spy Tempered Glass Guard',
      type: 'ACCESSORY',
      categoryId: categories['screen-protectors'],
      brandId: brands['Apple'],
      description: '28-degree anti-peeping privacy tempered glass screen protector.',
      imageUrls: JSON.stringify(['https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80']),
      hasVariants: true,
      variants: {
        create: [
          {
            sku: 'GLS-PRV-15PM',
            barcode: '79201928101',
            style: 'Privacy Anti-Spy',
            size: 'iPhone 15 Pro Max',
            price: 15000,
            costPrice: 5000,
            stockQuantity: 25,
            reorderLevel: 5,
          },
          {
            sku: 'GLS-PRV-S24U',
            barcode: '79201928102',
            style: 'Privacy Anti-Spy UV',
            size: 'Galaxy S24 Ultra',
            price: 18000,
            costPrice: 6500,
            stockQuantity: 15,
            reorderLevel: 5,
          },
        ],
      },
    },
  });

  console.log('✅ Module 1 Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
