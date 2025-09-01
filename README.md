# Equation HI-LO Website

This is the GitHub Pages website for **Equation HI-LO**, a strategic board game that combines math and poker elements.

## 🎯 About the Game

Equation HI-LO is a fun and engaging board game where players:
- Use randomly dealt numbers (1-10) and operation cards (+, -, ×, ÷, √)
- Build equations that get as close as possible to 1 (low) or 20 (high)
- Wager chips based on confidence in their equations
- Can win through strategy or even bluffing!

## 🚀 Website Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Interactive Equation Optimizer**: Built-in tool to help find optimal equations
- **Modern UI**: Clean, professional design with smooth animations
- **SEO Optimized**: Proper meta tags and semantic HTML

## 🛠 Technical Stack

- **Frontend**: Pure HTML5, CSS3, and JavaScript (no frameworks needed)
- **Hosting**: GitHub Pages (free hosting)
- **Domain**: Can be configured to use custom domain equation-hi-lo.com

## 📁 Project Structure

```
equation-hi-lo.github.io/
├── index.html          # Main website file
├── styles.css          # All styling and responsive design
├── script.js           # Equation optimizer and interactive features
├── images/             # Website assets
│   ├── README.md       # Instructions for adding images
│   ├── game-screenshot.png  # Main game photo (to be added)
│   └── hayzgames-logo.png   # Company logo (to be added)
└── README.md          # This file
```

## 🖼 Adding Images

The website references two main images that need to be added to the `images/` directory:

1. **game-screenshot.png** - Main photo of your board game
2. **hayzgames-logo.png** - Your company logo

See `images/README.md` for detailed instructions on extracting these from your current Wix website.

## 🌐 Deployment

This website is automatically deployed to GitHub Pages. Any changes pushed to the main branch will be live within a few minutes.

**Current URL**: https://yourusername.github.io/equation-hi-lo.github.io/

## 🎯 Setting Up Custom Domain

To use your custom domain (equation-hi-lo.com):

1. Go to your repo's Settings > Pages
2. Add your custom domain: `equation-hi-lo.com`
3. Update your domain's DNS settings to point to GitHub Pages:
   - Add CNAME record: `www.equation-hi-lo.com` → `yourusername.github.io`
   - Add A records for apex domain to GitHub Pages IPs:
     - 185.199.108.153
     - 185.199.109.153  
     - 185.199.110.153
     - 185.199.111.153

## 💰 Cost Savings

**Before (Wix)**: $20/month + domain
**After (GitHub Pages)**: $0/month + domain

**Annual savings**: $240+ per year! 🎉

## 🎮 Local Development

To test locally:

```bash
# Navigate to project directory
cd equation-hi-lo.github.io

# Start local server
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

## 📧 Contact

Created by **HayzGames** - A couple from San Francisco passionate about board games!

---

*Migrated from Wix to GitHub Pages for better performance and cost savings.*