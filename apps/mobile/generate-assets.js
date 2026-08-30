const sharp = require('sharp');
const path = require('path');

const BRAND = '#4f46e5';

async function main() {
  const iconSvg = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="${BRAND}"/>
      <text x="512" y="600" font-family="Arial, sans-serif" font-size="440" font-weight="700"
        fill="#ffffff" text-anchor="middle">C</text>
    </svg>
  `;

  const splashSvg = `
    <svg width="2732" height="2732" xmlns="http://www.w3.org/2000/svg">
      <rect width="2732" height="2732" fill="${BRAND}"/>
      <text x="1366" y="1500" font-family="Arial, sans-serif" font-size="700" font-weight="700"
        fill="#ffffff" text-anchor="middle">C</text>
    </svg>
  `;

  await sharp(Buffer.from(iconSvg)).png().toFile(path.join(__dirname, 'resources/icon.png'));
  await sharp(Buffer.from(splashSvg)).png().toFile(path.join(__dirname, 'resources/splash.png'));
  console.log('Generated placeholder icon.png and splash.png in resources/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
