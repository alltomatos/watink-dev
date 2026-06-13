const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' });

  const paths = [
    '/dashboard', '/tickets', '/connections', '/pipelines', '/flowbuilder', 
    '/contacts', '/tags', '/settings', '/queues', '/users', '/groups'
  ];

  for (const path of paths) {
    console.log("Navigating to: " + path);
    await page.goto('http://localhost:3000' + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); 
    
    const bodyText = await page.textContent('body');
    if (bodyText.includes('500') || bodyText.includes('Internal Server Error')) {
        console.error("❌ Error 500 on: " + path);
    }
  }
  
  await browser.close();
})();
