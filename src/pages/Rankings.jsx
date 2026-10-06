import React,{useEffect,useMemo,useState} from 'react'
import { Medal, Trophy } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar, Card, Pill, TournamentMark } from '../components/UI'
import { featureCopy } from '../featureCopy'

export default function Rankings(){
 const {state,currentUser,getRankings}=useApp()
 const c=featureCopy(state.locale)
 const [selected,setSelected]=useState('all')
 const [rows,setRows]=useState([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 useEffect(()=>{let alive=true;setLoading(true);setError('');getRankings(selected==='all'?null:selected).then(data=>alive&&setRows(data)).catch(e=>alive&&setError(e.message)).finally(()=>alive&&setLoading(false));return()=>{alive=false}},[selected,state.predictions.length,state.pools.length])
 const podium=rows.slice(0,3)
 const tournaments=useMemo(()=>state.tournaments.filter(t=>t.status==='active'||state.pools.some(p=>p.tournamentId===t.id)),[state.tournaments,state.pools])
 return <><div className="page-head"><div><span className="eyebrow">{c.overall}</span><h1>{c.rankings}</h1><p>{state.locale==='es'?'Compara el desempeño de los jugadores por puntos, aciertos y marcadores exactos.':state.locale==='fr'?'Comparez les joueurs par points, bons pronostics et scores exacts.':'Compare players by points, correct picks and exact scores.'}</p></div><Trophy/></div>
 <div className="rank-filter"><button className={selected==='all'?'active':''} onClick={()=>setSelected('all')}>{c.overall}</button>{tournaments.map(t=><button key={t.id} className={selected===t.id?'active':''} onClick={()=>setSelected(t.id)}><TournamentMark tournament={t} size="sm"/>{t.shortName||t.name}</button>)}</div>
 {error&&<div className="form-error">{error}</div>}
 {loading?<Card className="empty"><p>Loading…</p></Card>:rows.length?<><div className="podium-grid">{podium.map((r,i)=><Card key={r.user_id} className={`podium-card place-${i+1}`}><div className="podium-medal">{i===0?'🥇':i===1?'🥈':'🥉'}</div><Avatar user={{avatar:r.avatar}} size="lg"/><h3>{r.display_name}</h3><strong>{r.total_points} pts</strong><div><span>{c.exact}: {r.exact_scores}</span><span>{c.correct}: {r.correct_predictions}</span></div>{r.user_id===currentUser.id&&<Pill tone="green">You</Pill>}</Card>)}</div><Card className="panel rankings-table"><div className="standings"><div className="stand-row header"><span>#</span><span>{c.player}</span><span>{c.exact}</span><span>{c.correct}</span><span>{c.points}</span></div>{rows.map(r=><div className={`stand-row ${r.user_id===currentUser.id?'me':''}`} key={r.user_id}><b>{r.rank}</b><div className="player-cell"><Avatar user={{avatar:r.avatar}} size="sm"/><span>{r.display_name}</span></div><span>{r.exact_scores}</span><span>{r.correct_predictions}</span><strong>{r.total_points}</strong></div>)}</div></Card></>:<Card className="empty"><Medal/><h3>{c.noRanking}</h3></Card>}
 </>
}
