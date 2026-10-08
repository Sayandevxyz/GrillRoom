import sharp from "sharp";
import fs from "fs";
import path from "path";

async function prepareBrandAssets() {
  const brandDir = path.join(process.cwd(), "public", "brand");
  const publicDir = path.join(process.cwd(), "public");
  const inputLogo = path.join(brandDir, "grillroom-logo.png");

  if (!fs.existsSync(inputLogo)) {
    throw new Error(`Logo not found at ${inputLogo}`);
  }

  console.log("🎨 Processing brand assets from", inputLogo);

  // 1. Create trimmed or aspect-preserved logo-header (height: 64px for 2x of 32px display height)
  await sharp(inputLogo)
    .resize({ height: 64 })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(path.join(brandDir, "logo-header.png"));

  await sharp(inputLogo)
    .resize({ height: 64 })
    .webp({ quality: 85 })
    .toFile(path.join(brandDir, "logo-header.webp"));

  console.log("✅ logo-header.png and logo-header.webp generated");

  // 2. Crop the mark (the emblem on the left: fireplace/flame)
  // Perfectly centered 220x220 crop of the fireplace and flame emblem
  const markSource = fs.existsSync(path.join(brandDir, "grillroom-logo-raw.png"))
    ? path.join(brandDir, "grillroom-logo-raw.png")
    : inputLogo;

  await sharp(markSource)
    .extract({ left: 172, top: 141, width: 220, height: 220 })
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(brandDir, "logo-mark.png"));

  const markPath = path.join(brandDir, "logo-mark.png");

  // 3. Generate favicon suite from logo-mark
  await sharp(markPath).resize(16, 16).png().toFile(path.join(publicDir, "favicon-16x16.png"));
  await sharp(markPath).resize(32, 32).png().toFile(path.join(publicDir, "favicon-32x32.png"));
  await sharp(markPath).resize(32, 32).toFormat("png").toFile(path.join(publicDir, "favicon.ico"));
  await sharp(markPath).resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png"));
  await sharp(markPath).resize(192, 192).png().toFile(path.join(publicDir, "android-chrome-192x192.png"));
  await sharp(markPath).resize(512, 512).png().toFile(path.join(publicDir, "android-chrome-512x512.png"));

  console.log("✅ Favicon suite generated");

  // 4. Create site.webmanifest
  const manifest = {
    name: "GrillRoom | AI Investor Readiness Simulator",
    short_name: "GrillRoom",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ],
    theme_color: "#0F172A",
    background_color: "#F7F4EF",
    display: "standalone"
  };

  fs.writeFileSync(path.join(publicDir, "site.webmanifest"), JSON.stringify(manifest, null, 2));
  console.log("✅ site.webmanifest created");

  // 5. Optimize grillroom-logo.png to be under 60KB
  await sharp(inputLogo)
    .resize({ width: 640 })
    .png({ quality: 85, compressionLevel: 9 })
    .toFile(path.join(brandDir, "grillroom-logo-optimized.png"));

  // Replace original with optimized version
  fs.copyFileSync(path.join(brandDir, "grillroom-logo-optimized.png"), inputLogo);
  fs.unlinkSync(path.join(brandDir, "grillroom-logo-optimized.png"));

  const stat = fs.statSync(inputLogo);
  console.log(`✅ grillroom-logo.png optimized: ${(stat.size / 1024).toFixed(1)} KB`);
}

prepareBrandAssets().catch((err) => {
  console.error("Brand preparation failed:", err);
  process.exit(1);
});
