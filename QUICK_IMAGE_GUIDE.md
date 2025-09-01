# 🚀 Quick Image Extraction Guide

## Method 1: Browser Console Script (Recommended)

1. **Go to your Wix site**: https://www.equation-hi-lo.com/
2. **Open Developer Tools**: Press `F12` or right-click → "Inspect"
3. **Go to Console tab**
4. **Copy and paste this entire script**:

```javascript
// Equation HI-LO Image Extractor
console.log('🎯 Equation HI-LO Image Extraction Helper');
const images = document.querySelectorAll('img');
const imageData = [];

images.forEach((img, index) => {
    if (img.src && !img.src.includes('data:image')) {
        let originalSrc = img.src;
        if (originalSrc.includes('wixstatic.com')) {
            originalSrc = originalSrc.replace(/\/v1\/fill\/w_\d+,h_\d+[^\/]*\//, '/');
        }
        const altText = img.alt || `image-${index}`;
        imageData.push({
            url: originalSrc,
            alt: altText,
            element: img
        });
    }
});

// Create download interface
const container = document.createElement('div');
container.style.cssText = `position: fixed; top: 20px; right: 20px; background: white; border: 2px solid #3498db; border-radius: 10px; padding: 20px; max-width: 400px; max-height: 400px; overflow-y: auto; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: Arial, sans-serif;`;

const title = document.createElement('h3');
title.textContent = '🖼️ Found ' + imageData.length + ' Images';
title.style.cssText = 'margin: 0 0 15px 0; color: #2c3e50;';
container.appendChild(title);

imageData.forEach((img, i) => {
    const item = document.createElement('div');
    item.style.cssText = 'margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 5px;';
    item.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">Image ${i + 1}</div>
        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">${img.alt}</div>
        <button onclick="window.open('${img.url}', '_blank')" 
                style="background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
            Open & Save
        </button>
    `;
    container.appendChild(item);
});

const closeBtn = document.createElement('button');
closeBtn.textContent = '✕ Close';
closeBtn.style.cssText = 'background: #e74c3c; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; margin-top: 10px; width: 100%;';
closeBtn.onclick = () => document.body.removeChild(container);
container.appendChild(closeBtn);

document.body.appendChild(container);
console.log('✅ Image extraction complete! Check the popup on the right.');
```

5. **Press Enter** - You'll see a popup with all images
6. **Click "Open & Save"** for each image you want
7. **Save them as**:
   - `game-screenshot.png` (your main game photo)
   - `hayzgames-logo.png` (your company logo)

## Method 2: Manual (2 minutes)

1. **Right-click each image** on your Wix site
2. **"Inspect Element"**
3. **Right-click the image URL** in the code
4. **"Open in new tab"**
5. **Save the image**

## Method 3: Screenshots (Easiest)

1. **Take a screenshot** of your game image
2. **Crop it** to just the game
3. **Save as** `game-screenshot.png`
4. **Repeat for logo** → `hayzgames-logo.png`

## After Getting Images:

```bash
# Move to your project
cd /Users/serapheim.dimitropoulos/repos/equation-hi-lo.github.io

# Copy images to the right folder  
cp ~/Downloads/game-screenshot.png images/
cp ~/Downloads/hayzgames-logo.png images/

# Deploy the changes
git add images/
git commit -m "Add website images"
git push origin main
```

Your website will be identical to the Wix version in about 1-2 minutes! 🎉
