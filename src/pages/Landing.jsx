import React, {useState} from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Heart, Newspaper, Trophy, UsersRound, Zap } from 'lucide-react'
import { APP } from '../config'
import { useApp } from '../context/AppContext'
import { localizedField, localeTag } from '../i18n'
import { Button, Card } from '../components/UI'
import LanguageSwitcher from '../components/LanguageSwitcher'

import { qaCopy } from '../lib/qa'

export default function Landing(){
  const {currentUser,login,signup,mode,state,t,connectionError}=useApp()
  const nav=useNavigate()
  const [auth,setAuth]=useState(null)
  const [form,setForm]=useState(mode==='demo'?{email:'adrian@poolkick.demo',password:'demo',displayName:'Adrian'}:{email:'',password:'',displayName:''})
  const [err,setErr]=useState('')
  const [note,setNote]=useState('')
  const [busy,setBusy]=useState(false)
  if(currentUser) return <Navigate to="/dashboard" replace/>

  const submit=async(e)=>{
    e.preventDefault();setErr('');setNote('');setBusy(true)
    try{
      if(auth==='signup'){
        const result=await signup(form)
        if(result?.needsConfirmation){setNote(t('auth.confirm'));return}
      }else await login(form.email,form.password)
      nav('/dashboard')
    }catch(x){setErr(/fetch|network/i.test(x.message)?qaCopy(state.locale).connection:x.message)}finally{setBusy(false)}
  }

  const locale=state.locale||'en'
  const latest=[...(state.news||[])].filter(n=>n.status!=='draft').sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0)).slice(0,3)
  const formatDate=n=>new Date(n.publishedAt||Date.now()).toLocaleDateString(localeTag(locale),{month:'short',day:'numeric'})

  return <div className="landing">
    <header className="public-nav">
      <a className="brand" href="#top"><span className="brand-ball">⚽</span><span>{APP.name}</span></a>
      <div><a href="#how">{t('landing.how')}</a><a href="#features">{t('landing.features')}</a><Link to="/news-public">{t('landing.news')}</Link><Link to="/manual-public">{t('nav.manual')}</Link><LanguageSwitcher compact/><Button variant="ghost" onClick={()=>setAuth('login')}>{t('landing.signIn')}</Button><Button onClick={()=>setAuth('signup')}>{t('landing.createProfile')}</Button></div>
    </header>

    {connectionError&&<div className="public-warning">⚠️ {qaCopy(state.locale).connection}</div>}

    <section className="hero" id="top">
      <div className="hero-copy"><span className="eyebrow">{t('landing.eyebrow')}</span><h1>{t('landing.hero1')}<br/><em>{t('landing.hero2')}</em></h1><p>{t('landing.intro')}</p><div className="hero-actions"><Button onClick={()=>setAuth('signup')}>{t('landing.createPool')} <ChevronRight size={18}/></Button><Button variant="secondary" onClick={()=>setAuth('login')}>{t('landing.joinFriends')}</Button></div><div className="trust-row"><span><CheckCircle2/> {t('landing.noBetting')}</span><span><CheckCircle2/> {t('landing.privateGroups')}</span><span><CheckCircle2/> {t('landing.mobileFirst')}</span></div></div>
      <div className="hero-card-wrap"><Card className="hero-score-card"><div className="live-label"><span/> {t('landing.matchday')}</div><h3>The Crew — World Cup</h3><div className="hero-match"><div><b>🇨🇴</b><span>Colombia</span></div><div className="score-pick"><i>2</i><span>–</span><i>1</i><small>{t('landing.yourPick')}</small></div><div><b>🇦🇷</b><span>Argentina</span></div></div><div className="mini-table"><div><b>1</b><span>🦁 Adrian</span><strong>42 pts</strong></div><div><b>2</b><span>🦊 Marlon</span><strong>40 pts</strong></div><div><b>3</b><span>🦅 Luisa</span><strong>36 pts</strong></div></div></Card><div className="float-badge">🔥 {t('landing.streak')}</div></div>
    </section>

    <section className="tournament-strip"><span>{t('landing.builtFor')}</span><div><b>🌎 World Cup</b><b>🏆 Champions League</b><b>🇪🇺 EURO</b><b>🌎 Copa América</b></div></section>

    <section className="section" id="how"><span className="eyebrow">{t('landing.steps')}</span><h2>{t('landing.stepsTitle')}</h2><div className="three-grid">{[['01','landing.step1Title','landing.step1Text'],['02','landing.step2Title','landing.step2Text'],['03','landing.step3Title','landing.step3Text']].map(x=><Card key={x[0]}><i>{x[0]}</i><h3>{t(x[1])}</h3><p>{t(x[2])}</p></Card>)}</div></section>

    <section className="section feature-section" id="features"><div><span className="eyebrow">{t('landing.everything')}</span><h2>{t('landing.featureTitle')}</h2><p>{t('landing.featureText')}</p></div><div className="feature-grid"><div><Trophy/><b>{t('landing.autoStandings')}</b><span>{t('landing.autoStandingsText')}</span></div><div><UsersRound/><b>{t('landing.privatePools')}</b><span>{t('landing.privatePoolsText')}</span></div><div><Zap/><b>{t('landing.kickoffLock')}</b><span>{t('landing.kickoffLockText')}</span></div></div></section>

    <section className="section landing-news"><div className="section-title"><div><span className="eyebrow">{t('landing.latestNews')}</span><h2>{t('landing.latestNewsText')}</h2></div><Link className="text-link" to="/news-public">{t('landing.viewNews')} <ChevronRight size={16}/></Link></div><div className="news-grid compact">{latest.length?latest.map(n=><Card key={n.id}><div className="news-art-cover small"><Newspaper/></div><span className="eyebrow">{n.sourceName||APP.name} · {formatDate(n)}</span><h3>{localizedField(n,'title',locale)}</h3><p>{localizedField(n,'summary',locale)}</p></Card>):<Card><Newspaper/><p>{t('news.empty')}</p></Card>}</div></section>

    <section className="donation-strip"><div><Heart/><span className="eyebrow">{t('landing.supportTitle')}</span><h2>{t('landing.supportText')}</h2></div><Link className="btn btn-primary" to="/support-public">{t('landing.donate')}</Link></section>

    <footer><div className="brand">⚽ {APP.name}</div><p>{t('landing.footer')}</p><small>© 2026 {APP.name}. {t('landing.brandTemp')}</small></footer>

    {auth&&<div className="modal-backdrop" onMouseDown={()=>setAuth(null)}><div className="auth-modal" onMouseDown={e=>e.stopPropagation()}><button className="close-x" onClick={()=>setAuth(null)}>×</button><div className="brand center">⚽ {APP.name}</div><h2>{auth==='signup'?t('auth.createTitle'):t('auth.welcome')}</h2><p className="muted">{auth==='signup'?t('auth.createHelp'):t('auth.signInHelp')}</p><form onSubmit={submit}>{auth==='signup'&&<label>{t('auth.displayName')}<input value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} required/></label>}<label>{t('auth.email')}<input type="email" name="email" autoComplete="username" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/></label><label>{t('auth.password')}<input type="password" name="password" autoComplete={auth==='signup'?'new-password':'current-password'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/></label>{err&&<div className="form-error">{err}</div>}{note&&<div className="form-success">{note}</div>}<Button type="submit" className="full" disabled={busy}>{busy?qaCopy(state.locale).loading:auth==='signup'?t('auth.create'):t('landing.signIn')}</Button></form>{mode==='demo'&&<div className="demo-note"><b>{t('auth.demoTitle')}</b><span>{t('auth.demoText')}</span></div>}</div></div>}
  </div>
}
