import React,{useState} from 'react'
import { useApp } from '../context/AppContext'
import { avatars } from '../data/seed'
import { Avatar, Button, Card } from '../components/UI'

import { qaCopy } from '../lib/qa'

export default function Profile(){
 const {currentUser,updateProfile,t,state}=useApp()
 const c=qaCopy(state.locale)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 const [f,setF]=useState({...currentUser})
 const save=async e=>{e.preventDefault();setBusy(true);setError('');setMessage('');try{await updateProfile({displayName:f.displayName,avatar:f.avatar,country:f.country,countryFlag:f.countryFlag,favoriteTeam:f.favoriteTeam});setMessage(t('profile.saved'))}catch(e){setError(e.message||c.failed)}finally{setBusy(false)}}
 return <><div className="page-head"><div><span className="eyebrow">{t('profile.eyebrow')}</span><h1>{t('profile.title')}</h1><p>{t('profile.text')}</p></div></div><div className="profile-grid"><Card className="profile-preview"><Avatar user={f} size="xl"/><h2>{f.displayName}</h2><p>{f.countryFlag} {f.favoriteTeam||t('profile.fan')}</p><small>{currentUser.email}</small></Card><Card className="panel"><form onSubmit={save}><label>{t('profile.name')}<input required maxLength={100} value={f.displayName} onChange={e=>setF({...f,displayName:e.target.value})}/></label><div className="form-two"><label>{t('profile.country')}<input placeholder="CO" value={f.country||''} onChange={e=>setF({...f,country:e.target.value.toUpperCase()})}/></label><label>{t('profile.flag')}<input placeholder="🇨🇴" value={f.countryFlag||''} onChange={e=>setF({...f,countryFlag:e.target.value})}/></label></div><label>{t('profile.favorite')}<input placeholder="Colombia" value={f.favoriteTeam||''} onChange={e=>setF({...f,favoriteTeam:e.target.value})}/></label><label>{t('profile.avatar')}</label><div className="avatar-picker">{avatars.map(a=><button type="button" className={f.avatar===a?'selected':''} key={a} onClick={()=>setF({...f,avatar:a})}>{a}</button>)}</div><Button type="submit" disabled={busy}>{busy?c.saving:t('profile.save')}</Button>{error&&<div role="alert" className="form-error">{error}</div>}{message&&<div role="status" className="form-success">{message}</div>}</form></Card></div></>
}
