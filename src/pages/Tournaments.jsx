import React,{useState} from 'react'
import { useApp } from '../context/AppContext'
import { Button, Card, Pill, TeamMark } from '../components/UI'
import { footballText, localeTag, tournamentText } from '../i18n'

export default function Tournaments(){
 const {state,currentUser,savePrediction,t}=useApp()
 const [selected,setSelected]=useState(state.tournaments.find(x=>x.status==='active')?.id)
 const [drafts,setDrafts]=useState({})
 const tournament=state.tournaments.find(x=>x.id===selected)
 const matches=state.matches.filter(m=>m.tournamentId===selected).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff))
 const team=id=>state.teams.find(x=>x.id===id)
 const userPools=state.pools.filter(p=>p.tournamentId===selected&&p.members.includes(currentUser.id))
 const pool=userPools[0]
 const pick=(m,side,val)=>setDrafts(d=>({...d,[m.id]:{home:d[m.id]?.home??'',away:d[m.id]?.away??'',[side]:val}}))
 const loc=localeTag(state.locale)

 return <><div className="page-head"><div><span className="eyebrow">{t('tournaments.eyebrow')}</span><h1>{t('tournaments.title')}</h1><p>{t('tournaments.text')}</p></div></div>
 <div className="tournament-cards">{state.tournaments.map(x=><button key={x.id} onClick={()=>setSelected(x.id)} className={`tournament-card ${selected===x.id?'selected':''}`}><div className="tourney-icon" style={{background:x.accent}}>{x.icon}</div><div><b>{x.name}</b><span>{x.edition}</span></div><Pill tone={x.status==='active'?'green':'default'}>{t(`status.${x.status}`)}</Pill></button>)}</div>
 {tournament&&<Card className="tourney-detail"><div className="tourney-banner"><div className="tourney-icon large" style={{background:tournament.accent}}>{tournament.icon}</div><div><span className="eyebrow">{tournament.edition}</span><h2>{tournament.name}</h2><p>{tournamentText(tournament.id,'description',state.locale,tournament.description)}</p></div><div className="format-box"><small>{t('tournaments.format')}</small><b>{tournamentText(tournament.id,'format',state.locale,tournament.format)}</b></div></div></Card>}
 <div className="section-title"><div><span className="eyebrow">{t('tournaments.schedule')}</span><h2>{t('tournaments.matchesPicks')}</h2></div>{pool?<Pill tone="green">{t('tournaments.playing',{name:pool.name})}</Pill>:<Pill>{t('tournaments.joinHint')}</Pill>}</div>
 <div className="fixtures">{matches.map(m=>{const h=team(m.homeTeamId),a=team(m.awayTeamId);const existing=pool&&state.predictions.find(p=>p.poolId===pool.id&&p.matchId===m.id&&p.userId===currentUser.id);const locked=new Date(m.kickoff)<=new Date();const d=drafts[m.id]||{home:existing?.homeScore??'',away:existing?.awayScore??''};return <Card className="fixture" key={m.id}><div className="fixture-meta"><span>{footballText(m.stage,state.locale)} · {footballText(m.round,state.locale)}</span><b>{m.status==='finished'?t('tournaments.final'):new Date(m.kickoff).toLocaleString(loc,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</b></div><div className="fixture-main"><div className="fixture-team"><TeamMark team={h}/><b>{h.name}</b></div><div className="predict-box">{m.status==='finished'?<div className="final-score"><strong>{m.homeScore}</strong><span>–</span><strong>{m.awayScore}</strong></div>:<><div><input aria-label={`${h.name} score`} type="number" min="0" value={d.home} disabled={locked} onChange={e=>pick(m,'home',e.target.value)}/><span>–</span><input aria-label={`${a.name} score`} type="number" min="0" value={d.away} disabled={locked} onChange={e=>pick(m,'away',e.target.value)}/></div><small>{locked?t('tournaments.locked'):t('tournaments.yourPrediction')}</small></>}</div><div className="fixture-team right"><TeamMark team={a}/><b>{a.name}</b></div></div>{m.status!=='finished'&&pool&&!locked&&<Button variant="secondary" className="save-pick" disabled={d.home===''||d.away===''} onClick={()=>savePrediction(pool.id,m.id,d.home,d.away)}>{existing?t('tournaments.updatePick'):t('tournaments.savePick')}</Button>}{existing&&m.status==='finished'&&<div className="points-earned">{t('tournaments.yourPick',{home:existing.homeScore,away:existing.awayScore,points:existing.points})}</div>}</Card>})}</div></>
}
