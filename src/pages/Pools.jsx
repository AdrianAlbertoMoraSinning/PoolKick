import React,{useState} from 'react'
import { Link,useNavigate } from 'react-router-dom'
import { Copy, Plus, UsersRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Pill } from '../components/UI'
import { standingsForPool } from '../lib/scoring'

export default function Pools(){
 const {state,currentUser,createPool,joinPool,t,mode}=useApp()
 const nav=useNavigate()
 const [create,setCreate]=useState(false)
 const [join,setJoin]=useState(false)
 const [code,setCode]=useState('')
 const [form,setForm]=useState({tournamentId:state.tournaments.find(x=>x.status==='active')?.id,name:'',scoring:'classic',visibility:'private'})
 const pools=state.pools.filter(p=>p.members.includes(currentUser.id))
 const make=e=>{e.preventDefault();const p=createPool(form);setCreate(false);nav(`/pools/${p.id}`)}
 const doJoin=async e=>{e.preventDefault();try{const p=await joinPool(code);if(p)nav(`/pools/${p.id}`);else alert(t('pools.notFound'))}catch(err){alert(err.message||t('pools.unableJoin'))}}

 return <><div className="page-head"><div><span className="eyebrow">{t('pools.eyebrow')}</span><h1>{t('pools.title')}</h1><p>{t('pools.text')}</p></div><div className="head-actions"><Button variant="secondary" onClick={()=>setJoin(true)}>{t('pools.joinCode')}</Button><Button onClick={()=>setCreate(true)}><Plus size={17}/> {t('pools.create')}</Button></div></div>
 <div className="pool-grid">{pools.map(p=>{const tournament=state.tournaments.find(x=>x.id===p.tournamentId);const standings=standingsForPool(state,p.id);const rank=standings.findIndex(x=>x.user.id===currentUser.id)+1;return <Link to={`/pools/${p.id}`} key={p.id} className="pool-card"><div className="pool-top"><div className="tourney-icon" style={{background:tournament?.accent}}>{tournament?.icon}</div><Pill tone="green">{tournament?.shortName}</Pill></div><h2>{p.name}</h2><p>{tournament?.name} {tournament?.edition}</p><div className="pool-metrics"><span><UsersRound size={17}/>{t('pools.players',{count:p.members.length})}</span><span>{t('pools.rank',{rank})}</span></div><div className="pool-code"><span>{t('pools.inviteCode')}</span><b>{p.code}</b><Copy size={16}/></div></Link>})}</div>
 {create&&<div className="modal-backdrop"><form className="auth-modal" onSubmit={make}><button type="button" className="close-x" onClick={()=>setCreate(false)}>×</button><span className="eyebrow">{t('pools.new')}</span><h2>{t('pools.createCompetition')}</h2><label>{t('pools.name')}<input placeholder="The Crew — World Cup" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>{t('pools.tournament')}<select value={form.tournamentId} onChange={e=>setForm({...form,tournamentId:e.target.value})}>{state.tournaments.filter(x=>x.status==='active').map(x=><option key={x.id} value={x.id}>{x.name} {x.edition}</option>)}</select></label><label>{t('pools.scoring')}<select value={form.scoring} onChange={e=>setForm({...form,scoring:e.target.value})}><option value="classic">{t('pools.classic')}</option><option value="simple">{t('pools.simple')}</option></select></label><Button type="submit" className="full">{t('pools.createInvite')}</Button></form></div>}
 {join&&<div className="modal-backdrop"><form className="auth-modal" onSubmit={doJoin}><button type="button" className="close-x" onClick={()=>setJoin(false)}>×</button><span className="eyebrow">{t('pools.invitation')}</span><h2>{t('pools.join')}</h2><label>{t('pools.code')}<input className="code-input" placeholder="CREW26" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} required/></label><Button type="submit" className="full">{t('pools.joinButton')}</Button>{mode==='demo'&&<div className="demo-note">{t('pools.demo')}</div>}</form></div>}</>
}
