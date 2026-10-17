import { PrismaClient } from '@prisma/client';
import { canSeeCost } from '../middleware/auth.js';
const prisma = new PrismaClient();

function publicProduct(product, seeCost) {
  if (seeCost) return product;
  const { costPrice, variants, phoneUnits, ...rest } = product;
  return {
    ...rest,
    variants: (variants || []).map(({ costPrice: _cost, ...variant }) => variant),
    phoneUnits: (phoneUnits || []).map(({ buyingPrice, minSellingPrice, ...unit }) => unit),
  };
}

// Get all products with rich filtering
export const getProducts = async (req, res) => {
  try {
    const { categoryId, brandId, type, search, lowStockOnly } = req.query;

    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (type) where.type = type;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        variants: true,
        phoneUnits: {
          where: { status: 'IN_STOCK' }
        },
        compatibilities: {
          include: { phoneModel: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format products for frontend consumption
    const formatted = products.map(p => {
      let totalStock = 0;
      if (p.type === 'PHONE') {
        totalStock = p.phoneUnits.length;
      } else if (p.hasVariants) {
        totalStock = p.variants.reduce((acc, v) => acc + v.stockQuantity, 0);
      } else {
        totalStock = p.stockQuantity || 0;
      }

      return publicProduct({
        ...p,
        totalStock,
        imageUrls: p.imageUrls ? JSON.parse(p.imageUrls) : [],
        specifications: p.specifications ? JSON.parse(p.specifications) : {},
      }, canSeeCost(req));
    });

    if (lowStockOnly === 'true') {
      const filteredLowStock = formatted.filter(p => {
        if (p.type === 'PHONE') return p.totalStock <= 2;
        if (p.hasVariants) return p.variants.some(v => v.stockQuantity <= v.reorderLevel);
        return p.totalStock <= (p.reorderLevel || 5);
      });
      return res.json({ success: true, count: filteredLowStock.length, data: filteredLowStock });
    }

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Create new Product (Single or Multi-variant)
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      type,
      categoryId,
      brandId,
      description,
      imageUrls,
      hasVariants,
      specifications,
      basePrice,
      costPrice,
      stockQuantity,
      barcode,
      sku,
      reorderLevel,
      variants,
      compatibleModelIds,
    } = req.body;

    const newProduct = await prisma.product.create({
      data: {
        name,
        type: type || 'ACCESSORY',
        categoryId,
        brandId: brandId || null,
        description,
        imageUrls: imageUrls ? JSON.stringify(imageUrls) : JSON.stringify([]),
        hasVariants: hasVariants || false,
        specifications: specifications ? JSON.stringify(specifications) : null,
        basePrice: basePrice ? parseFloat(basePrice) : null,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        stockQuantity: stockQuantity ? parseInt(stockQuantity) : 0,
        barcode: barcode || null,
        sku: sku || null,
        reorderLevel: reorderLevel ? parseInt(reorderLevel) : 5,
        variants: hasVariants && Array.isArray(variants) ? {
          create: variants.map(v => ({
            sku: v.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            barcode: v.barcode || null,
            color: v.color || null,
            size: v.size || null,
            material: v.material || null,
            style: v.style || null,
            price: parseFloat(v.price),
            costPrice: parseFloat(v.costPrice || 0),
            stockQuantity: parseInt(v.stockQuantity || 0),
            reorderLevel: parseInt(v.reorderLevel || 3),
            imageUrl: v.imageUrl || null,
          }))
        } : undefined,
      },
      include: {
        category: true,
        brand: true,
        variants: true,
      }
    });

    // Handle Model Compatibilities if provided
    if (Array.isArray(compatibleModelIds) && compatibleModelIds.length > 0) {
      await prisma.productCompatibility.createMany({
        data: compatibleModelIds.map(mId => ({
          productId: newProduct.id,
          phoneModelId: mId,
        }))
      });
    }

    res.status(201).json({ success: true, message: 'Product created successfully', data: newProduct });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Get Low Stock Alert Matrix
export const getLowStockAlerts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        brand: true,
        variants: true,
        phoneUnits: { where: { status: 'IN_STOCK' } },
      }
    });

    const alerts = [];

    for (const p of products) {
      if (p.type === 'PHONE') {
        if (p.phoneUnits.length <= 2) {
          alerts.push({
            id: p.id,
            productName: p.name,
            type: 'PHONE_LOW_STOCK',
            categoryName: p.category.name,
            currentStock: p.phoneUnits.length,
            threshold: 2,
            message: `Only ${p.phoneUnits.length} units left in stock for ${p.name}`
          });
        }
      } else if (p.hasVariants) {
        p.variants.forEach(v => {
          if (v.stockQuantity <= v.reorderLevel) {
            alerts.push({
              id: `${p.id}-${v.id}`,
              productName: `${p.name} (${v.color || ''} ${v.size || ''})`.trim(),
              type: 'VARIANT_LOW_STOCK',
              sku: v.sku,
              barcode: v.barcode,
              currentStock: v.stockQuantity,
              threshold: v.reorderLevel,
              message: `Variant '${v.color || ''} ${v.size || ''}' is low on stock (${v.stockQuantity} remaining)`
            });
          }
        });
      } else {
        if ((p.stockQuantity || 0) <= (p.reorderLevel || 5)) {
          alerts.push({
            id: p.id,
            productName: p.name,
            type: 'PRODUCT_LOW_STOCK',
            categoryName: p.category.name,
            sku: p.sku,
            barcode: p.barcode,
            currentStock: p.stockQuantity || 0,
            threshold: p.reorderLevel || 5,
            message: `Stock level for '${p.name}' is low (${p.stockQuantity} remaining)`
          });
        }
      }
    }

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// Delete Product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

