import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter,Routes,Route} from 'react-router-dom'
import {AppProvider} from '../src/context/AppContext'
import {seedState} from '../src/data/seed'
import Dashboard from '../src/pages/Dashboard'
import Rankings from '../src/pages/Rankings'
import LiveScores from '../src/pages/LiveScores'
import Tournaments from '../src/pages/Tournaments'
import Pools from '../src/pages/Pools'
import PoolDetail from '../src/pages/PoolDetail'
import Profile from '../src/pages/Profile'
import News from '../src/pages/News'
import Support from '../src/pages/Support'
import Manual from '../src/pages/Manual'
import Admin from '../src/pages/Admin'
import Landing from '../src/pages/Landing'

// Rendering fixtures only. This is not an authenticated browser/production test.
const fixture=structuredClone(seedState)
fixture.sessionUserId=fixture.users.find(u=>u.role==='admin').id
let currentLocale='en'
globalThis.localStorage={getItem:key=>key==='poolkick_locale'?currentLocale:key==='poolkick_state_v3'?JSON.stringify(fixture):null,setItem:()=>{}}
const pages=[Dashboard,Rankings,LiveScores,Tournaments,Pools,PoolDetail,Profile,News,Support,Manual,Admin]
let count=0
for(const locale of ['en','es','fr']){
 currentLocale=locale
 for(const Page of pages){
  const html=renderToStaticMarkup(<MemoryRouter initialEntries={['/pools/'+fixture.pools[0].id]}><AppProvider><Routes><Route path="/pools/:id" element={<Page/>}/></Routes></AppProvider></MemoryRouter>)
  if(!html||html.includes('undefined'))throw new Error(`${Page.name} ${locale} rendering failed`)
  count++
 }
 const loggedOut={...fixture,sessionUserId:null}
 const getItem=localStorage.getItem
 localStorage.getItem=key=>key==='poolkick_state_v3'?JSON.stringify(loggedOut):getItem(key)
 const html=renderToStaticMarkup(<MemoryRouter><AppProvider><Landing/></AppProvider></MemoryRouter>)
 if(!html.includes('PoolKick'))throw new Error('Landing render failed')
 localStorage.getItem=getItem
 count++
}
console.log(`PASS: ${count} module/locale static renders. Browser behavior and responsive layout require separate checks.`)
