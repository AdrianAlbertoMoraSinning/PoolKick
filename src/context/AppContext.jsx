import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react'
import { seedState } from '../data/seed'
import { recalculatePredictions, rankingsForState } from '../lib/scoring'
import { hasSupabase, supabase } from '../lib/supabase'
import { translate } from '../i18n'
import { predictionOpen, validScores, qaCopy, syncSummary } from '../lib/qa'
import { completePasswordSignIn, subscribeToSession } from '../lib/auth'

const KEY = 'poolkick_state_v3'
const Ctx = createContext(null)
const clone = (x) => JSON.parse(JSON.stringify(x))
const uid = (p='id') => `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`

const mapTournament=x=>({...x,shortName:x.short_name,logoUrl:x.logo_url,providerLeagueId:x.provider_league_id,providerSeason:x.provider_season,lastSyncedAt:x.last_synced_at})
const mapTeam=x=>({...x,tournamentId:x.tournament_id,logoUrl:x.logo_url,externalId:x.external_id})
const mapMatch=x=>({...x,tournamentId:x.tournament_id,homeTeamId:x.home_team_id,awayTeamId:x.away_team_id,homeScore:x.home_score,awayScore:x.away_score,externalId:x.external_id})
const mapNews=x=>({...x,publishedAt:x.published_at,sourceName:x.source_name,sourceUrl:x.source_url,imageUrl:x.image_url})

function blankPrivateState(base){
  return {...base,tournaments:[],teams:[],matches:[],news:[],sessionUserId:null,users:[],pools:[],predictions:[],comments:[],notifications:[]}
}

export function AppProvider({ children }) {
  const [state, setState] = useState(() => {
    const savedLocale = localStorage.getItem('poolkick_locale')
    const locale = ['en','es','fr'].includes(savedLocale)?savedLocale:'en'
    if (hasSupabase) return blankPrivateState({...clone(seedState),locale})
    const saved = localStorage.getItem(KEY)
    try { const parsed=saved&&JSON.parse(saved); if(parsed&&Array.isArray(parsed.users)) return {...parsed,locale} } catch {}
    return {...clone(seedState),locale}
  })
  const [loading, setLoading] = useState(hasSupabase)
  const [mode] = useState(hasSupabase ? 'supabase' : 'demo')
  const [connectionError,setConnectionError]=useState('')
  const loadGeneration=useRef(0)
  const explicitAuth=useRef(false)
  const loadedUser=useRef(null)

  useEffect(() => { if (mode === 'demo') localStorage.setItem(KEY, JSON.stringify(state)) }, [state, mode])

  async function select(table, optional=false){
    const {data,error}=await supabase.from(table).select('*')
    if(error){
      if(optional && (error.code==='42P01' || /does not exist/i.test(error.message||''))) return []
      throw error
    }
    return data || []
  }

  async function loadPublicSports(){
    const [tournaments,teams,matches,news]=await Promise.all([select('tournaments'),select('teams'),select('matches'),select('news_articles',true)])
    return {tournaments:tournaments.map(mapTournament),teams:teams.map(mapTeam),matches:matches.map(mapMatch),news:news.map(mapNews)}
  }

  async function refreshSportsData(){
    if(mode!=='supabase') return
    const sports=await loadPublicSports()
    setState(s=>({...s,...sports}))
  }

  async function boot({session:providedSession,throwOnError=false}={}) {
    if (!hasSupabase) return
    const generation=++loadGeneration.current
    setConnectionError('')
    try {
      let session=providedSession
      if(session===undefined){
        const {data,error}=await supabase.auth.getSession()
        if(error)throw error
        session=data.session
      }
      const sports=await loadPublicSports()
      if (!session) {
        if(generation!==loadGeneration.current)return
        loadedUser.current=null
        setState(prev=>({...blankPrivateState(prev),...sports}))
        return
      }
      const [profiles,poolsRows,poolMembers,predictions,comments,notifications] = await Promise.all([
        select('profiles'),select('pools'),select('pool_members'),select('predictions'),select('comments'),select('notifications'),
      ])
      const pools = poolsRows.map(p => ({...p,commissionerId:p.commissioner_id,tournamentId:p.tournament_id,createdAt:p.created_at,members:poolMembers.filter(pm=>pm.pool_id===p.id).map(pm=>pm.user_id)}))
      if(!profiles.some(p=>p.id===session.user.id)) throw new Error('Account profile is unavailable.')
      if(generation!==loadGeneration.current)return
      loadedUser.current=session.user.id
      setState({
        ...sports,
        sessionUserId:session.user.id,
        locale:localStorage.getItem('poolkick_locale') || 'en',
        users:profiles.map(x=>({...x,email:x.id===session.user.id?session.user.email:'',displayName:x.display_name,countryFlag:x.country_flag,favoriteTeam:x.favorite_team,createdAt:x.created_at})),
        pools,
        predictions:predictions.map(x=>({...x,poolId:x.pool_id,matchId:x.match_id,userId:x.user_id,homeScore:x.home_score,awayScore:x.away_score})),
        comments:comments.map(x=>({...x,poolId:x.pool_id,userId:x.user_id,createdAt:x.created_at})),
        notifications:notifications.map(x=>({...x,userId:x.user_id,createdAt:x.created_at})),
      })
    } catch (e) {
      if(generation===loadGeneration.current)setConnectionError(e?.message || 'Unable to connect to the database.')
      if(throwOnError)throw e
    } finally { if(generation===loadGeneration.current)setLoading(false) }
  }

  useEffect(()=>{
    if(!hasSupabase)return
    const unsubscribe=subscribeToSession(supabase.auth,{
      signedOut:()=>{
        ++loadGeneration.current
        loadedUser.current=null
        setConnectionError('')
        setLoading(false)
        setState(s=>({...blankPrivateState(s),tournaments:s.tournaments,teams:s.teams,matches:s.matches,news:s.news.filter(n=>n.status==='published')}))
      },
      changed:session=>{
        if(explicitAuth.current||loadedUser.current===session.user.id)return
        setLoading(true)
        void boot({session})
      }
    })
    void boot()
    return ()=>{unsubscribe();++loadGeneration.current}
  },[])
  useEffect(()=>{document.documentElement.lang=state.locale||'en'},[state.locale])

  useEffect(() => {
    if(mode!=='supabase' || !state.sessionUserId) return
    const channel=supabase.channel(`poolkick-live-${state.sessionUserId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'comments'},payload=>{
        const x=payload.new
        setState(s=>s.comments.some(c=>String(c.id)===String(x.id))?s:{...s,comments:[...s.comments,{...x,poolId:x.pool_id,userId:x.user_id,createdAt:x.created_at}]})
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'predictions'},payload=>{
        if(payload.eventType==='DELETE') return setState(s=>({...s,predictions:s.predictions.filter(p=>String(p.id)!==String(payload.old.id))}))
        const x=payload.new;if(!x?.id)return
        const mapped={...x,poolId:x.pool_id,matchId:x.match_id,userId:x.user_id,homeScore:x.home_score,awayScore:x.away_score}
        setState(s=>({...s,predictions:[...s.predictions.filter(p=>String(p.id)!==String(x.id)),mapped]}))
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'matches'},payload=>{
        if(payload.eventType==='DELETE') return setState(s=>({...s,matches:s.matches.filter(m=>m.id!==payload.old.id)}))
        const mapped=mapMatch(payload.new)
        setState(s=>({...s,matches:[...s.matches.filter(m=>m.id!==mapped.id),mapped].sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff))}))
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'teams'},payload=>{
        if(payload.eventType==='DELETE') return setState(s=>({...s,teams:s.teams.filter(t=>t.id!==payload.old.id)}))
        const mapped=mapTeam(payload.new)
        setState(s=>({...s,teams:[...s.teams.filter(t=>t.id!==mapped.id),mapped]}))
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'tournaments'},payload=>{
        if(payload.eventType==='DELETE') return setState(s=>({...s,tournaments:s.tournaments.filter(t=>t.id!==payload.old.id)}))
        const mapped=mapTournament(payload.new)
        setState(s=>({...s,tournaments:[...s.tournaments.filter(t=>t.id!==mapped.id),mapped]}))
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'news_articles'},payload=>{
        if(payload.eventType==='DELETE') return setState(s=>({...s,news:s.news.filter(n=>n.id!==payload.old.id)}))
        const mapped=mapNews(payload.new);if(!mapped?.id)return
        setState(s=>({...s,news:[mapped,...s.news.filter(n=>n.id!==mapped.id)]}))
      }).subscribe()
    return ()=>{supabase.removeChannel(channel)}
  },[mode,state.sessionUserId])

  const mutate = (fn) => setState(prev => recalculatePredictions(fn(clone(prev))))
  const currentUser = state.users.find(u => u.id === state.sessionUserId) || null
  const t = (key,vars={}) => translate(state.locale || 'en',key,vars)

  async function login(email, password='') {
    if (mode === 'supabase') {
      explicitAuth.current=true
      try {
        await completePasswordSignIn(supabase.auth,{email:email.trim(),password},session=>boot({session,throwOnError:true}))
      } finally {explicitAuth.current=false}
      return
    }
    let user=state.users.find(u=>u.email.toLowerCase()===email.toLowerCase())
    if(!user){user={id:uid('u'),email,displayName:email.split('@')[0],country:'',countryFlag:'🌎',avatar:'⚽',favoriteTeam:'',role:'player',createdAt:new Date().toISOString()};mutate(s=>{s.users.push(user);s.sessionUserId=user.id;return s})}
    else mutate(s=>{s.sessionUserId=user.id;return s})
  }

  async function signup({email,password,displayName}) {
    if(mode==='supabase'){
      explicitAuth.current=true
      try {
        const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{display_name:displayName}}})
        if(error)throw error
        if(data.session)await boot({session:data.session,throwOnError:true})
        return {needsConfirmation:!data.session}
      }finally{explicitAuth.current=false}
    }
    const user={id:uid('u'),email,displayName,country:'',countryFlag:'🌎',avatar:'⚽',favoriteTeam:'',role:'player',createdAt:new Date().toISOString()}
    mutate(s=>{s.users.push(user);s.sessionUserId=user.id;return s});return {needsConfirmation:false}
  }

  async function logout(){if(mode==='supabase'){const {error}=await supabase.auth.signOut();if(error)throw error;setState(s=>blankPrivateState(s));await refreshSportsData()}else setState(s=>({...s,sessionUserId:null}))}
  function setLocale(locale){localStorage.setItem('poolkick_locale',locale);document.documentElement.lang=locale;setState(s=>({...s,locale}))}

  async function updateProfile(patch){
    const clean={...patch,displayName:patch.displayName?.trim()}
    if(!clean.displayName) throw new Error(qaCopy(state.locale).failed)
    if(mode==='supabase'&&currentUser){
      const {data,error}=await supabase.from('profiles').update({display_name:clean.displayName,avatar:clean.avatar,country:clean.country,country_flag:clean.countryFlag,favorite_team:clean.favoriteTeam}).eq('id',currentUser.id).select('id').single()
      if(error)throw error
      if(!data)throw new Error(qaCopy(state.locale).failed)
    }
    mutate(s=>{const u=s.users.find(x=>x.id===s.sessionUserId);if(u)Object.assign(u,clean);return s})
  }

  async function createPool({tournamentId,name,scoring='classic',visibility='private'}){
    if(mode==='supabase'){
      const {data,error}=await supabase.rpc('create_pool_with_member',{p_tournament_id:tournamentId,p_name:name,p_scoring:scoring,p_visibility:visibility})
      if(error) throw error
      const pool={id:data.id,tournamentId:data.tournament_id,name:data.name,code:data.code,commissionerId:data.commissioner_id,visibility:data.visibility,scoring:data.scoring,createdAt:new Date().toISOString(),members:[state.sessionUserId]}
      setState(s=>({...s,pools:[pool,...s.pools.filter(p=>p.id!==pool.id)]}))
      return pool
    }
    const pool={id:uid('p'),tournamentId,name,code:Math.random().toString(36).slice(2,8).toUpperCase(),commissionerId:state.sessionUserId,visibility,scoring,createdAt:new Date().toISOString(),members:[state.sessionUserId]}
    mutate(s=>{s.pools.push(pool);return s});return pool
  }

  async function joinPool(code){
    if(mode==='supabase'){
      const {data,error}=await supabase.rpc('join_pool_by_code',{join_code:code.trim().toUpperCase()});if(error)throw error;if(!data)return null
      await boot();return {id:data}
    }
    let joined=null;mutate(s=>{const p=s.pools.find(x=>x.code.toUpperCase()===code.trim().toUpperCase());if(p&&!p.members.includes(s.sessionUserId)){p.members.push(s.sessionUserId);joined=p}else if(p)joined=p;return s});return joined
  }

  async function savePrediction(poolId,matchId,homeScore,awayScore){
    if(!validScores(homeScore,awayScore))throw new Error(qaCopy(state.locale).invalid)
    const match=state.matches.find(m=>m.id===matchId);if(!predictionOpen(match))throw new Error(qaCopy(state.locale).locked)
    if(mode==='supabase'){
      const {data,error}=await supabase.from('predictions').upsert({pool_id:poolId,match_id:matchId,user_id:state.sessionUserId,home_score:Number(homeScore),away_score:Number(awayScore)},{onConflict:'pool_id,match_id,user_id'}).select().single();if(error)throw error
      const mapped={...data,poolId:data.pool_id,matchId:data.match_id,userId:data.user_id,homeScore:data.home_score,awayScore:data.away_score}
      setState(s=>({...s,predictions:[...s.predictions.filter(p=>String(p.id)!==String(data.id)),mapped]}))
      return true
    }
    mutate(s=>{const rec=s.predictions.find(p=>p.poolId===poolId&&p.matchId===matchId&&p.userId===s.sessionUserId);if(rec){rec.homeScore=Number(homeScore);rec.awayScore=Number(awayScore)}else s.predictions.push({id:uid('pr'),poolId,matchId,userId:s.sessionUserId,homeScore:Number(homeScore),awayScore:Number(awayScore),points:null});return s});return true
  }

  async function addComment(poolId,text){
    if(!text.trim())return
    if(mode==='supabase'){const {data,error}=await supabase.from('comments').insert({pool_id:poolId,user_id:state.sessionUserId,text:text.trim()}).select().single();if(error)throw error;const mapped={...data,poolId:data.pool_id,userId:data.user_id,createdAt:data.created_at};setState(s=>({...s,comments:[...s.comments.filter(c=>String(c.id)!==String(data.id)),mapped]}));return}
    const c={id:uid('c'),poolId,userId:state.sessionUserId,text:text.trim(),createdAt:new Date().toISOString()};mutate(s=>{s.comments.push(c);return s})
  }

  async function syncTournament(id){
    if(mode!=='supabase') return {ok:true,demo:true}
    const {data,error}=await supabase.functions.invoke('sports-sync',{body:{action:'sync_tournament',tournamentId:id}})
    if(error) throw error
    if(data?.error) throw new Error(data.error)
    await refreshSportsData();syncSummary(data,state.locale);return data
  }

  async function syncAllSports(){
    if(mode!=='supabase') return {ok:true,demo:true}
    const {data,error}=await supabase.functions.invoke('sports-sync',{body:{action:'sync_all'}})
    if(error) throw error
    if(data?.error) throw new Error(data.error)
    await refreshSportsData();syncSummary(data,state.locale);return data
  }

  async function addTournament({name,shortName,edition,providerLeagueId,providerSeason,status='active',icon='🏆',accent='#0f8069'}){
    const id=`t_${Date.now()}`
    if(mode==='supabase'){
      const slug=`${name}-${edition}`.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
      const {data,error}=await supabase.from('tournaments').insert({id,slug,name,short_name:shortName||name.slice(0,8),edition,icon,accent,status,format:'Synced from sports provider',description:'Fixtures, teams and results sync automatically.',provider:'thesportsdb',provider_league_id:String(providerLeagueId),provider_season:String(providerSeason),sync_enabled:true}).select().single()
      if(error) throw error
      setState(s=>({...s,tournaments:[...s.tournaments,mapTournament(data)]}))
      let warning='';try{await syncTournament(id)}catch(e){warning=e.message}
      return {...mapTournament(data),syncWarning:warning}
    }
    const tournament={id,slug:id,name,shortName:shortName||name,edition,icon,accent,status,format:'Synced',description:'',providerLeagueId,providerSeason};mutate(s=>{s.tournaments.push(tournament);return s});return tournament
  }

  async function toggleTournament(id){
    const row=state.tournaments.find(x=>x.id===id);if(!row)return
    const next=row.status==='active'?'coming':'active'
    if(mode==='supabase'){
      const {error}=await supabase.from('tournaments').update({status:next}).eq('id',id).select('id').single();if(error)throw error
      setState(s=>({...s,tournaments:s.tournaments.map(x=>x.id===id?{...x,status:next}:x)}))
      if(next==='active'&&row.providerLeagueId) await syncTournament(id)
    }else mutate(s=>{const x=s.tournaments.find(x=>x.id===id);x.status=next;return s})
  }

  async function setMatchResult(matchId,homeScore,awayScore){
    if(!validScores(homeScore,awayScore))throw new Error(qaCopy(state.locale).invalid)
    if(mode==='supabase'){
      const {data,error}=await supabase.from('matches').update({home_score:Number(homeScore),away_score:Number(awayScore),status:'finished'}).eq('id',matchId).select().single();if(error)throw error
      setState(s=>({...s,matches:s.matches.map(m=>m.id===matchId?mapMatch(data):m)}));await boot();return
    }
    mutate(s=>{const m=s.matches.find(x=>x.id===matchId);m.homeScore=Number(homeScore);m.awayScore=Number(awayScore);m.status='finished';return s})
  }

  async function markNotificationsRead(){
    if(mode==='supabase'&&state.sessionUserId){const {error}=await supabase.from('notifications').update({read:true}).eq('user_id',state.sessionUserId);if(error)throw error}
    mutate(s=>{s.notifications.filter(n=>n.userId===s.sessionUserId).forEach(n=>n.read=true);return s})
  }

  async function getRankings(tournamentId=null){
    if(mode==='demo') return rankingsForState(state,tournamentId)
    const fn=tournamentId?'get_tournament_rankings':'get_global_rankings'
    const args=tournamentId?{p_tournament_id:tournamentId}:{}
    const {data,error}=await supabase.rpc(fn,args);if(error)throw error;return data||[]
  }

  async function publishNews(article){
    const record={...article,id:article.id||uid('news'),publishedAt:article.publishedAt||new Date().toISOString()}
    if(mode==='demo'){mutate(s=>{const i=s.news.findIndex(n=>n.id===record.id);if(i>=0)s.news[i]=record;else s.news.unshift(record);return s});return record}
    const payload={id:record.id,category:record.category||'platform',title_en:record.title_en||'',title_es:record.title_es||'',title_fr:record.title_fr||'',summary_en:record.summary_en||'',summary_es:record.summary_es||'',summary_fr:record.summary_fr||'',source_name:record.sourceName||'',source_url:record.sourceUrl||null,image_url:record.imageUrl||null,featured:Boolean(record.featured),status:record.status||'published',published_at:record.publishedAt}
    const {data,error}=await supabase.from('news_articles').upsert(payload).select().single();if(error)throw error;const saved=mapNews(data);setState(s=>({...s,news:[saved,...s.news.filter(n=>n.id!==saved.id)]}));return saved
  }

  async function deleteNews(id){
    if(mode==='demo'){mutate(s=>{s.news=s.news.map(n=>n.id===id?{...n,status:'draft'}:n);return s});return}
    const {data,error}=await supabase.from('news_articles').update({status:'draft'}).eq('id',id).select().single();if(error)throw error
    setState(s=>({...s,news:s.news.map(n=>n.id===id?mapNews(data):n)}))
  }

  function resetDemo(){if(mode!=='demo')return;localStorage.removeItem(KEY);setState({...clone(seedState),locale:localStorage.getItem('poolkick_locale')||'en'})}

  const value=useMemo(()=>({state,setState,currentUser,loading,mode,connectionError,t,login,signup,logout,setLocale,updateProfile,createPool,joinPool,savePrediction,addComment,toggleTournament,setMatchResult,markNotificationsRead,publishNews,deleteNews,resetDemo,refreshSportsData,syncTournament,syncAllSports,addTournament,getRankings}),[state,currentUser,loading,mode,connectionError])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useApp=()=>useContext(Ctx)
