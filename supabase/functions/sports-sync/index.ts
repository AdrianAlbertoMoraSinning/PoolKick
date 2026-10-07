import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { prepareTournamentRows } from "./mapping.js";

const TSDB_KEY = Deno.env.get("THESPORTSDB_API_KEY") || "123";
const TSDB = `https://www.thesportsdb.com/api/v1/json/${TSDB_KEY}`;
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json = (data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"content-type":"application/json"}});

async function tsdb(path:string){const r=await fetch(`${TSDB}/${path}`,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`TheSportsDB ${r.status}: ${path}`);return await r.json()}
function mergeEvents(...groups:any[][]){const map=new Map<string,any>();for(const group of groups)for(const e of group||[])if(e?.idEvent)map.set(String(e.idEvent),e);return [...map.values()]}
function ymd(offset=0){const d=new Date();d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)}

async function syncTournament(db:any,tournament:any){
  if(!tournament?.provider_league_id)return{id:tournament?.id,skipped:true,reason:'No provider league ID'};
  const leagueId=String(tournament.provider_league_id),season=String(tournament.provider_season||tournament.edition||'');
  const leagueData=await tsdb(`lookupleague.php?id=${encodeURIComponent(leagueId)}`);const league=leagueData?.leagues?.[0]||null;if(!league)throw new Error('Provider league was not found');
  let teams:any[]=[];try{let td=await tsdb(`search_all_teams.php?l=${encodeURIComponent(leagueId)}`);teams=td?.teams||[];if(!teams.length&&league?.strLeague){td=await tsdb(`search_all_teams.php?l=${encodeURIComponent(league.strLeague)}`);teams=td?.teams||[]}}catch(_e){}
  let seasonEvents:any[]=[],next:any[]=[],past:any[]=[],day0:any[]=[],day1:any[]=[],day2:any[]=[];
  try{seasonEvents=(await tsdb(`eventsseason.php?id=${encodeURIComponent(leagueId)}&s=${encodeURIComponent(season)}`))?.events||[]}catch(_e){}
  try{next=(await tsdb(`eventsnextleague.php?id=${encodeURIComponent(leagueId)}`))?.events||[]}catch(_e){}
  try{past=(await tsdb(`eventspastleague.php?id=${encodeURIComponent(leagueId)}`))?.events||[]}catch(_e){}
  try{day0=(await tsdb(`eventsday.php?d=${ymd(0)}&l=${encodeURIComponent(leagueId)}`))?.events||[]}catch(_e){}
  try{day1=(await tsdb(`eventsday.php?d=${ymd(1)}&l=${encodeURIComponent(leagueId)}`))?.events||[]}catch(_e){}
  try{day2=(await tsdb(`eventsday.php?d=${ymd(-1)}&l=${encodeURIComponent(leagueId)}`))?.events||[]}catch(_e){}
  const events=mergeEvents(seasonEvents,next,past,day0,day1,day2).filter(e=>String(e.idLeague||leagueId)===leagueId&&String(e.strSeason||'')===season);
  if(!events.length)throw new Error(`No fixtures were returned for ${tournament.name} ${season}. Provider coverage may be unavailable.`);
  const [savedTeams,savedMatches]=await Promise.all([
    db.from('teams').select('*').eq('tournament_id',tournament.id),
    db.from('matches').select('id,tournament_id,external_id').in('external_id',events.map(e=>String(e.idEvent)))
  ]);
  if(savedTeams.error)throw savedTeams.error;if(savedMatches.error)throw savedMatches.error;
  const {teams:teamRows,matches:matchRows}=prepareTournamentRows(tournament,teams,events,savedTeams.data||[],savedMatches.data||[]);
  if(teamRows.length){const{error}=await db.from('teams').upsert(teamRows,{onConflict:'id'});if(error)throw error}
  if(matchRows.length){const{error}=await db.from('matches').upsert(matchRows,{onConflict:'id'});if(error)throw error}
  const{error:updateError}=await db.from('tournaments').update({logo_url:league?.strBadge||league?.strLogo||tournament.logo_url||null,last_synced_at:new Date().toISOString()}).eq('id',tournament.id);if(updateError)throw updateError;
  return{id:tournament.id,name:tournament.name,teams:teamRows.length,matches:matchRows.length,logo:Boolean(league?.strBadge||league?.strLogo)}
}
async function syncAll(db:any,ids?:string[]){let q=db.from('tournaments').select('*').eq('sync_enabled',true).not('provider_league_id','is',null);if(ids?.length)q=q.in('id',ids);const{data,error}=await q;if(error)throw error;const results=[];for(const t of data||[]){try{results.push(await syncTournament(db,t))}catch(e){results.push({id:t.id,error:e instanceof Error?e.message:String(e)})}}return results}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'POST required'},405);
  const supabaseUrl=Deno.env.get('SUPABASE_URL')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,anonKey=Deno.env.get('SUPABASE_ANON_KEY')!;
  const auth=req.headers.get('authorization')||'',token=auth.replace(/^Bearer\s+/i,'');if(!token)return json({error:'Authentication required'},401);
  const authClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});const{data:{user},error:userError}=await authClient.auth.getUser(token);if(userError||!user)return json({error:'Invalid session'},401);
  const db=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});const{data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();if(profile?.role!=='admin')return json({error:'Admin access required'},403);
  try{const body=await req.json().catch(()=>({}));const action=body?.action||'sync_all';if(action==='sync_tournament'){const{data:t,error}=await db.from('tournaments').select('*').eq('id',body.tournamentId).single();if(error)throw error;return json({ok:true,result:await syncTournament(db,t)})}if(action==='sync_all')return json({ok:true,results:await syncAll(db,body?.tournamentIds)});return json({error:'Unknown action'},400)}catch(e){return json({error:e instanceof Error?e.message:String(e)},500)}
});
