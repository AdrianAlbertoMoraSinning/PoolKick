import {build} from 'esbuild'
import {mkdir} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
import path from 'node:path'
const output=path.resolve('node_modules/.cache/poolkick-render-smoke.mjs')
await mkdir(path.dirname(output),{recursive:true})
await build({entryPoints:['tests/render-smoke.jsx'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:output,define:{'import.meta.env':'{}'}})
await import(pathToFileURL(output).href)
