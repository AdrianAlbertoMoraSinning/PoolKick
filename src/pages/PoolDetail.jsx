import React,{useState} from 'react'
import { Link,useParams } from 'react-router-dom'
import { Copy, LockKeyhole, MessageCircle, Settings2, Trophy } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar, Button, Card, Pill, TeamMark } from '../components/UI'
import { standingsForPool } from '../lib/scoring'
import { footballText, localeTag } from '../i18n'

export default function PoolDetail(){
 const {id}=useParams()
 const {state,currentUser,savePrediction,addComment,t}=useApp()
 const pool=state.pools.find(p=>p.id===id)
 const [tab,setTab]=useState('picks')
 const [chat,setChat]=useState('')
 const [draft,setDraft]=useState({})
 const userById=Object.fromEntries(state.users.map(u=>[u.id,u]))
 if(!pool)return <Card><h2>{t('pool.notFound')}</h2><Link to="/pools">{t('pool.back')}</Link></Card>
 const tournament=state.tournaments.find(x=>x.id===pool.tournamentId)
 const team=id=>state.teams.find(x=>x.id===id)
 const matches=state.matches.filter(m=>m.tournamentId===pool.tournamentId).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff))
 const standing=standingsForPool(state,pool.id)
 const comments=state.comments.filter(c=>c.poolId===pool.id)
 const isCommissioner=pool.commissionerId===currentUser.id
 const members=pool.members.map(id=>state.users.find(u=>u.id===id)).filter(Boolean)
 const submitChat=e=>{e.preventDefault();addComment(pool.id,chat);setChat('')}
 const loc=localeTag(state.locale)

 return <><div className="pool-hero"><div className="tourney-icon large" style={{background:tournament?.accent}}>{tournament?.icon}</div><div><span className="eyebrow">{tournament?.name} · {tournament?.edition}</span><h1>{pool.name}</h1><div className="pool-hero-meta"><Pill tone="green">{t('pool.players',{count:pool.members.length})}</Pill><span><LockKeyhole size={14}/> {t('pool.private')}</span><span>{t('pool.scoring',{value:pool.scoring==='classic'?'5–3–2':'3–1'})}</span></div></div><div className="invite-card"><small>{t('pool.invite')}</small><b>{pool.code}</b><Button variant="secondary" onClick={()=>navigator.clipboard?.writeText(pool.code)}><Copy size={16}/> {t('pool.copy')}</Button></div></div>
 <div className="tabs"><button className={tab==='picks'?'active':''} onClick={()=>setTab('picks')}>{t('pool.picks')}</button><button className={tab==='table'?'active':''} onClick={()=>setTab('table')}>{t('pool.table')}</button><button className={tab==='chat'?'active':''} onClick={()=>setTab('chat')}>{t('pool.chat')}</button><button className={tab==='members'?'active':''} onClick={()=>setTab('members')}>{t('pool.members')}</button>{isCommissioner&&<button className={tab==='manage'?'active':''} onClick={()=>setTab('manage')}>{t('pool.commissioner')}</button>}</div>
 {tab==='picks'&&<div className="fixtures">{matches.map(m=>{const h=team(m.homeTeamId),a=team(m.awayTeamId),existing=state.predictions.find(p=>p.poolId===pool.id&&p.matchId===m.id&&p.userId===currentUser.id),locked=new Date(m.kickoff)<=new Date(),d=draft[m.id]||{home:existing?.homeScore??'',away:existing?.awayScore??''};return <Card className="fixture" key={m.id}><div className="fixture-meta"><span>{footballText(m.stage,state.locale)} · {footballText(m.round,state.locale)}</span><b>{m.status==='finished'?t('pool.final'):new Date(m.kickoff).toLocaleString(loc,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</b></div><div className="fixture-main"><div className="fixture-team"><TeamMark team={h}/><b>{h.name}</b></div><div className="predict-box">{m.status==='finished'?<><div className="final-score"><strong>{m.homeScore}</strong><span>–</span><strong>{m.awayScore}</strong></div><small>{t('pool.yourPick',{value:existing?`${existing.homeScore}–${existing.awayScore} · ${existing.points} pts`:'—'})}</small></>:<><div><input type="number" min="0" disabled={locked} value={d.home} onChange={e=>setDraft(x=>({...x,[m.id]:{...d,home:e.target.value}}))}/><span>–</span><input type="number" min="0" disabled={locked} value={d.away} onChange={e=>setDraft(x=>({...x,[m.id]:{...d,away:e.target.value}}))}/></div><small>{locked?t('pool.locked'):t('pool.hidden')}</small></>}</div><div className="fixture-team right"><TeamMark team={a}/><b>{a.name}</b></div></div>{!locked&&m.status!=='finished'&&<Button className="save-pick" variant="secondary" disabled={d.home===''||d.away===''} onClick={()=>savePrediction(pool.id,m.id,d.home,d.away)}>{existing?t('tournaments.updatePick'):t('tournaments.savePick')}</Button>}</Card>})}</div>}
 {tab==='table'&&<Card className="panel"><div className="panel-head"><div><span className="eyebrow">{t('pool.liveTable')}</span><h2>{t('pool.table')}</h2></div><Trophy/></div><div className="standings"><div className="stand-row header"><span>#</span><span>{t('pool.player')}</span><span>{t('pool.exact')}</span><span>{t('pool.correct')}</span><span>{t('pool.points')}</span></div>{standing.map((r,i)=><div className={`stand-row ${r.user.id===currentUser.id?'me':''}`} key={r.user.id}><b>{i+1}</b><div className="player-cell"><Avatar user={r.user} size="sm"/><span>{r.user.displayName}{r.user.id===pool.commissionerId&&<small> {t('pool.commissioner')}</small>}</span></div><span>{r.exact}</span><span>{r.correct}</span><strong>{r.points}</strong></div>)}</div></Card>}
 {tab==='chat'&&<Card className="chat-card"><div className="panel-head"><div><span className="eyebrow">{t('pool.friendly')}</span><h2>{t('pool.chat')}</h2></div><MessageCircle/></div><div className="chat-feed">{comments.map(c=><div className="chat-line" key={c.id}><Avatar user={userById[c.userId]} size="sm"/><div><b>{userById[c.userId]?.displayName}</b><p>{c.text}</p><small>{new Date(c.createdAt).toLocaleString(loc)}</small></div></div>)}</div><form className="chat-form" onSubmit={submitChat}><input placeholder={t('pool.say')} value={chat} onChange={e=>setChat(e.target.value)}/><Button type="submit">{t('pool.send')}</Button></form></Card>}
 {tab==='members'&&<div className="member-grid">{members.map(u=><Card key={u.id} className="member-card"><Avatar user={u} size="lg"/><h3>{u.displayName}</h3><p>{u.countryFlag} {u.favoriteTeam||t('pool.fan')}</p>{u.id===pool.commissionerId&&<Pill tone="green">{t('pool.commissioner')}</Pill>}</Card>)}</div>}
 {tab==='manage'&&<div className="two-col"><Card className="panel"><div className="panel-head"><h2>{t('pool.settings')}</h2><Settings2/></div><label>{t('pool.name')}<input value={pool.name} readOnly/></label><label>{t('pool.inviteCode')}<input value={pool.code} readOnly/></label><label>{t('pool.scoringFormat')}<input value={pool.scoring==='classic'?'Classic 5–3–2':'Simple 3–1'} readOnly/></label><p className="muted small">{t('pool.fixed')}</p></Card><Card className="panel"><h2>{t('pool.checklist')}</h2><ul className="check-list">{['pool.c1','pool.c2','pool.c3','pool.c4','pool.c5'].map(k=><li key={k}>✅ {t(k)}</li>)}</ul></Card></div>}</>
}
