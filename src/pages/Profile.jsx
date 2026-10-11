import React,{useEffect,useState} from 'react'
import { Camera, Upload } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Avatar, Button, Card } from '../components/UI'
import { qaCopy } from '../lib/qa'

const footballAvatars=['⚽','🥅','🏆','👟','🧤','🦁','🦅','🐐','🔥','⭐','🔟','🏟️','🇨🇴','🇬🇹','🇨🇦','🇦🇷','🇧🇷','🇪🇸']

async function resolveCountry(name){
  const q=(name||'').trim(); if(!q)return null
  try{
    const r=await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(q)}?fullText=true&fields=name,cca2,flag`,{signal:AbortSignal.timeout(5000)})
    if(!r.ok)return null
    const rows=await r.json(); const c=rows?.[0]
    return c?{country:c.name?.common||q,code:c.cca2||'',flag:c.flag||'🌎'}:null
  }catch{return null}
}

export default function Profile(){
 const {currentUser,updateProfile,t,state}=useApp()
 const c=qaCopy(state.locale)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[countryBusy,setCountryBusy]=useState(false),[uploadBusy,setUploadBusy]=useState(false)
 const [f,setF]=useState({...currentUser})
 useEffect(()=>setF({...currentUser}),[currentUser?.id])
 const detectCountry=async()=>{if(!f.country?.trim())return;setCountryBusy(true);const result=await resolveCountry(f.country);if(result)setF(x=>({...x,country:result.country,countryFlag:result.flag}));setCountryBusy(false)}
 const uploadPhoto=async e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/'))return setError('Please choose an image file.');if(file.size>3*1024*1024)return setError('Image must be 3 MB or smaller.');setUploadBusy(true);setError('');try{const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${currentUser.id}/avatar-${Date.now()}.${ext}`;const {error:upErr}=await supabase.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type});if(upErr)throw upErr;const {data}=supabase.storage.from('avatars').getPublicUrl(path);setF(x=>({...x,avatar:data.publicUrl}))}catch(x){setError(x.message||'Unable to upload image.')}finally{setUploadBusy(false)}}
 const save=async e=>{e.preventDefault();setBusy(true);setError('');setMessage('');try{await updateProfile({displayName:f.displayName,avatar:f.avatar,country:f.country,countryFlag:f.countryFlag,favoriteTeam:f.favoriteTeam});setMessage(t('profile.saved'))}catch(e){setError(e.message||c.failed)}finally{setBusy(false)}}
 return <><div className="page-head"><div><span className="eyebrow">{t('profile.eyebrow')}</span><h1>{t('profile.title')}</h1><p>{t('profile.text')}</p></div></div><div className="profile-grid"><Card className="profile-preview"><Avatar user={f} size="xl"/><h2>{f.displayName}</h2><p>{f.countryFlag} {f.country||''}</p><p>{f.favoriteTeam||t('profile.fan')}</p><small>{currentUser.email}</small></Card><Card className="panel"><form onSubmit={save}><label>{t('profile.name')}<input required maxLength={100} value={f.displayName} onChange={e=>setF({...f,displayName:e.target.value})}/></label><div className="form-two"><label>Country<input placeholder="Guatemala" value={f.country||''} onBlur={detectCountry} onChange={e=>setF({...f,country:e.target.value})}/><small className="muted">{countryBusy?'Finding flag…':'Type a country name and the flag will be filled automatically.'}</small></label><label>{t('profile.flag')}<input readOnly value={f.countryFlag||'🌎'}/></label></div><label>{t('profile.favorite')}<input placeholder="Guatemala / Barcelona" value={f.favoriteTeam||''} onChange={e=>setF({...f,favoriteTeam:e.target.value})}/></label><label>{t('profile.avatar')}</label><div className="avatar-picker">{footballAvatars.map(a=><button type="button" className={f.avatar===a?'selected':''} key={a} onClick={()=>setF({...f,avatar:a})}>{a}</button>)}</div><label className="upload-avatar"><span><Camera size={17}/> Upload your own image</span><input type="file" accept="image/*" onChange={uploadPhoto}/><Button type="button" variant="secondary" disabled={uploadBusy}><Upload size={16}/>{uploadBusy?'Uploading…':'Choose image'}</Button></label><Button type="submit" disabled={busy}>{busy?c.saving:t('profile.save')}</Button>{error&&<div role="alert" className="form-error">{error}</div>}{message&&<div role="status" className="form-success">{message}</div>}</form></Card></div></>
}
