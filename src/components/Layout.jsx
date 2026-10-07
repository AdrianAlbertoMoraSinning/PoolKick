import React, {useState} from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, BookOpen, CircleUserRound, Gauge, Heart, ListOrdered, LogOut, Menu, Newspaper, Radio, Shield, Trophy, UsersRound, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { APP } from '../config'
import { Button } from './UI'
import LanguageSwitcher from './LanguageSwitcher'
import { featureCopy } from '../featureCopy'

export default function Layout(){
  const {currentUser,state,logout,markNotificationsRead,mode,t}=useApp()
  const c=featureCopy(state.locale)
  const nav=useNavigate()
  const [open,setOpen]=useState(false)
  const [bells,setBells]=useState(false)
  const notices=state.notifications.filter(n=>n.userId===currentUser?.id)
  const unread=notices.filter(n=>!n.read).length
  const links=[
    ['/dashboard',Gauge,t('nav.dashboard')],
    ['/live',Radio,c.live],
    ['/rankings',ListOrdered,c.rankings],
    ['/news',Newspaper,t('nav.news')],
    ['/tournaments',Trophy,t('nav.tournaments')],
    ['/pools',UsersRound,t('nav.pools')],
    ['/profile',CircleUserRound,t('nav.profile')],
    ['/support',Heart,t('nav.support')],
    ['/manual',BookOpen,t('nav.manual')]
  ]
  if(currentUser?.role==='admin') links.push(['/admin',Shield,t('nav.admin')])
  const mobileLinks=links.filter(([to])=>['/dashboard','/live','/rankings','/pools'].includes(to))
  const doLogout=async()=>{await logout();nav('/')}

  return <div className="app-shell">
    <aside className={`sidebar ${open?'open':''}`}>
      <div className="brand-row"><NavLink to="/dashboard" className="brand"><span className="brand-ball">⚽</span><span>{APP.name}</span></NavLink><button className="icon-btn mobile-only" onClick={()=>setOpen(false)}><X size={20}/></button></div>
      <div className="mode-chip">{mode==='demo'?t('common.demo'):t('common.live')}</div>
      <nav>{links.map(([to,Icon,label])=><NavLink key={to} to={to} onClick={()=>setOpen(false)}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-foot"><LanguageSwitcher/><div className="small muted user-name">{currentUser?.displayName}</div><div className="tiny muted">{currentUser?.email}</div><Button variant="ghost" onClick={doLogout}><LogOut size={16}/> {t('common.signOut')}</Button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-only" onClick={()=>setOpen(true)}><Menu/></button><NavLink className="mobile-brand mobile-only" to="/dashboard">⚽ {APP.name}</NavLink><div className="top-spacer"/><div className="desktop-lang"><LanguageSwitcher compact/></div>
        <div className="bell-wrap"><button className="icon-btn" onClick={()=>{setBells(!bells);if(!bells)markNotificationsRead()}}><Bell size={20}/>{unread>0&&<b>{unread}</b>}</button>{bells&&<div className="notice-pop"><strong>{t('common.notifications')}</strong>{notices.length?notices.slice().reverse().map(n=><div className="notice" key={n.id}>{n.text}<small>{new Date(n.createdAt).toLocaleDateString()}</small></div>):<p className="muted">{t('common.noNotifications')}</p>}</div>}</div>
        <NavLink to="/profile" className="top-avatar">{currentUser?.avatar || '⚽'}</NavLink>
      </header>
      <div className="page"><Outlet/></div>
      <nav className="mobile-bottom-nav">{mobileLinks.map(([to,Icon,label])=><NavLink key={to} to={to}><Icon size={20}/><span>{label}</span></NavLink>)}</nav>
    </main>
  </div>
}
