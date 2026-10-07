import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {MemoryRouter,useNavigate} from 'react-router-dom'
import assert from 'node:assert/strict'
import App from '../src/App'
import {AppProvider,useApp} from '../src/context/AppContext'
import {seedState} from '../src/data/seed'
import {featureCopy} from '../src/featureCopy'
import {qaCopy} from '../src/lib/qa'

const container=document.getElementById('root')
let root,app,navigate,count=0
function Probe(){app=useApp();navigate=useNavigate();return null}
async function mount(path='/'){
  if(root)await act(async()=>root.unmount())
  root=createRoot(container)
  await act(async()=>root.render(<MemoryRouter initialEntries={[path]}><AppProvider><Probe/><App/></AppProvider></MemoryRouter>))
}
async function route(path){await act(async()=>navigate(path))}
async function click(el){assert.ok(el,'Expected button/link exists');assert.notEqual(el.disabled,true);await act(async()=>el.click())}
function button(text,scope=container){const found=[...scope.querySelectorAll('button')].find(x=>x.textContent.trim()===text);assert.ok(found,`Missing button: ${text}`);return found}
async function input(el,value){assert.ok(el,'Expected input exists');assert.equal(el.disabled,false);await act(async()=>{
  const type=el.tagName==='TEXTAREA'?window.HTMLTextAreaElement:HTMLInputElement
  Object.getOwnPropertyDescriptor(type.prototype,'value').set.call(el,String(value))
  el.dispatchEvent(new Event('input',{bubbles:true}))
})}
async function submit(form){assert.ok(form,'Expected form exists');await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))}
function pass(label){count++;console.log('PASS: '+label)}
async function login(label){
  await route('/')
  await click(button(app.t('landing.signIn')))
  await input(container.querySelector('input[name="email"]'),`${label}@simulation.example.invalid`)
  await input(container.querySelector('input[name="password"]'),'fictional-demo-only')
  await submit(container.querySelector('.auth-modal form'))
  assert.equal(app.currentUser.id,label)
}

for(const locale of ['en','es','fr']){
  const fixture=structuredClone(seedState)
  const tournament={...fixture.tournaments[0],status:'active'}
  const sample=fixture.matches.find(m=>m.tournamentId===tournament.id)
  fixture.tournaments=[tournament]
  fixture.teams=fixture.teams.filter(t=>t.tournamentId===tournament.id)
  fixture.matches=[
    {...sample,id:'sim_future',status:'scheduled',kickoff:new Date(Date.now()+7200000).toISOString(),homeScore:null,awayScore:null,externalId:'sim_future'},
    {...sample,id:'sim_locked',status:'scheduled',kickoff:new Date(Date.now()-7200000).toISOString(),homeScore:null,awayScore:null,externalId:'sim_locked'},
    {...sample,id:'sim_finished',status:'finished',kickoff:new Date(Date.now()-86400000).toISOString(),homeScore:0,awayScore:0,externalId:'sim_finished'}
  ]
  fixture.users=['admin','commissioner','player'].map(id=>({id,email:`${id}@simulation.example.invalid`,displayName:`QA ${id}`,role:id==='admin'?'admin':'player',avatar:'⚽',country:'CA',countryFlag:'🇨🇦',favoriteTeam:'QA'}))
  Object.assign(fixture,{sessionUserId:null,locale,pools:[],predictions:[],comments:[],news:[],notifications:[]})
  localStorage.clear();localStorage.setItem('poolkick_locale',locale);localStorage.setItem('poolkick_state_v3',JSON.stringify(fixture))
  await mount()
  assert.equal(app.mode,'demo','Simulation must never use the production Supabase client')
  await login('commissioner')
  assert.equal(document.documentElement.lang,locale)
  pass(`${locale}: fictional sign-in through form and locale`)
  await route('/admin')
  assert.ok(container.textContent.includes(app.t('admin.only')))
  assert.equal(container.querySelector('a[href="/admin"]'),null)
  pass(`${locale}: non-admin navigation and Admin denial`)
  await route('/pools')
  await click(button(app.t('pools.create')))
  await input(container.querySelector('.auth-modal input'),`QA simulation ${locale}`)
  await submit(container.querySelector('form.auth-modal'))
  const pool=app.state.pools[0]
  assert.ok(pool.code)
  assert.equal(pool.commissionerId,'commissioner')
  assert.deepEqual(pool.members,['commissioner'])
  pass(`${locale}: create pool form, invitation and creator membership`)
  const editable=[...container.querySelectorAll('.fixture input')].filter(x=>!x.disabled)
  assert.equal(editable.length,2)
  await input(editable[0],2);await input(editable[1],1)
  await click(editable[0].closest('.fixture').querySelector('.save-action button'))
  assert.equal(app.state.predictions[0].homeScore,2)
  assert.equal(app.state.predictions[0].points,null)
  assert.ok(container.querySelector('[role="status"]'))
  await input(editable[0],-1)
  await click(editable[0].closest('.fixture').querySelector('.save-action button'))
  assert.ok(container.querySelector('[role="alert"]')?.textContent.includes(qaCopy(locale).invalid))
  assert.equal(app.state.predictions[0].homeScore,2)
  await input(editable[0],2)
  await act(async()=>{await assert.rejects(app.savePrediction(pool.id,'sim_locked',1,0),new RegExp(qaCopy(locale).locked.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))})
  await act(async()=>{await assert.rejects(app.savePrediction(pool.id,'sim_future',-1,0))})
  pass(`${locale}: future pick form, late-pick lock and invalid score rejection`)
  await click(button(app.t('pool.chat')))
  await input(container.querySelector('.chat-form input'),`QA chat ${locale}`)
  await submit(container.querySelector('.chat-form'))
  assert.ok(container.textContent.includes(`QA chat ${locale}`))
  pass(`${locale}: chat form and readback`)
  await route('/profile')
  await input(container.querySelector('form input'),`QA commissioner ${locale}`)
  await submit(container.querySelector('form'))
  assert.equal(app.currentUser.displayName,`QA commissioner ${locale}`)
  assert.ok(container.querySelector('[role="status"]'))
  await mount('/profile')
  assert.equal(app.currentUser.displayName,`QA commissioner ${locale}`)
  assert.equal(app.state.pools[0].id,pool.id)
  assert.equal(app.state.comments[0].text,`QA chat ${locale}`)
  pass(`${locale}: profile form and local persistence after full remount`)
  await click(button(app.t('common.signOut')))
  assert.equal(app.currentUser,null)
  await login('player')
  await route('/pools')
  await click(button(app.t('pools.joinCode')))
  await input(container.querySelector('.code-input'),pool.code)
  await submit(container.querySelector('form.auth-modal'))
  assert.deepEqual(app.state.pools[0].members,['commissioner','player'])
  assert.equal(container.querySelector('.tabs')?.textContent.includes(app.t('pool.commissioner')),false)
  await act(async()=>app.joinPool(pool.code))
  assert.equal(app.state.pools[0].members.length,2)
  const playerInputs=[...container.querySelectorAll('.fixture input')].filter(x=>!x.disabled)
  await input(playerInputs[0],1);await input(playerInputs[1],0)
  await click(playerInputs[0].closest('.fixture').querySelector('.save-action button'))
  pass(`${locale}: invitation form, idempotent membership and player pick`)
  await click(button(app.t('common.signOut')))
  await login('admin')
  await route('/admin')
  assert.ok(container.querySelector('a[href="/admin"]'))
  const resultRow=container.querySelector('.admin-match')
  assert.ok(resultRow,'Admin result form')
  const resultInputs=resultRow.querySelectorAll('input')
  await input(resultInputs[0],2);await input(resultInputs[1],1)
  await click(resultRow.querySelector('.save-action button'))
  assert.equal(app.state.matches.find(m=>m.id==='sim_future').status,'finished')
  assert.equal(app.state.predictions.find(p=>p.userId==='commissioner').points,5)
  assert.equal(app.state.predictions.find(p=>p.userId==='player').points,3)
  await route('/rankings')
  assert.ok(container.querySelector('.rankings-table'))
  assert.ok(container.textContent.includes(`QA commissioner ${locale}`))
  const global=await app.getRankings()
  assert.equal(global[0].user_id,'commissioner');assert.equal(global[0].total_points,5)
  assert.equal((await app.getRankings(tournament.id))[1].total_points,3)
  pass(`${locale}: Admin result form, automatic 5/3 points and global/tournament Rankings`)
  await route('/live')
  await click(button(featureCopy(locale).finished))
  assert.equal(container.querySelectorAll('.live-match').length,2)
  await click(button(featureCopy(locale).upcoming))
  assert.equal(container.querySelectorAll('.live-match').length,1)
  pass(`${locale}: Live Scores filter transitions`)
  await route('/tournaments');assert.ok(container.textContent.includes(tournament.name))
  await route('/support');assert.equal(container.querySelector('.support-hero button').disabled,true)
  await route('/manual');assert.ok(container.querySelector('.manual-nav'))
  await click(container.querySelector('button[aria-label="Menu"]'))
  assert.ok(container.querySelector('.sidebar.open'))
  await click(container.querySelector('.sidebar nav a[href="/pools"]'))
  assert.equal(container.querySelector('.sidebar.open'),null)
  assert.equal(container.querySelectorAll('.mobile-bottom-nav a').length,4)
  pass(`${locale}: Tournaments, Donate guard, Manual and mobile-menu state (no visual layout claim)`)
  await route('/admin')
  const titles=container.querySelectorAll('.news-language-grid input')
  const summaries=container.querySelectorAll('.news-language-grid textarea')
  for(const [i,title] of ['QA English','QA Español','QA Français'].entries()){
    await input(titles[i],title);await input(summaries[i],'QA summary')
  }
  await submit(container.querySelector('.news-admin-form'))
  const article=app.state.news[0]
  assert.ok(article)
  await route('/news');assert.ok(container.textContent.includes({en:'QA English',es:'QA Español',fr:'QA Français'}[locale]))
  await route('/admin')
  await click([...container.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===qaCopy(locale).archive))
  assert.equal(app.state.news.find(n=>n.id===article.id).status,'draft')
  await route('/news');assert.equal(container.querySelector('.news-feature'),null)
  pass(`${locale}: multilingual news publish form, render and archive button`)
}
await act(async()=>root.unmount())
console.log(`PASS: ${count} functional simulation scenarios. Demo fixture persistence only; no real Auth, CSS layout, provider sync or payment certification.`)
