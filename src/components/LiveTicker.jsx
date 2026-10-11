import React,{useMemo} from 'react'
import { Link } from 'react-router-dom'
import { Radio } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { localizedField } from '../i18n'

export default function LiveTicker(){
  const {state}=useApp()
  const items=useMemo(()=>{
    const now=Date.now()
    const live=state.matches.filter(m=>m.status==='live')
    const recent=state.matches.filter(m=>m.status==='finished').sort((a,b)=>new Date(b.kickoff)-new Date(a.kickoff)).slice(0,5)
    const upcoming=state.matches.filter(m=>m.status==='scheduled'&&new Date(m.kickoff).getTime()>now).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff)).slice(0,4)
    const team=id=>state.teams.find(t=>t.id===id)?.name||'TBD'
    const scoreRows=[...live,...recent,...upcoming].map(m=>({type:'score',id:`s-${m.id}`,text:m.status==='scheduled'?`${team(m.homeTeamId)} vs ${team(m.awayTeamId)}`:`${team(m.homeTeamId)} ${m.homeScore??'-'} – ${m.awayScore??'-'} ${team(m.awayTeamId)}`}))
    const news=[...(state.news||[])].filter(n=>n.status!=='draft').sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0)).slice(0,5).map(n=>({type:'news',id:`n-${n.id}`,text:localizedField(n,'title',state.locale)}))
    return [...scoreRows,...news]
  },[state.matches,state.teams,state.news,state.locale])
  if(!items.length)return null
  const loop=[...items,...items]
  return <div className="live-ticker" aria-label="Live scores and football news"><div className="ticker-label"><Radio size={15}/> LIVE</div><div className="ticker-window"><div className="ticker-track">{loop.map((item,i)=><Link key={`${item.id}-${i}`} to={item.type==='score'?'/live':'/news'}><b>{item.type==='score'?'Score':'News'}</b><span>{item.text}</span></Link>)}</div></div></div>
}
