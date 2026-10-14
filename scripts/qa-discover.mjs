#!/usr/bin/env node
import {chromium} from 'playwright';
const url=process.argv[2]||'https://solitaire.cardbrdbx.com/';
if(!['https:','http:'].includes(new URL(url).protocol))throw new Error('HTTP(S) URL required');
const browser=await chromium.launch();
try{const page=await browser.newPage();await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForTimeout(1000);const links=await page.locator('a[href]').evaluateAll(as=>as.filter(a=>a.getBoundingClientRect().width&&a.getBoundingClientRect().height).map(a=>({label:a.innerText.trim(),url:a.href})));console.log(JSON.stringify({dashboard:url,discoveredAt:new Date().toISOString(),links:links.filter(a=>/^https?:/.test(a.url)),note:'Candidate links only. Select game URLs explicitly; discovery does not start gameplay or verify build identity.'},null,2));}finally{await browser.close();}
