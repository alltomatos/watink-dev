const { chromium } = require('playwright');

const BASE = 'https://watinkdev.alltomatos.dev.br';
const EMAIL = 'ronaldodavi@gmail.com';
const PASS = 'Aadmin@sup09';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push({ type: 'console', text: msg.text(), url: page.url() });
  });
  page.on('response', res => {
    const s = res.status();
    if (s >= 400) errors.push({ type: 'http', status: s, url: res.url(), page: page.url() });
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  if (await page.locator('input[name="email"]').count()) {
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASS);
    if (await page.locator('button[type="submit"]').count()) {
      await page.click('button[type="submit"]');
    } else {
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(3000);
  }

  const paths = ['/monitor','/tickets','/connections','/pipelines','/flowbuilder','/contacts','/tags','/settings'];

  for (const p of paths) {
    await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    if (p === '/connections') {
      const add = page.locator('button:has-text("Adicionar WhatsApp")').first();
      if (await add.count()) {
        await add.click();
        await page.waitForTimeout(500);
        const nameInput = page.locator('input[name="name"], input[label="Nome"], input').first();
        if (await nameInput.count()) await nameInput.fill(`smoke-${Date.now()}`);
        const saveBtn = page.locator('button:has-text("Adicionar"), button:has-text("Salvar")').last();
        if (await saveBtn.count()) await saveBtn.click();
        await page.waitForTimeout(1200);
      }
    }

    if (p === '/flowbuilder') {
      const createBtn = page.locator('button:has-text("Novo Fluxo"), button:has-text("Criar Fluxo"), button:has-text("Adicionar")').first();
      if (await createBtn.count()) {
        await createBtn.click();
        await page.waitForTimeout(500);
        const input = page.locator('input').first();
        if (await input.count()) await input.fill(`smoke-flow-${Date.now()}`);
        const save = page.locator('button:has-text("Criar"), button:has-text("Salvar")').last();
        if (await save.count()) await save.click();
        await page.waitForTimeout(1200);
      }
    }

    if (p === '/pipelines') {
      const newBtn = page.locator('a:has-text("Novo"), button:has-text("Novo"), button:has-text("Adicionar")').first();
      if (await newBtn.count()) {
        await newBtn.click();
        await page.waitForTimeout(800);
        const name = page.locator('input[name="name"], input').first();
        if (await name.count()) await name.fill(`smoke-pipe-${Date.now()}`);
        const save = page.locator('button:has-text("Salvar"), button:has-text("Criar")').last();
        if (await save.count()) await save.click();
        await page.waitForTimeout(1200);
      }
    }

    if (p === '/tags') {
      const newTag = page.locator('button:has-text("Nova Tag"), button:has-text("Novo")').first();
      if (await newTag.count()) {
        await newTag.click();
        await page.waitForTimeout(500);
        const name = page.locator('input[name="name"], input').first();
        if (await name.count()) await name.fill(`smoke-tag-${Date.now()}`);
        const save = page.locator('button:has-text("Salvar"), button:has-text("Criar")').last();
        if (await save.count()) await save.click();
        await page.waitForTimeout(1000);
      }
    }
  }

  const unique = [];
  const seen = new Set();
  for (const e of errors) {
    const k = JSON.stringify(e);
    if (!seen.has(k)) { seen.add(k); unique.push(e); }
  }

  console.log(JSON.stringify({ totalErrors: unique.length, errors: unique.slice(0, 80) }, null, 2));
  await browser.close();
})();
