import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, CheckCircle2, Trophy, UsersRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card, Pill, Stat, TeamMark } from '../components/UI'
import { standingsForPool } from '../lib/scoring'

export default function Dashboard(){
  const {state,currentUser}=useApp(); const pools=state.pools.filter(p=>p.members.includes(currentUser.id)); const pool=pools[0]; const standing=pool?standingsForPool(state,pool.id):[]; const me=standing.find(x=>x.user.id===currentUser.id); const upcoming=state.matches.filter(m=>new Date(m.kickoff)>new Date()).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff)).slice(0,4); const getTeam=id=>state.teams.find(t=>t.id===id)
  const pending=pool?upcoming.filter(m=>m.tournamentId===pool.tournamentId&&!state.predictions.some(p=>p.poolId===pool.id&&p.matchId===m.id&&p.userId===currentUser.id)).length:0
  return <><div className="page-head"><div><span className="eyebrow">Good to see you, {currentUser.displayName}</span><h1>Your football command center.</h1><p>Make your picks, follow your pools and see who gets the bragging rights.</p></div><Link className="btn btn-primary" to="/pools">Open my pools <ArrowRight size={17}/></Link></div>
    <div className="stats-grid"><Card><Stat value={pools.length} label="Active pools"/><UsersRound/></Card><Card><Stat value={me?.points||0} label="Total points"/><Trophy/></Card><Card><Stat value={pending} label="Picks to make"/><CalendarDays/></Card><Card><Stat value={me?.exact||0} label="Exact scores"/><CheckCircle2/></Card></div>
    <div className="dash-grid"><Card className="panel"><div className="panel-head"><div><span className="eyebrow">Next up</span><h2>Upcoming matches</h2></div><Link to="/tournaments">All matches</Link></div><div className="match-list">{upcoming.map(m=>{const h=getTeam(m.homeTeamId),a=getTeam(m.awayTeamId);return <div className="compact-match" key={m.id}><div><TeamMark team={h} size="sm"/><span>{h?.name}</span></div><div className="kick"><b>{new Date(m.kickoff).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</b><small>{new Date(m.kickoff).toLocaleDateString([], {month:'short',day:'numeric'})}</small></div><div><span>{a?.name}</span><TeamMark team={a} size="sm"/></div></div>})}</div></Card>
      <Card className="panel"><div className="panel-head"><div><span className="eyebrow">Your top pool</span><h2>{pool?.name||'Create your first pool'}</h2></div>{pool&&<Link to={`/pools/${pool.id}`}>Open</Link>}</div>{pool?<><div className="rank-highlight"><div><small>Your position</small><strong>#{standing.findIndex(x=>x.user.id===currentUser.id)+1}</strong></div><div><small>Your points</small><strong>{me?.points||0}</strong></div><Pill tone="green">{pool.code}</Pill></div><div className="leader-mini">{standing.slice(0,4).map((r,i)=><div key={r.user.id}><b>{i+1}</b><span className="mini-avatar">{r.user.avatar}</span><span>{r.user.displayName}</span><strong>{r.points}</strong></div>)}</div></>:<p className="muted">Create a pool, invite friends and start predicting.</p>}</Card>
    </div>
  </>
}
