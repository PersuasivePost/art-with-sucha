/**
 * Quick Database Inspector
 * Shows how your images are currently stored and linked
 *
 * Usage: npm run inspect-db
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();
async function inspectDatabase() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('         DATABASE IMAGE INSPECTION');
    console.log('═══════════════════════════════════════════════════════\n');
    // Get sections with images
    const sectionsWithImages = await prisma.section.findMany({
        where: {
            coverImage: { not: null }
        },
        select: {
            id: true,
            name: true,
            coverImage: true
        }
    });
    console.log(`📁 SECTIONS WITH COVER IMAGES: ${sectionsWithImages.length}\n`);
    sectionsWithImages.forEach((section, index) => {
        console.log(`${index + 1}. Section: "${section.name}" (ID: ${section.id})`);
        console.log(`   Image: ${section.coverImage}`);
        console.log('');
    });
    // Get products with images
    const productsWithImages = await prisma.product.findMany({
        where: {
            images: { isEmpty: false }
        },
        select: {
            id: true,
            title: true,
            images: true,
            section: {
                select: {
                    name: true
                }
            }
        },
        orderBy: {
            id: 'asc'
        }
    });
    console.log(`🖼️  PRODUCTS WITH IMAGES: ${productsWithImages.length}\n`);
    let totalImages = 0;
    productsWithImages.forEach((product, index) => {
        const imageArray = product.images;
        totalImages += imageArray.length;
        console.log(`${index + 1}. Product: "${product.title}" (ID: ${product.id})`);
        console.log(`   Section: ${product.section.name}`);
        console.log(`   Images (${imageArray.length}):`);
        imageArray.forEach((img, imgIndex) => {
            console.log(`     ${imgIndex + 1}. ${img}`);
        });
        console.log('');
    });
    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('                   SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Sections with cover images: ${sectionsWithImages.length}`);
    console.log(`  Products with images: ${productsWithImages.length}`);
    console.log(`  Total product images: ${totalImages}`);
    console.log(`  Grand total images: ${sectionsWithImages.length + totalImages}`);
    console.log('═══════════════════════════════════════════════════════\n');
    // Check format
    const sampleImage = sectionsWithImages[0]?.coverImage ||
        productsWithImages[0]?.images?.[0];
    if (sampleImage) {
        console.log('📝 IMAGE FORMAT DETECTED:\n');
        if (sampleImage.startsWith('http')) {
            console.log('  ✓ Full URLs (already migrated or using signed URLs)');
            console.log(`  Example: ${sampleImage.substring(0, 80)}...`);
        }
        else {
            console.log('  ✓ Storage keys (needs migration)');
            console.log(`  Example: ${sampleImage}`);
            console.log('\n  → These will be converted to GitHub URLs during migration');
        }
    }
    await prisma.$disconnect();
}
inspectDatabase().catch((error) => {
    console.error('Error inspecting database:', error);
    process.exit(1);
});
//# sourceMappingURL=inspect-db.js.map