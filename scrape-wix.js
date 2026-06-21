import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://www.femmesetguerrieres.be';
const OUTPUT_DIR = join(__dirname, 'scraped-content');

// Create output directory
try {
  mkdirSync(OUTPUT_DIR, { recursive: true });
} catch (err) {
  // Directory might already exist
}

async function scrapeWithPlaywright() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  const scrapedData = {
    homepage: null,
    pages: [],
    navigation: [],
    images: [],
    styles: {}
  };

  try {
    console.log(`\nScraping homepage: ${BASE_URL}`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for content to load and render
    await page.waitForTimeout(5000);

    // Extract navigation links
    console.log('Extracting navigation...');
    const navLinks = await page.evaluate(() => {
      const links = [];
      // Try multiple selectors for navigation
      const navSelectors = [
        'nav a',
        '[role="navigation"] a',
        'header a',
        '[data-testid*="nav"] a',
        '.menu a',
        '[id*="nav"] a',
        '[class*="nav"] a'
      ];

      const seenHrefs = new Set();

      for (const selector of navSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const href = el.getAttribute('href');
          const text = el.textContent?.trim();
          if (href && text && !seenHrefs.has(href)) {
            seenHrefs.add(href);
            links.push({ href, text });
          }
        });
      }

      return links;
    });

    console.log(`Found ${navLinks.length} navigation links`);
    scrapedData.navigation = navLinks;

    // Extract homepage content
    console.log('Extracting homepage content...');
    const homepageContent = await extractPageContent(page, 'Homepage');
    scrapedData.homepage = homepageContent;

    // Get all internal links
    const internalLinks = navLinks
      .filter(link => {
        const href = link.href;
        return href.startsWith('/') || href.includes('femmesetguerrieres.be');
      })
      .map(link => {
        let url = link.href;
        if (url.startsWith('/')) {
          url = BASE_URL + url;
        }
        return { url, text: link.text };
      });

    // Remove duplicates
    const uniqueLinks = Array.from(
      new Map(internalLinks.map(item => [item.url, item])).values()
    );

    console.log(`\nFound ${uniqueLinks.length} unique internal pages to scrape`);

    // Scrape each page
    for (const link of uniqueLinks) {
      if (link.url === BASE_URL || link.url === BASE_URL + '/') {
        continue; // Skip homepage, already scraped
      }

      try {
        console.log(`\nScraping: ${link.text} (${link.url})`);
        await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(5000);

        const pageContent = await extractPageContent(page, link.text);
        scrapedData.pages.push({
          url: link.url,
          path: new URL(link.url).pathname,
          title: link.text,
          content: pageContent
        });

      } catch (error) {
        console.error(`Error scraping ${link.url}:`, error.message);
        scrapedData.pages.push({
          url: link.url,
          path: new URL(link.url).pathname,
          title: link.text,
          error: error.message
        });
      }
    }

    // Extract color scheme and styles
    console.log('\nExtracting color scheme...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const styles = await page.evaluate(() => {
      const colors = new Set();
      const fonts = new Set();

      // Get computed styles from various elements
      const elements = document.querySelectorAll('*');
      const sampleSize = Math.min(elements.length, 500); // Sample to avoid too much processing

      for (let i = 0; i < sampleSize; i++) {
        const el = elements[i];
        const computed = window.getComputedStyle(el);

        // Collect colors
        const color = computed.color;
        const bgColor = computed.backgroundColor;
        if (color && color !== 'rgba(0, 0, 0, 0)') colors.add(color);
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') colors.add(bgColor);

        // Collect fonts
        const fontFamily = computed.fontFamily;
        if (fontFamily) fonts.add(fontFamily);
      }

      return {
        colors: Array.from(colors).slice(0, 20),
        fonts: Array.from(fonts).slice(0, 10)
      };
    });

    scrapedData.styles = styles;

    // Save results
    console.log('\n\nSaving scraped data...');
    writeFileSync(
      join(OUTPUT_DIR, 'site-data.json'),
      JSON.stringify(scrapedData, null, 2)
    );

    console.log(`\n✓ Scraped data saved to ${OUTPUT_DIR}/site-data.json`);
    console.log(`  - Homepage content: ${scrapedData.homepage?.sections?.length || 0} sections`);
    console.log(`  - Pages scraped: ${scrapedData.pages.length}`);
    console.log(`  - Navigation items: ${scrapedData.navigation.length}`);
    console.log(`  - Colors found: ${scrapedData.styles.colors?.length || 0}`);
    console.log(`  - Fonts found: ${scrapedData.styles.fonts?.length || 0}`);

  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    await browser.close();
  }

  return scrapedData;
}

async function extractPageContent(page, pageName) {
  const content = await page.evaluate(() => {
    const result = {
      title: document.title,
      sections: [],
      images: [],
      headings: [],
      paragraphs: []
    };

    // Extract all headings
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(h => {
      const text = h.textContent?.trim();
      if (text) {
        result.headings.push({
          level: h.tagName.toLowerCase(),
          text: text
        });
      }
    });

    // Extract all paragraphs and text content
    const paragraphs = document.querySelectorAll('p, [data-testid*="paragraph"], [data-testid*="richtext"]');
    paragraphs.forEach(p => {
      const text = p.textContent?.trim();
      if (text && text.length > 10) {
        result.paragraphs.push(text);
      }
    });

    // Extract images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      const src = img.src;
      const alt = img.alt;
      if (src) {
        result.images.push({ src, alt });
      }
    });

    // Try to extract sections based on common patterns
    const sectionElements = document.querySelectorAll('section, [data-testid*="section"], [role="region"], main > div');
    sectionElements.forEach((section, index) => {
      const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
      const texts = Array.from(section.querySelectorAll('p, span, div'))
        .map(el => el.textContent?.trim())
        .filter(text => text && text.length > 20);

      if (heading || texts.length > 0) {
        result.sections.push({
          id: `section-${index}`,
          heading: heading?.textContent?.trim() || '',
          texts: texts.slice(0, 10) // Limit to first 10 text elements
        });
      }
    });

    return result;
  });

  return content;
}

// Run the scraper
scrapeWithPlaywright()
  .then(() => {
    console.log('\n✓ Scraping completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Scraping failed:', error);
    process.exit(1);
  });
