#!/usr/bin/env node

/**
 * Equation HI-LO Image Extraction Helper
 * 
 * This script helps you extract all images from your Wix website.
 * Run this in your browser's console on your Wix site.
 */

console.log('🎯 Equation HI-LO Image Extraction Helper');
console.log('==========================================');

// Function to extract all images from the current page
function extractAllImages() {
    const images = document.querySelectorAll('img');
    const imageData = [];
    
    images.forEach((img, index) => {
        if (img.src && !img.src.includes('data:image')) {
            // Get the original high-quality URL (Wix sometimes has multiple sizes)
            let originalSrc = img.src;
            
            // For Wix images, try to get the original size
            if (originalSrc.includes('wixstatic.com')) {
                // Remove size parameters to get original
                originalSrc = originalSrc.replace(/\/v1\/fill\/w_\d+,h_\d+[^\/]*\//, '/');
                originalSrc = originalSrc.replace(/\?.*$/, '');
            }
            
            const altText = img.alt || `image-${index}`;
            const suggestedName = generateFileName(altText, originalSrc);
            
            imageData.push({
                index: index + 1,
                url: originalSrc,
                alt: altText,
                suggestedName,
                dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
                element: img
            });
        }
    });
    
    return imageData;
}

// Generate a good filename from alt text or URL
function generateFileName(altText, url) {
    if (altText && altText !== '') {
        return altText.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-') + '.png';
    }
    
    // Extract filename from URL
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    return filename.split('?')[0] || 'downloaded-image.png';
}

// Function to download a single image
function downloadImage(imageData) {
    const link = document.createElement('a');
    link.href = imageData.url;
    link.download = imageData.suggestedName;
    link.target = '_blank';
    
    // Create a temporary link and click it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`📥 Downloading: ${imageData.suggestedName}`);
}

// Function to create download links for all images
function createDownloadLinks(imageData) {
    // Create a container for download links
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 2px solid #3498db;
        border-radius: 10px;
        padding: 20px;
        max-width: 400px;
        max-height: 400px;
        overflow-y: auto;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        font-family: Arial, sans-serif;
    `;
    
    const title = document.createElement('h3');
    title.textContent = '🖼️ Found Images';
    title.style.cssText = 'margin: 0 0 15px 0; color: #2c3e50;';
    container.appendChild(title);
    
    imageData.forEach((img) => {
        const item = document.createElement('div');
        item.style.cssText = 'margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 5px;';
        
        item.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">${img.suggestedName}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">${img.dimensions} • ${img.alt}</div>
            <button onclick="downloadSingleImage('${img.url}', '${img.suggestedName}')" 
                    style="background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                Download
            </button>
        `;
        
        container.appendChild(item);
    });
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = 'background: #e74c3c; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; margin-top: 10px; width: 100%;';
    closeBtn.onclick = () => document.body.removeChild(container);
    container.appendChild(closeBtn);
    
    document.body.appendChild(container);
}

// Helper function for individual downloads (needs to be global)
window.downloadSingleImage = function(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Main extraction function
function startExtraction() {
    console.log('🔍 Scanning for images...');
    
    const images = extractAllImages();
    
    if (images.length === 0) {
        console.log('❌ No images found on this page.');
        return;
    }
    
    console.log(`✅ Found ${images.length} images:`);
    console.table(images.map(img => ({
        Name: img.suggestedName,
        Dimensions: img.dimensions,
        URL: img.url.substring(0, 50) + '...'
    })));
    
    // Create the download interface
    createDownloadLinks(images);
    
    return images;
}

// Auto-run if we're in a browser environment
if (typeof window !== 'undefined') {
    console.log('🚀 Starting image extraction...');
    console.log('📋 Instructions:');
    console.log('1. Make sure you are on your Wix website');
    console.log('2. This script will find all images and create download buttons');
    console.log('3. Click "Download" for each image you want to save');
    console.log('4. Rename them according to your needs:');
    console.log('   - game-screenshot.png (main game photo)');
    console.log('   - hayzgames-logo.png (your logo)');
    console.log('');
    
    // Start extraction after a short delay
    setTimeout(startExtraction, 1000);
} else {
    // Node.js environment - export functions
    module.exports = { extractAllImages, downloadImage, startExtraction };
}
