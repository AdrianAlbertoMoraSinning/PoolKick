import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareTournamentRows, statusOf } from '../supabase/functions/sports-sync/mapping.js'

const tournament={id:'cup2026',provider_league_id:'1',provider_season:'2026'}
const event={idEvent:'42',idHomeTeam:'10',idAwayTeam:'20',strHomeTeam:'Home',strAwayTeam:'Away',dateEvent:'2026-11-01',strTime:'19:00',strStatus:'NS',intHomeScore:null,intAwayScore:null}

test('shared clubs keep separate tournament identities and existing match references stay stable',()=>{
  const a=prepareTournamentRows(tournament,[],[event])
  const b=prepareTournamentRows({...tournament,id:'cup2027'},[],[{...event,idEvent:'43'}])
  assert.notEqual(a.teams[0].id,b.teams[0].id)
  assert.equal(a.matches[0].home_team_id,a.teams[0].id)
  assert.equal(a.matches[0].away_team_id,a.teams[1].id)
  const previousTeams=[{id:'tsdb_team_10',external_id:'10',tournament_id:tournament.id,logo_url:'https://example.com/badge.png'}]
  const previousMatches=[{id:'tsdb_event_42',external_id:'42',tournament_id:tournament.id}]
  const repeated=prepareTournamentRows(tournament,[],[event],previousTeams,previousMatches)
  assert.equal(repeated.matches[0].id,'tsdb_event_42')
  assert.equal(repeated.matches[0].home_team_id,'tsdb_team_10')
  assert.equal(repeated.teams[0].logo_url,previousTeams[0].logo_url)
})

test('duplicate league/season fixtures are rejected before any persistence can move them',()=>{
  assert.throws(()=>prepareTournamentRows(tournament,[],[event],[],[{id:'original',external_id:'42',tournament_id:'otherCup'}]),/already belong to another tournament/)
})

test('provider statuses and missing scores never manufacture a finished zero-zero result',()=>{
  assert.equal(statusOf({...event,intHomeScore:'0',intAwayScore:'0'}),'scheduled')
  assert.equal(statusOf({...event,strStatus:'Match Finished',intHomeScore:'2',intAwayScore:'1'}),'finished')
  assert.equal(statusOf({...event,strStatus:'HT',intHomeScore:'1',intAwayScore:'0'}),'live')
  assert.equal(statusOf({...event,strStatus:'Postponed'}),'postponed')
  assert.equal(statusOf({...event,strStatus:'',intHomeScore:'',intAwayScore:''}),'scheduled')
  const row=prepareTournamentRows(tournament,[],[{...event,intHomeScore:'',intAwayScore:''}]).matches[0]
  assert.equal(row.home_score,null)
  assert.equal(row.minute,null)
  assert.equal(row.kickoff,'2026-11-01T19:00:00.000Z')
  assert.throws(()=>prepareTournamentRows(tournament,[],[{...event,dateEvent:null}]),/no kickoff date/)
  assert.throws(()=>prepareTournamentRows(tournament,[],[{...event,intHomeScore:'invalid'}]),/invalid score/)
})
