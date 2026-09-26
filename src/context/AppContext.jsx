import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { seedState } from '../data/seed'
import { recalculatePredictions } from '../lib/scoring'
import { hasSupabase, supabase } from '../lib/supabase'
import { translate } from '../i18n'

const KEY = 'poolkick_state_v2'
const Ctx = createContext(null)
const clone = (x) => JSON.parse(JSON.stringify(x))
const uid = (p='id') => `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`

function blankPrivateState(base){
  return {
    ...base,
    sessionUserId:null,
    users:[],
    pools:[],
    predictions:[],
    comments:[],
    notifications:[],
  }
}

export function AppProvider({ children }) {
  const [state, setState] = useState(() => {
    const locale = localStorage.getItem('poolkick_locale') || 'en'
    if (hasSupabase) return blankPrivateState({...clone(seedState),locale})
    const saved = localStorage.getItem(KEY)
    return saved ? {...JSON.parse(saved),locale} : {...clone(seedState),locale}
  })
  const [loading, setLoading] = useState(hasSupabase)
  const [mode] = useState(hasSupabase ? 'supabase' : 'demo')
  const [connectionError,setConnectionError]=useState('')

  useEffect(() => { if (mode === 'demo') localStorage.setItem(KEY, JSON.stringify(state)) }, [state, mode])

  useEffect(() => {
    if (!hasSupabase) return
    let active = true

    async function select(table, optional=false){
      const {data,error}=await supabase.from(table).select('*')
      if(error){
        if(optional && (error.code==='42P01' || /does not exist/i.test(error.message||''))) return []
        throw error
      }
      return data || []
    }

    async function boot() {
      setConnectionError('')
      try {
        const { data: { session }, error:sessionError } = await supabase.auth.getSession()
        if(sessionError) throw sessionError

        const [tournaments,teams,matches,news] = await Promise.all([
          select('tournaments'),
          select('teams'),
          select('matches'),
          select('news_articles',true),
        ])

        if (!session) {
          if(active) setState(prev=>({
            ...blankPrivateState(prev),
            tournaments:tournaments.map(x=>({...x,shortName:x.short_name})),
            teams:teams.map(x=>({...x,tournamentId:x.tournament_id})),
            matches:matches.map(x=>({...x,tournamentId:x.tournament_id,homeTeamId:x.home_team_id,awayTeamId:x.away_team_id,homeScore:x.home_score,awayScore:x.away_score})),
            news:news.map(x=>({...x,publishedAt:x.published_at,sourceName:x.source_name,sourceUrl:x.source_url,imageUrl:x.image_url})),
          }))
          return
        }

        const [profiles,poolsRows,poolMembers,predictions,comments,notifications] = await Promise.all([
          select('profiles'),
          select('pools'),
          select('pool_members'),
          select('predictions'),
          select('comments'),
          select('notifications'),
        ])

        const pools = poolsRows.map(p => ({...p, commissionerId:p.commissioner_id, tournamentId:p.tournament_id, createdAt:p.created_at, members:poolMembers.filter(pm=>pm.pool_id===p.id).map(pm=>pm.user_id)}))
        const mapped = {
          sessionUserId: session.user.id,
          locale: localStorage.getItem('poolkick_locale') || 'en',
          users: profiles.map(x=>({...x, email:x.id===session.user.id?session.user.email:'', displayName:x.display_name, countryFlag:x.country_flag, favoriteTeam:x.favorite_team, createdAt:x.created_at})),
          tournaments: tournaments.map(x=>({...x, shortName:x.short_name})),
          teams: teams.map(x=>({...x, tournamentId:x.tournament_id})),
          matches: matches.map(x=>({...x, tournamentId:x.tournament_id, homeTeamId:x.home_team_id, awayTeamId:x.away_team_id, homeScore:x.home_score, awayScore:x.away_score})),
          pools,
          predictions: predictions.map(x=>({...x,poolId:x.pool_id,matchId:x.match_id,userId:x.user_id,homeScore:x.home_score,awayScore:x.away_score})),
          comments: comments.map(x=>({...x,poolId:x.pool_id,userId:x.user_id,createdAt:x.created_at})),
          notifications: notifications.map(x=>({...x,userId:x.user_id,createdAt:x.created_at})),
          news: news.map(x=>({...x,publishedAt:x.published_at,sourceName:x.source_name,sourceUrl:x.source_url,imageUrl:x.image_url})),
        }
        if (active) setState(mapped)
      } catch (e) {
        console.error('Supabase connection error.', e)
        if (active) setConnectionError(e?.message || 'Unable to connect to the database.')
      } finally { if (active) setLoading(false) }
    }
    boot()
    return () => { active = false }
  }, [])

  const mutate = (fn) => setState(prev => recalculatePredictions(fn(clone(prev))))
  const currentUser = state.users.find(u => u.id === state.sessionUserId) || null
  const t = (key,vars={}) => translate(state.locale || 'en',key,vars)

  async function login(email, password='') {
    if (mode === 'supabase') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setState(s=>({...s,sessionUserId:data.user.id}))
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
      return {needsConfirmation:!data.session}
    }
    const user={id:uid('u'),email,displayName,country:'',countryFlag:'🌎',avatar:'⚽',favoriteTeam:'',role:'player',createdAt:new Date().toISOString()}
    mutate(s=>{s.users.push(user);s.sessionUserId=user.id;return s})
    return {needsConfirmation:false}
  }

  async function logout(){
    if(mode==='supabase') await supabase.auth.signOut()
    setState(s=>({...s,sessionUserId:null,users:mode==='supabase'?[]:s.users}))
  }

  function setLocale(locale){
    localStorage.setItem('poolkick_locale', locale)
    document.documentElement.lang=locale
    setState(s=>({...s,locale}))
  }

  function updateProfile(patch){
    mutate(s=>{const u=s.users.find(x=>x.id===s.sessionUserId);if(u)Object.assign(u,patch);return s})
    if(mode==='supabase'&&currentUser) supabase.from('profiles').update({display_name:patch.displayName,avatar:patch.avatar,country:patch.country,country_flag:patch.countryFlag,favorite_team:patch.favoriteTeam}).eq('id',currentUser.id)
  }

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

  function addComment(poolId,text){
    if(!text.trim())return
    const c={id:uid('c'),poolId,userId:state.sessionUserId,text:text.trim(),createdAt:new Date().toISOString()}
    mutate(s=>{s.comments.push(c);return s})
    if(mode==='supabase') supabase.from('comments').insert({pool_id:poolId,user_id:state.sessionUserId,text:c.text})
  }

  function toggleTournament(id){
    const t=state.tournaments.find(x=>x.id===id)
    if(!t)return
    const next=t.status==='active'?'coming':'active'
    mutate(s=>{const row=s.tournaments.find(x=>x.id===id);row.status=next;return s})
    if(mode==='supabase') supabase.from('tournaments').update({status:next}).eq('id',id)
  }

  function setMatchResult(matchId,homeScore,awayScore){
    mutate(s=>{const m=s.matches.find(x=>x.id===matchId);m.homeScore=Number(homeScore);m.awayScore=Number(awayScore);m.status='finished';return s})
    if(mode==='supabase') supabase.from('matches').update({home_score:Number(homeScore),away_score:Number(awayScore),status:'finished'}).eq('id',matchId)
  }

  function markNotificationsRead(){
    mutate(s=>{s.notifications.filter(n=>n.userId===s.sessionUserId).forEach(n=>n.read=true);return s})
    if(mode==='supabase'&&state.sessionUserId) supabase.from('notifications').update({read:true}).eq('user_id',state.sessionUserId)
  }

  async function publishNews(article){
    const record={...article,id:article.id||uid('news'),publishedAt:article.publishedAt||new Date().toISOString()}
    if(mode==='demo'){
      mutate(s=>{const i=s.news.findIndex(n=>n.id===record.id);if(i>=0)s.news[i]=record;else s.news.unshift(record);return s})
      return record
    }
    const payload={
      id:record.id,
      category:record.category||'platform',
      title_en:record.title_en||'',
      title_es:record.title_es||'',
      title_fr:record.title_fr||'',
      summary_en:record.summary_en||'',
      summary_es:record.summary_es||'',
      summary_fr:record.summary_fr||'',
      source_name:record.sourceName||'',
      source_url:record.sourceUrl||null,
      image_url:record.imageUrl||null,
      featured:Boolean(record.featured),
      status:record.status||'published',
      published_at:record.publishedAt,
    }
    const {error}=await supabase.from('news_articles').upsert(payload)
    if(error) throw error
    setState(s=>({...s,news:[record,...s.news.filter(n=>n.id!==record.id)]}))
    return record
  }

  async function deleteNews(id){
    if(mode==='demo'){ mutate(s=>{s.news=s.news.filter(n=>n.id!==id);return s}); return }
    const {error}=await supabase.from('news_articles').delete().eq('id',id)
    if(error) throw error
    setState(s=>({...s,news:s.news.filter(n=>n.id!==id)}))
  }

  function resetDemo(){
    if(mode!=='demo')return
    localStorage.removeItem(KEY)
    setState({...clone(seedState),locale:localStorage.getItem('poolkick_locale')||'en'})
  }

  const value=useMemo(()=>({state,setState,currentUser,loading,mode,connectionError,t,login,signup,logout,setLocale,updateProfile,createPool,joinPool,savePrediction,addComment,toggleTournament,setMatchResult,markNotificationsRead,publishNews,deleteNews,resetDemo}),[state,currentUser,loading,mode,connectionError])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useApp=()=>useContext(Ctx)
