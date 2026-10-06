import React,{useMemo,useState} from 'react'
import { CalendarDays, RefreshCw, Radio, Trophy } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Card, Pill, TeamMark, TournamentMark } from '../components/UI'
import { featureCopy } from '../featureCopy'
import { localeTag } from '../i18n'

export default function LiveScores(){
 const {state,currentUser,syncAllSports}=useApp()
 const c=featureCopy(state.locale)
 const [filter,setFilter]=useState('all')
 const [tournament,setTournament]=useState('all')
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const team=id=>state.teams.find(t=>t.id===id)
 const tour=id=>state.tournaments.find(t=>t.id===id)
 const loc=localeTag(state.locale)
 const rows=useMemo(()=>[...state.matches].filter(m=>m.externalId||m.external_id).filter(m=>tournament==='all'||m.tournamentId===tournament).filter(m=>filter==='all'||(filter==='live'?m.status==='live':filter==='finished'?m.status==='finished':filter==='upcoming'?['scheduled','postponed'].includes(m.status):true)).sort((a,b)=>filter==='finished'?new Date(b.kickoff)-new Date(a.kickoff):new Date(a.kickoff)-new Date(b.kickoff)),[state.matches,tournament,filter])
 const sync=async()=>{setBusy(true);setMessage('');try{const r=await syncAllSports();const n=(r?.results||[]).reduce((s,x)=>s+(x.matches||0),0);setMessage(`✓ ${n} matches synced`)}catch(e){setMessage(e.message||'Sync failed')}finally{setBusy(false)}}
 return <><div className="page-head live-head"><div><span className="eyebrow"><Radio size={14}/> {c.realData}</span><h1>{c.liveTitle}</h1><p>{c.liveText}</p></div>{currentUser?.role==='admin'&&<Button variant="secondary" onClick={sync} disabled={busy}><RefreshCw size={16} className={busy?'spin':''}/>{busy?c.syncing:c.sync}</Button>}</div>
 {message&&<div className="sync-message">{message}</div>}
 <div className="score-toolbar"><div className="score-tabs">{[['all',c.all],['live',c.liveNow],['finished',c.finished],['upcoming',c.upcoming]].map(([id,label])=><button key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>{id==='live'&&<span className="live-dot"/>}{label}</button>)}</div><select value={tournament} onChange={e=>setTournament(e.target.value)}><option value="all">{c.all}</option>{state.tournaments.map(t=><option key={t.id} value={t.id}>{t.name} {t.edition}</option>)}</select></div>
 <div className="live-provider-note"><span>{c.provider}: <b>TheSportsDB</b></span><span>{c.freeTier}</span></div>
 <div className="live-groups">{rows.length?rows.map(m=>{const h=team(m.homeTeamId),a=team(m.awayTeamId),tr=tour(m.tournamentId);return <Card className={`live-match ${m.status==='live'?'is-live':''}`} key={m.id}><div className="live-competition"><TournamentMark tournament={tr} size="sm"/><div><b>{tr?.name||'Football'}</b><span>{m.stage||m.round}</span></div><Pill tone={m.status==='live'?'green':'default'}>{m.status==='live'?c.liveNow:m.status==='finished'?c.finished:c.upcoming}</Pill></div><div className="live-match-main"><div className="live-time">{m.status==='finished'?<b>FT</b>:m.status==='live'?<><b>{m.minute?`${m.minute}'`:'LIVE'}</b><span className="live-dot"/></>:<><b>{new Date(m.kickoff).toLocaleTimeString(loc,{hour:'2-digit',minute:'2-digit'})}</b><small>{new Date(m.kickoff).toLocaleDateString(loc,{month:'short',day:'numeric'})}</small></>}</div><div className="live-teams"><div><TeamMark team={h} size="sm"/><span>{h?.name||'TBD'}</span>{m.homeScore!==null&&m.homeScore!==undefined&&<strong>{m.homeScore}</strong>}</div><div><TeamMark team={a} size="sm"/><span>{a?.name||'TBD'}</span>{m.awayScore!==null&&m.awayScore!==undefined&&<strong>{m.awayScore}</strong>}</div></div></div>{m.venue&&<div className="live-venue"><CalendarDays size={13}/>{m.venue}</div>}</Card>}):<Card className="empty"><Trophy/><h3>{state.locale==='es'?'No hay partidos en este filtro.':state.locale==='fr'?'Aucun match pour ce filtre.':'No matches in this filter.'}</h3><p>{state.locale==='es'?'Sincroniza para buscar resultados actualizados.':state.locale==='fr'?'Synchronisez pour récupérer les résultats à jour.':'Sync to fetch the latest available results.'}</p></Card>}</div>
 </>
}
