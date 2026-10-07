import {JSDOM} from 'jsdom'
import {build} from 'esbuild'
import {mkdir} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
import path from 'node:path'

// Local component tests only. No production credentials, HTTP or browser session.
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://simulation.example.invalid'})
for(const key of ['window','document','localStorage','HTMLElement','HTMLInputElement','Event','MouseEvent'])globalThis[key]=dom.window[key]
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true})
globalThis.IS_REACT_ACT_ENVIRONMENT=true
dom.window.HTMLElement.prototype.scrollIntoView=function(){}
const output=path.resolve('node_modules/.cache/poolkick-simulation.mjs')
await mkdir(path.dirname(output),{recursive:true})
await build({entryPoints:['tests/simulation.jsx'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:output,define:{'import.meta.env':'{}'}})
try{await import(pathToFileURL(output).href)}finally{dom.window.close()}
