import React,{useState} from 'react'
import { useApp } from '../context/AppContext'
import { avatars } from '../data/seed'
import { Avatar, Button, Card } from '../components/UI'

export default function Profile(){
 const {currentUser,updateProfile,t}=useApp()
 const [f,setF]=useState({...currentUser})
 const save=e=>{e.preventDefault();updateProfile({displayName:f.displayName,avatar:f.avatar,country:f.country,countryFlag:f.countryFlag,favoriteTeam:f.favoriteTeam});alert(t('profile.saved'))}
 return <><div className="page-head"><div><span className="eyebrow">{t('profile.eyebrow')}</span><h1>{t('profile.title')}</h1><p>{t('profile.text')}</p></div></div><div className="profile-grid"><Card className="profile-preview"><Avatar user={f} size="xl"/><h2>{f.displayName}</h2><p>{f.countryFlag} {f.favoriteTeam||t('profile.fan')}</p><small>{currentUser.email}</small></Card><Card className="panel"><form onSubmit={save}><label>{t('profile.name')}<input value={f.displayName} onChange={e=>setF({...f,displayName:e.target.value})}/></label><div className="form-two"><label>{t('profile.country')}<input placeholder="CO" value={f.country||''} onChange={e=>setF({...f,country:e.target.value.toUpperCase()})}/></label><label>{t('profile.flag')}<input placeholder="🇨🇴" value={f.countryFlag||''} onChange={e=>setF({...f,countryFlag:e.target.value})}/></label></div><label>{t('profile.favorite')}<input placeholder="Colombia" value={f.favoriteTeam||''} onChange={e=>setF({...f,favoriteTeam:e.target.value})}/></label><label>{t('profile.avatar')}</label><div className="avatar-picker">{avatars.map(a=><button type="button" className={f.avatar===a?'selected':''} key={a} onClick={()=>setF({...f,avatar:a})}>{a}</button>)}</div><Button type="submit">{t('profile.save')}</Button></form></Card></div></>
}
