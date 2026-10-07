import React,{useMemo,useState} from 'react'
import { Link,useNavigate } from 'react-router-dom'
import { Copy, Plus, UsersRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Pill, TournamentMark } from '../components/UI'
import { standingsForPool } from '../lib/scoring'

import { qaCopy } from '../lib/qa'

export default function Pools(){
 const {state,currentUser,createPool,joinPool,t,mode}=useApp()
 const nav=useNavigate()
 const q=qaCopy(state.locale)
 const active=useMemo(()=>state.tournaments.filter(x=>x.status==='active'),[state.tournaments])
 const [create,setCreate]=useState(false)
 const [join,setJoin]=useState(false)
 const [busy,setBusy]=useState(false)
 const [err,setErr]=useState('')
 const [code,setCode]=useState('')
 const [form,setForm]=useState({tournamentId:active[0]?.id||'',name:'',scoring:'classic',visibility:'private'})
 const pools=state.pools.filter(p=>p.members.includes(currentUser.id))
 const openCreate=()=>{setErr('');setForm(f=>({...f,tournamentId:active.some(x=>x.id===f.tournamentId)?f.tournamentId:(active[0]?.id||'')}));setCreate(true)}
 const make=async e=>{e.preventDefault();setErr('');setBusy(true);try{if(!form.tournamentId)throw new Error(q.choose);const p=await createPool(form);setCreate(false);nav(`/pools/${p.id}`)}catch(x){setErr(x.message||'Unable to create pool.')}finally{setBusy(false)}}
 const doJoin=async e=>{e.preventDefault();setErr('');setBusy(true);try{const p=await joinPool(code);if(p){setJoin(false);nav(`/pools/${p.id}`)}else setErr(t('pools.notFound'))}catch(x){setErr(x.message||t('pools.unableJoin'))}finally{setBusy(false)}}

 return <><div className="page-head"><div><span className="eyebrow">{t('pools.eyebrow')}</span><h1>{t('pools.title')}</h1><p>{t('pools.text')}</p></div><div className="head-actions"><Button variant="secondary" onClick={()=>{setErr('');setJoin(true)}}>{t('pools.joinCode')}</Button><Button onClick={openCreate}><Plus size={17}/> {t('pools.create')}</Button></div></div>
 <div className="pool-grid">{pools.map(p=>{const tournament=state.tournaments.find(x=>x.id===p.tournamentId);const standings=standingsForPool(state,p.id);const rank=standings.findIndex(x=>x.user.id===currentUser.id)+1;return <Link to={`/pools/${p.id}`} key={p.id} className="pool-card"><div className="pool-top"><TournamentMark tournament={tournament}/><Pill tone="green">{tournament?.shortName}</Pill></div><h2>{p.name}</h2><p>{tournament?.name} {tournament?.edition}</p><div className="pool-metrics"><span><UsersRound size={17}/>{t('pools.players',{count:p.members.length})}</span><span>{t('pools.rank',{rank:rank||1})}</span></div><div className="pool-code"><span>{t('pools.inviteCode')}</span><b>{p.code}</b><Copy size={16}/></div></Link>})}</div>
 {!pools.length&&<div className="empty-pools"><div>🏆</div><h3>{t('pools.createCompetition')}</h3><p>{active.length?q.emptyPools:q.noActive}</p>{active.length>0&&<Button onClick={openCreate}>{t('pools.create')}</Button>}</div>}
 {create&&<div className="modal-backdrop"><form className="auth-modal" onSubmit={make}><button type="button" className="close-x" onClick={()=>setCreate(false)}>×</button><span className="eyebrow">{t('pools.new')}</span><h2>{t('pools.createCompetition')}</h2><label>{t('pools.name')}<input placeholder="The Crew — World Cup" maxLength={100} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>{t('pools.tournament')}<select value={form.tournamentId} onChange={e=>setForm({...form,tournamentId:e.target.value})} required><option value="" disabled>{q.choose}</option>{active.map(x=><option key={x.id} value={x.id}>{x.name} {x.edition}</option>)}</select></label><label>{t('pools.scoring')}<select value={form.scoring} onChange={e=>setForm({...form,scoring:e.target.value})}><option value="classic">{t('pools.classic')}</option><option value="simple">{t('pools.simple')}</option></select></label>{err&&<div className="form-error">{err}</div>}<Button type="submit" className="full" disabled={busy||!active.length}>{busy?q.create:t('pools.createInvite')}</Button></form></div>}
 {join&&<div className="modal-backdrop"><form className="auth-modal" onSubmit={doJoin}><button type="button" className="close-x" onClick={()=>setJoin(false)}>×</button><span className="eyebrow">{t('pools.invitation')}</span><h2>{t('pools.join')}</h2><label>{t('pools.code')}<input className="code-input" placeholder="CREW26" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} required/></label>{err&&<div className="form-error">{err}</div>}<Button type="submit" className="full" disabled={busy}>{busy?q.join:t('pools.joinButton')}</Button>{mode==='demo'&&<div className="demo-note">{t('pools.demo')}</div>}</form></div>}</>
}
