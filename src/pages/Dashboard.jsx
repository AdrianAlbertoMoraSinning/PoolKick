import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, CheckCircle2, Newspaper, Trophy, UsersRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card, Pill, Stat, TeamMark } from '../components/UI'
import { standingsForPool } from '../lib/scoring'
import { localizedField, localeTag } from '../i18n'

export default function Dashboard(){
  const {state,currentUser,t}=useApp()
  const pools=state.pools.filter(p=>p.members.includes(currentUser.id))
  const pool=pools[0]
  const standing=pool?standingsForPool(state,pool.id):[]
  const me=standing.find(x=>x.user.id===currentUser.id)
  const upcoming=state.matches.filter(m=>new Date(m.kickoff)>new Date()).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff)).slice(0,4)
  const getTeam=id=>state.teams.find(t=>t.id===id)
  const pending=pool?upcoming.filter(m=>m.tournamentId===pool.tournamentId&&!state.predictions.some(p=>p.poolId===pool.id&&p.matchId===m.id&&p.userId===currentUser.id)).length:0
  const latest=[...(state.news||[])].filter(n=>n.status!=='draft').sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0)).slice(0,3)
  const loc=localeTag(state.locale)

  return <><div className="page-head"><div><span className="eyebrow">{t('dashboard.hello',{name:currentUser.displayName})}</span><h1>{t('dashboard.title')}</h1><p>{t('dashboard.text')}</p></div><Link className="btn btn-primary" to="/pools">{t('dashboard.openPools')} <ArrowRight size={17}/></Link></div>
    <div className="stats-grid"><Card><Stat value={pools.length} label={t('dashboard.activePools')}/><UsersRound/></Card><Card><Stat value={me?.points||0} label={t('dashboard.totalPoints')}/><Trophy/></Card><Card><Stat value={pending} label={t('dashboard.picksToMake')}/><CalendarDays/></Card><Card><Stat value={me?.exact||0} label={t('dashboard.exactScores')}/><CheckCircle2/></Card></div>
    <div className="dash-grid"><Card className="panel"><div className="panel-head"><div><span className="eyebrow">{t('dashboard.next')}</span><h2>{t('dashboard.upcoming')}</h2></div><Link to="/tournaments">{t('dashboard.allMatches')}</Link></div><div className="match-list">{upcoming.map(m=>{const h=getTeam(m.homeTeamId),a=getTeam(m.awayTeamId);return <div className="compact-match" key={m.id}><div><TeamMark team={h} size="sm"/><span>{h?.name}</span></div><div className="kick"><b>{new Date(m.kickoff).toLocaleTimeString(loc,{hour:'2-digit',minute:'2-digit'})}</b><small>{new Date(m.kickoff).toLocaleDateString(loc,{month:'short',day:'numeric'})}</small></div><div><span>{a?.name}</span><TeamMark team={a} size="sm"/></div></div>})}</div></Card>
      <Card className="panel"><div className="panel-head"><div><span className="eyebrow">{t('dashboard.topPool')}</span><h2>{pool?.name||t('dashboard.createFirst')}</h2></div>{pool&&<Link to={`/pools/${pool.id}`}>{t('dashboard.open')}</Link>}</div>{pool?<><div className="rank-highlight"><div><small>{t('dashboard.position')}</small><strong>#{standing.findIndex(x=>x.user.id===currentUser.id)+1}</strong></div><div><small>{t('dashboard.points')}</small><strong>{me?.points||0}</strong></div><Pill tone="green">{pool.code}</Pill></div><div className="leader-mini">{standing.slice(0,4).map((r,i)=><div key={r.user.id}><b>{i+1}</b><span className="mini-avatar">{r.user.avatar}</span><span>{r.user.displayName}</span><strong>{r.points}</strong></div>)}</div></>:<p className="muted">{t('dashboard.empty')}</p>}</Card>
    </div>
    <Card className="panel dashboard-news"><div className="panel-head"><div><span className="eyebrow">{t('dashboard.news')}</span><h2>{t('nav.news')}</h2></div><Link to="/news">{t('dashboard.allNews')}</Link></div><div className="news-list-mini">{latest.map(n=><Link to="/news" key={n.id}><Newspaper/><div><b>{localizedField(n,'title',state.locale)}</b><span>{localizedField(n,'summary',state.locale)}</span></div></Link>)}</div></Card>
  </>
}
