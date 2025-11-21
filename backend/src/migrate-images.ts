/**
 * Image Migration Script
 * Migrates images from Backblaze B2 to GitHub repository
 *
 * Prerequisites:
 * 1. Both .env configurations set up (B2 and GitHub)
 * 2. Backend dependencies installed
 * 3. Database accessible
 *
 * Usage:
 *   npm run migrate-images
 */

import prisma from "./prisma.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
import { Readable } from "stream";

// Load environment variables
dotenv.config();

// (use shared prisma from ../prisma.ts)

// Initialize Backblaze S3 Client
const s3Client = new S3Client({
  region: process.env.B2_REGION || "us-east-005",
  endpoint: process.env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com",
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID || "",
    secretAccessKey: process.env.B2_APPLICATION_KEY || "",
  },
  forcePathStyle: true,
});

// Initialize GitHub Octokit
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const GITHUB_OWNER = process.env.GITHUB_REPO_OWNER || "PersuasivePost";
const GITHUB_REPO = process.env.GITHUB_REPO_NAME || "art-with-sucha-images";
const GITHUB_BRANCH = process.env.GITHUB_REPO_BRANCH || "main";

interface MigrationStats {
  totalSections: number;
  totalProducts: number;
  sectionsProcessed: number;
  productsProcessed: number;
  imagesMigrated: number;
  errors: string[];
}

const stats: MigrationStats = {
  totalSections: 0,
  totalProducts: 0,
  sectionsProcessed: 0,
  productsProcessed: 0,
  imagesMigrated: 0,
  errors: [],
};

/**
 * Download image from Backblaze B2
 */
async function downloadFromB2(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME || "",
      Key: key,
    });

    const response = await s3Client.send(command);

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    const stream = response.Body as Readable;

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  } catch (error: any) {
    console.error(`Error downloading from B2 (${key}):`, error.message);
    throw error;
  }
}

/**
 * Upload image to GitHub repository
 */
async function uploadToGitHub(key: string, buffer: Buffer): Promise<string> {
  try {
    const contentBase64 = buffer.toString("base64");

    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: key,
      message: `Migrate image: ${key}`,
      content: contentBase64,
      branch: GITHUB_BRANCH,
    });

    const githubUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${key}`;
    console.log(`  ✓ Uploaded to GitHub: ${key}`);
    return githubUrl;
  } catch (error: any) {
    console.error(`Error uploading to GitHub (${key}):`, error.message);
    throw error;
  }
}

/**
 * Migrate a single image
 */
async function migrateImage(key: string): Promise<string> {
  console.log(`  → Migrating: ${key}`);

  // Download from B2
  const buffer = await downloadFromB2(key);

  // Upload to GitHub
  const githubUrl = await uploadToGitHub(key, buffer);

  stats.imagesMigrated++;
  return githubUrl;
}

/**
 * Migrate section cover images
 */
async function migrateSections() {
  console.log("\n📁 Migrating Section Images...\n");

  const sections = await prisma.section.findMany({
    where: {
      coverImage: {
        not: null,
      },
    },
  });

  stats.totalSections = sections.length;
  console.log(`Found ${sections.length} sections with images\n`);

  for (const section of sections) {
    try {
      console.log(`Section: "${section.name}"`);

      if (section.coverImage) {
        const newUrl = await migrateImage(section.coverImage);

        // Update database with new GitHub URL
        await prisma.section.update({
          where: { id: section.id },
          data: { coverImage: newUrl },
        });

        console.log(`  ✓ Database updated with new URL\n`);
        stats.sectionsProcessed++;
      }
    } catch (error: any) {
      const errorMsg = `Section "${section.name}": ${error.message}`;
      console.error(`  ✗ ${errorMsg}\n`);
      stats.errors.push(errorMsg);
    }
  }
}

/**
 * Migrate product images
 */
async function migrateProducts() {
  console.log("\n🖼️  Migrating Product Images...\n");

  const products = await prisma.product.findMany({
    where: {
      images: {
        isEmpty: false,
      },
    },
    include: {
      section: true,
    },
  });

  stats.totalProducts = products.length;
  console.log(`Found ${products.length} products with images\n`);

  for (const product of products) {
    try {
      console.log(`Product: "${product.title}" (${product.section.name})`);

      const imageArray = product.images as string[];
      const newImageUrls: string[] = [];

      for (const imageKey of imageArray) {
        try {
          const newUrl = await migrateImage(imageKey);
          newImageUrls.push(newUrl);
        } catch (error: any) {
          console.error(`  ✗ Failed to migrate image: ${imageKey}`);
          stats.errors.push(
            `Product "${product.title}" image "${imageKey}": ${error.message}`
          );
          // Keep the old URL if migration fails
          newImageUrls.push(imageKey);
        }
      }

      // Update database with new GitHub URLs
      await prisma.product.update({
        where: { id: product.id },
        data: { images: newImageUrls },
      });

      console.log(`  ✓ Database updated with new URLs\n`);
      stats.productsProcessed++;
    } catch (error: any) {
      const errorMsg = `Product "${product.title}": ${error.message}`;
      console.error(`  ✗ ${errorMsg}\n`);
      stats.errors.push(errorMsg);
    }
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║   Image Migration: Backblaze B2 → GitHub Repository  ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // Verify configurations
  console.log("Configuration Check:");
  console.log(`  B2 Bucket: ${process.env.B2_BUCKET_NAME}`);
  console.log(`  B2 Endpoint: ${process.env.B2_ENDPOINT}`);
  console.log(`  GitHub Repo: ${GITHUB_OWNER}/${GITHUB_REPO}`);
  console.log(`  GitHub Branch: ${GITHUB_BRANCH}`);
  console.log(
    `  GitHub Token: ${process.env.GITHUB_TOKEN ? "✓ Set" : "✗ Missing"}\n`
  );

  if (!process.env.GITHUB_TOKEN) {
    console.error("❌ GITHUB_TOKEN not set in .env file!");
    process.exit(1);
  }

  // Confirm before proceeding
  console.log("⚠️  This will:");
  console.log("  1. Download all images from Backblaze B2");
  console.log("  2. Upload them to GitHub repository");
  console.log("  3. Update database with new GitHub URLs\n");

  console.log("Starting migration in 3 seconds...\n");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const startTime = Date.now();

  try {
    // Migrate sections
    await migrateSections();

    // Migrate products
    await migrateProducts();

    // Print summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n╔═══════════════════════════════════════════════════════╗");
    console.log("║                  Migration Complete!                  ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");

    console.log("📊 Summary:");
    console.log(`  Duration: ${duration}s`);
    console.log(
      `  Sections: ${stats.sectionsProcessed}/${stats.totalSections}`
    );
    console.log(
      `  Products: ${stats.productsProcessed}/${stats.totalProducts}`
    );
    console.log(`  Images Migrated: ${stats.imagesMigrated}`);
    console.log(`  Errors: ${stats.errors.length}\n`);

    if (stats.errors.length > 0) {
      console.log("⚠️  Errors encountered:");
      stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      console.log("");
    }

    console.log(
      "✅ All done! You can now switch to GitHub storage in your .env file."
    );
    console.log("   Set USE_GITHUB_STORAGE=true and restart the backend.\n");
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
