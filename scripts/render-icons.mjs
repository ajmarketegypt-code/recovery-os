import puppeteer from 'puppeteer'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(__dirname, 'icon-template.html'), 'utf8')

const browser = await puppeteer.launch({ headless: true })
const page = await browser.newPage()

await page.setContent(html, { waitUntil: 'networkidle0' })

// 512×512
await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 2 })
const buf512 = await page.screenshot({ clip: { x: 0, y: 0, width: 512, height: 512 } })
writeFileSync(resolve(__dirname, '../public/icon-512.png'), buf512)
console.log('icon-512.png saved')

// 192×192 — scale the template down
await page.evaluate(() => {
  document.body.style.transform = 'scale(0.375)'
  document.body.style.transformOrigin = 'top left'
})
await page.setViewport({ width: 192, height: 192, deviceScaleFactor: 2 })
const buf192 = await page.screenshot({ clip: { x: 0, y: 0, width: 192, height: 192 } })
writeFileSync(resolve(__dirname, '../public/icon-192.png'), buf192)
console.log('icon-192.png saved')

await browser.close()
