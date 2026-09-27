import { readFileSync, writeFileSync, readdirSync } from 'node:fs'

const distDir = new URL('./dist/assets/', import.meta.url)
const files = readdirSync(distDir)
const jsFile = files.find((f) => f.endsWith('.js'))
const cssFile = files.find((f) => f.endsWith('.css'))

let css = readFileSync(new URL(jsFile ? `./dist/assets/${cssFile}` : '', import.meta.url), 'utf8')
const js = readFileSync(new URL(`./dist/assets/${jsFile}`, import.meta.url), 'utf8')

// Extraer @import de Google Fonts para ponerlo como <link> en el <head>
let fontLink = ''
css = css.replace(/@import\s*["']([^"']+)["'];?/g, (_m, url) => {
  fontLink = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${url}">`
  return ''
})

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<meta name="theme-color" content="#0f172a" />
<meta name="description" content="Cotizador profesional de mudanzas y fletes - Mudanzas Metepec" />
<title>Cotizador Mudanzas Metepec</title>
${fontLink}
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${js}</script>
</body>
</html>
`

writeFileSync(new URL('./cotizador-standalone.html', import.meta.url), html)
console.log('OK bytes:', html.length)
