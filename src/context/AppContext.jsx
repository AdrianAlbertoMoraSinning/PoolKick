import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { seedState } from '../data/seed'
import { recalculatePredictions } from '../lib/scoring'
import { hasSupabase, supabase } from '../lib/supabase'

const KEY = 'poolkick_state_v1'
const Ctx = createContext(null)
const clone = (x) => JSON.parse(JSON.stringify(x))
const uid = (p='id') => `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`

const dbMap = {
  users: 'profiles', tournaments: 'tournaments', teams: 'teams', matches: 'matches', pools: 'pools', predictions: 'predictions', comments: 'comments', notifications: 'notifications'
}

export function AppProvider({ children }) {
  const [state, setState] = useState(() => {
    if (hasSupabase) return {...clone(seedState), sessionUserId: null, users: []}
    const saved = localStorage.getItem(KEY)
    return saved ? JSON.parse(saved) : clone(seedState)
  })
  const [loading, setLoading] = useState(hasSupabase)
  const [mode, setMode] = useState(hasSupabase ? 'supabase' : 'demo')

  useEffect(() => { if (mode === 'demo') localStorage.setItem(KEY, JSON.stringify(state)) }, [state, mode])

  useEffect(() => {
    if (!hasSupabase) return
    let active = true
    async function boot() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { if (active) setLoading(false); return }
        const tables = ['profiles','tournaments','teams','matches','pools','pool_members','predictions','comments','notifications']
        const rows = {}
        for (const table of tables) {
          const { data, error } = await supabase.from(table).select('*')
          if (error) throw error
          rows[table] = data || []
        }
        const pools = rows.pools.map(p => ({...p, commissionerId:p.commissioner_id, tournamentId:p.tournament_id, createdAt:p.created_at, members:rows.pool_members.filter(pm=>pm.pool_id===p.id).map(pm=>pm.user_id)}))
        const mapped = {
          sessionUserId: session?.user?.id || null,
          locale: localStorage.getItem('poolkick_locale') || 'en',
          users: rows.profiles.map(x=>({...x, email:x.id===session.user.id?session.user.email:'', displayName:x.display_name, countryFlag:x.country_flag, favoriteTeam:x.favorite_team, createdAt:x.created_at})),
          tournaments: rows.tournaments.map(x=>({...x, shortName:x.short_name})),
          teams: rows.teams.map(x=>({...x, tournamentId:x.tournament_id})),
          matches: rows.matches.map(x=>({...x, tournamentId:x.tournament_id, homeTeamId:x.home_team_id, awayTeamId:x.away_team_id, homeScore:x.home_score, awayScore:x.away_score})),
          pools,
          predictions: rows.predictions.map(x=>({...x,poolId:x.pool_id,matchId:x.match_id,userId:x.user_id,homeScore:x.home_score,awayScore:x.away_score})),
          comments: rows.comments.map(x=>({...x,poolId:x.pool_id,userId:x.user_id,createdAt:x.created_at})),
          notifications: rows.notifications.map(x=>({...x,userId:x.user_id,createdAt:x.created_at})),
        }
        if (active) setState(mapped)
      } catch (e) {
        console.warn('Supabase unavailable, using Demo Mode.', e)
        if (active) { setMode('demo'); setState(clone(seedState)) }
      } finally { if (active) setLoading(false) }
    }
    boot()
    return () => { active = false }
  }, [])

  const mutate = (fn) => setState(prev => recalculatePredictions(fn(clone(prev))))
  const currentUser = state.users.find(u => u.id === state.sessionUserId) || null

  async function login(email, password='') {
    if (mode === 'supabase') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      mutate(s=>{s.sessionUserId=data.user.id;return s})
      window.location.reload()
      return
    }
    let user = state.users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      user = {id:uid('u'), email, displayName:email.split('@')[0], country:'', countryFlag:'🌎', avatar:'⚽', favoriteTeam:'', role:'player', createdAt:new Date().toISOString()}
      mutate(s=>{s.users.push(user);s.sessionUserId=user.id;return s})
    } else mutate(s=>{s.sessionUserId=user.id;return s})
  }
  async function signup({email,password,displayName}) {
    if (mode === 'supabase') {
      const { data, error } = await supabase.auth.signUp({ email, password, options:{data:{display_name:displayName}} })
      if (error) throw error
      if (data.session) window.location.reload()
      return
    }
    const user={id:uid('u'),email,displayName,country:'',countryFlag:'🌎',avatar:'⚽',favoriteTeam:'',role:'player',createdAt:new Date().toISOString()}
    mutate(s=>{s.users.push(user);s.sessionUserId=user.id;return s})
  }
  async function logout(){ if(mode==='supabase') await supabase.auth.signOut(); mutate(s=>{s.sessionUserId=null;return s}) }
  function setLocale(locale){ localStorage.setItem('poolkick_locale', locale); mutate(s=>{s.locale=locale;return s}) }
  function updateProfile(patch){ mutate(s=>{const u=s.users.find(x=>x.id===s.sessionUserId);Object.assign(u,patch);return s}); if(mode==='supabase'&&currentUser) supabase.from('profiles').update({display_name:patch.displayName,avatar:patch.avatar,country:patch.country,country_flag:patch.countryFlag,favorite_team:patch.favoriteTeam}).eq('id',currentUser.id) }
  function createPool({tournamentId,name,scoring='classic',visibility='private'}){
    const pool={id:uid('p'),tournamentId,name,code:Math.random().toString(36).slice(2,8).toUpperCase(),commissionerId:state.sessionUserId,visibility,scoring,createdAt:new Date().toISOString(),members:[state.sessionUserId]}
    mutate(s=>{s.pools.push(pool);return s})
    if(mode==='supabase') supabase.from('pools').insert({id:pool.id,tournament_id:tournamentId,name,code:pool.code,commissioner_id:pool.commissionerId,visibility,scoring}).then(({error})=>{if(!error) supabase.from('pool_members').insert({pool_id:pool.id,user_id:pool.commissionerId})})
    return pool
  }
  async function joinPool(code){
    if(mode==='supabase'){
      const {data,error}=await supabase.rpc('join_pool_by_code',{join_code:code.trim().toUpperCase()})
      if(error) throw error
      if(!data) return null
      window.location.href=`/pools/${data}`
      return {id:data}
    }
    let joined=null
    mutate(s=>{const p=s.pools.find(x=>x.code.toUpperCase()===code.trim().toUpperCase());if(p&&!p.members.includes(s.sessionUserId)){p.members.push(s.sessionUserId);joined=p} else if(p) joined=p;return s})
    return joined
  }
  function savePrediction(poolId,matchId,homeScore,awayScore){
    const match=state.matches.find(m=>m.id===matchId); if(!match||new Date(match.kickoff)<=new Date()) return false
    let rec
    mutate(s=>{rec=s.predictions.find(p=>p.poolId===poolId&&p.matchId===matchId&&p.userId===s.sessionUserId);if(rec){rec.homeScore=Number(homeScore);rec.awayScore=Number(awayScore)}else{s.predictions.push({id:uid('pr'),poolId,matchId,userId:s.sessionUserId,homeScore:Number(homeScore),awayScore:Number(awayScore),points:null})}return s})
    if(mode==='supabase') supabase.from('predictions').upsert({pool_id:poolId,match_id:matchId,user_id:state.sessionUserId,home_score:Number(homeScore),away_score:Number(awayScore)},{onConflict:'pool_id,match_id,user_id'})
    return true
  }
  function addComment(poolId,text){ if(!text.trim())return;const c={id:uid('c'),poolId,userId:state.sessionUserId,text:text.trim(),createdAt:new Date().toISOString()};mutate(s=>{s.comments.push(c);return s}); if(mode==='supabase') supabase.from('comments').insert({pool_id:poolId,user_id:state.sessionUserId,text:c.text}) }
  function toggleTournament(id){ mutate(s=>{const t=s.tournaments.find(x=>x.id===id);t.status=t.status==='active'?'coming':'active';return s}); const t=state.tournaments.find(x=>x.id===id); if(mode==='supabase') supabase.from('tournaments').update({status:t.status==='active'?'coming':'active'}).eq('id',id) }
  function setMatchResult(matchId,homeScore,awayScore){ mutate(s=>{const m=s.matches.find(x=>x.id===matchId);m.homeScore=Number(homeScore);m.awayScore=Number(awayScore);m.status='finished';return s}); if(mode==='supabase') supabase.from('matches').update({home_score:Number(homeScore),away_score:Number(awayScore),status:'finished'}).eq('id',matchId).then(()=>supabase.rpc('recalculate_match_points',{target_match_id:matchId})) }
  function markNotificationsRead(){ mutate(s=>{s.notifications.filter(n=>n.userId===s.sessionUserId).forEach(n=>n.read=true);return s}); if(mode==='supabase'&&state.sessionUserId) supabase.from('notifications').update({read:true}).eq('user_id',state.sessionUserId) }
  function resetDemo(){ localStorage.removeItem(KEY); setState(clone(seedState)); setMode(hasSupabase?'supabase':'demo') }

  const value=useMemo(()=>({state,setState,currentUser,loading,mode,login,signup,logout,setLocale,updateProfile,createPool,joinPool,savePrediction,addComment,toggleTournament,setMatchResult,markNotificationsRead,resetDemo}),[state,currentUser,loading,mode])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useApp=()=>useContext(Ctx)
