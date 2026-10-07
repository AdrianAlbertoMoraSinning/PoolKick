export function statusOf(e) {
  const raw=String(e?.strStatus||e?.strProgress||'').toLowerCase()
  if(raw.includes('postpon'))return 'postponed'
  if(raw.includes('cancel'))return 'cancelled'
  if(raw.includes('live')||raw.includes('half')||['ht','1h','2h'].includes(raw)||(/^\d{1,3}'?$/.test(raw)&&raw!=='0'))return 'live'
  if(raw.includes('not started')||['ns','scheduled'].includes(raw))return 'scheduled'
  return scoreOf(e.intHomeScore)!==null&&scoreOf(e.intAwayScore)!==null?'finished':'scheduled'
}
function scoreOf(value){
  if(value===null||value===undefined||value==='')return null
  const number=Number(value)
  if(!Number.isSafeInteger(number)||number<0)throw new Error('Provider returned an invalid score')
  return number
}
function kickoffOf(e){
  if(e.strTimestamp){const d=new Date(e.strTimestamp);if(!Number.isNaN(d.valueOf()))return d.toISOString()}
  if(!e.dateEvent)throw new Error('Provider event has no kickoff date')
  let time=e.strTime||'00:00:00'
  if(/^\d\d:\d\d$/.test(time))time+=':00'
  const date=new Date(`${e.dateEvent}T${time}Z`)
  if(Number.isNaN(date.valueOf()))throw new Error('Provider event has an invalid kickoff date')
  return date.toISOString()
}

export function prepareTournamentRows(tournament, providerTeams, events, existingTeams=[], existingMatches=[]) {
  const eventIds=new Set(events.map(e=>String(e.idEvent)))
  if(existingMatches.some(m=>eventIds.has(String(m.external_id))&&m.tournament_id!==tournament.id)) {
    throw new Error('These provider fixtures already belong to another tournament. Check the league and season before syncing.')
  }
  const previousTeams=new Map(existingTeams.filter(t=>t.tournament_id===tournament.id).map(t=>[String(t.external_id),t]))
  const previousMatches=new Map(existingMatches.filter(m=>m.tournament_id===tournament.id).map(m=>[String(m.external_id),m]))
  const teams=new Map()
  const teamRow=(id,name,badge)=>{
    const ext=String(id||name||'')
    if(!ext)throw new Error('Provider event has no team identifier')
    const old=previousTeams.get(ext)
    const clean=String(name||old?.name||'TBD').trim()
    const row={id:old?.id||`tsdb_team_${tournament.id}_${ext}`,tournament_id:tournament.id,name:clean,code:clean.replace(/[^A-Za-z0-9]/g,'').slice(0,4).toUpperCase()||'TEAM',flag:old?.flag||'⚽',badge:clean.slice(0,3).toUpperCase(),logo_url:badge||old?.logo_url||null,external_id:ext}
    if(!teams.has(ext))teams.set(ext,row)
    else if(!teams.get(ext).logo_url&&row.logo_url)teams.get(ext).logo_url=row.logo_url
    return teams.get(ext)
  }
  for(const t of providerTeams)teamRow(t.idTeam,t.strTeam,t.strBadge||t.strLogo)
  const matches=events.map(e=>{
    const home=teamRow(e.idHomeTeam,e.strHomeTeam,e.strHomeTeamBadge)
    const away=teamRow(e.idAwayTeam,e.strAwayTeam,e.strAwayTeamBadge)
    const progress=e.intProgress==null||e.intProgress===''?null:Number(e.intProgress)
    return {id:previousMatches.get(String(e.idEvent))?.id||`tsdb_event_${tournament.id}_${e.idEvent}`,tournament_id:tournament.id,stage:e.strGroup||e.strSeason||'Tournament',round:e.intRound?`Round ${e.intRound}`:(e.strStatus||'Match'),home_team_id:home.id,away_team_id:away.id,kickoff:kickoffOf(e),status:statusOf(e),home_score:scoreOf(e.intHomeScore),away_score:scoreOf(e.intAwayScore),external_id:String(e.idEvent),venue:e.strVenue||null,minute:Number.isFinite(progress)?progress:null,provider_payload:{provider:'thesportsdb',league_id:String(tournament.provider_league_id),season:String(tournament.provider_season||tournament.edition||''),status:e.strStatus||null}}
  })
  return {teams:[...teams.values()],matches}
}
