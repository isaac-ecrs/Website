import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CMS uploads to /assets/images/leaders at repo root
const LEADERS_IMAGE_DIR = path.join(__dirname, '../assets/images/leaders');

// Create directory if it doesn't exist
if (!fs.existsSync(LEADERS_IMAGE_DIR)) {
  fs.mkdirSync(LEADERS_IMAGE_DIR, { recursive: true });
}

async function processImage(filePath) {
  try {
    const filename = path.basename(filePath);
    const dir = path.dirname(filePath);

    // Get image metadata to determine dimensions
    const metadata = await sharp(filePath).metadata();

    if (!metadata.width || !metadata.height) {
      console.warn(`⚠️  Skipping ${filename} - unable to read dimensions`);
      return;
    }

    // Determine the size for square crop (use the smaller dimension)
    const size = Math.min(metadata.width, metadata.height);

    // Calculate crop position (center the crop)
    const left = Math.floor((metadata.width - size) / 2);
    const top = Math.floor((metadata.height - size) / 2);

    // Create a sharp instance to process the image
    const processed = sharp(filePath)
      .extract({
        left,
        top,
        width: size,
        height: size,
      })
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      });

    // Save as WebP with "optimized" suffix
    const webpPath = path.join(dir, `${filename}-optimized.webp`);
    await processed.clone().webp({ quality: 80 }).toFile(webpPath);

    // Save as optimized JPEG with "optimized" suffix
    const jpegPath = path.join(dir, `${filename}-optimized.jpg`);
    await processed
      .clone()
      .jpeg({ quality: 80, progressive: true })
      .toFile(jpegPath);

    // Update all leader markdown files that reference this image
    const markdownDir = path.join(__dirname, '../src/content/leaders');
    if (fs.existsSync(markdownDir)) {
      const mdFiles = fs
        .readdirSync(markdownDir)
        .filter((f) => f.endsWith('.md'));
      const imagePath = `/assets/images/leaders/${filename}`;
      const optimizedWebP = `/assets/images/leaders/${filename}-optimized.webp`;

      for (const mdFile of mdFiles) {
        const mdPath = path.join(markdownDir, mdFile);
        let content = fs.readFileSync(mdPath, 'utf-8');

        // Only update if this file references the image we just processed
        if (content.includes(imagePath)) {
          content = content.replace(new RegExp(imagePath, 'g'), optimizedWebP);
          fs.writeFileSync(mdPath, content, 'utf-8');
          console.log(`  → Updated ${mdFile} to use optimized image`);
        }
      }
    }

    console.log(`✓ Processed ${filename} - cropped to square and optimized`);
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

async function processAllImages() {
  if (!fs.existsSync(LEADERS_IMAGE_DIR)) {
    console.log(
      'ℹ️  No leaders images directory found - skipping image processing'
    );
    return;
  }

  const files = fs.readdirSync(LEADERS_IMAGE_DIR);

  // Only process original image files (not our already-optimized versions)
  const imageFiles = files.filter((file) => {
    // Skip files we've already processed
    if (file.includes('-optimized')) return false;

    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return false;

    // Check if this image has already been optimized
    // (look for corresponding -optimized.webp file)
    const optimizedVersion = `${file}-optimized.webp`;
    if (files.includes(optimizedVersion)) {
      return false; // Skip, already processed
    }

    return true;
  });

  if (imageFiles.length === 0) {
    console.log('ℹ️  No images to process in leaders directory');
    return;
  }

  console.log(`\n📸 Processing ${imageFiles.length} leader image(s)...\n`);

  for (const file of imageFiles) {
    const filePath = path.join(LEADERS_IMAGE_DIR, file);
    await processImage(filePath);
  }

  console.log('\n✓ Image processing complete!\n');
}

processAllImages().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
