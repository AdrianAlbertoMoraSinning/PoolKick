import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { XMLParser } from "npm:fast-xml-parser@5.0.8";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"content-type":"application/json"}});
const feeds=[
  {name:'Sky Sports',url:'https://www.skysports.com/rss/11095'},
  {name:'MARCA',url:'https://news.google.com/rss/search?q=site%3Amarca.com%20futbol&hl=es&gl=ES&ceid=ES:es'},
  {name:'Mundo Deportivo',url:'https://news.google.com/rss/search?q=site%3Amundodeportivo.com%20futbol&hl=es&gl=ES&ceid=ES:es'},
];
const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_',trimValues:true});
const clean=(s='')=>String(s).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,700);
const category=(title='')=>{const s=title.toLowerCase();if(s.includes('champions'))return'champions';if(s.includes('world cup')||s.includes('mundial'))return'world-cup';if(s.includes('copa am'))return'copa';if(s.includes('euro'))return'euro';return'general'};
async function idFor(s:string){const bytes=await crypto.subtle.digest('SHA-1',new TextEncoder().encode(s));return 'rss_'+Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,24)}
function listItems(doc:any){const ch=doc?.rss?.channel||doc?.feed;const raw=ch?.item||ch?.entry||[];return Array.isArray(raw)?raw:[raw]}
function itemLink(item:any){if(typeof item?.link==='string')return item.link;if(item?.link?.['@_href'])return item.link['@_href'];if(Array.isArray(item?.link)){const x=item.link.find((v:any)=>v?.['@_href']);if(x)return x['@_href']}return item?.guid?.['#text']||item?.guid||''}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'POST required'},405);
  const supabaseUrl=Deno.env.get('SUPABASE_URL')!,anonKey=Deno.env.get('SUPABASE_ANON_KEY')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth=req.headers.get('authorization')||'',token=auth.replace(/^Bearer\s+/i,'');if(!token)return json({error:'Authentication required'},401);
  const authClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});const{data:{user},error:userError}=await authClient.auth.getUser(token);if(userError||!user)return json({error:'Invalid session'},401);
  const db=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:last}=await db.from('news_articles').select('created_at').in('source_name',feeds.map(f=>f.name)).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(last?.created_at&&Date.now()-new Date(last.created_at).getTime()<15*60*1000)return json({ok:true,skipped:true,reason:'Feeds refreshed less than 15 minutes ago'});
  const rows:any[]=[];const errors:any[]=[];
  for(const feed of feeds){try{const r=await fetch(feed.url,{headers:{'user-agent':'PoolKick/1.0'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);const doc=parser.parse(await r.text());for(const item of listItems(doc).slice(0,12)){const title=clean(item?.title?.['#text']||item?.title||'');const link=itemLink(item);if(!title||!link)continue;const summary=clean(item?.description?.['#text']||item?.description||item?.summary?.['#text']||item?.summary||'');const published=item?.pubDate||item?.published||item?.updated||new Date().toISOString();rows.push({id:await idFor(feed.name+'|'+link),category:category(title),title_en:title,title_es:title,title_fr:title,summary_en:summary,summary_es:summary,summary_fr:summary,source_name:feed.name,source_url:link,image_url:null,featured:false,status:'published',published_at:new Date(published).toISOString()})}}catch(e){errors.push({source:feed.name,error:e instanceof Error?e.message:String(e)})}}
  if(rows.length){const{error}=await db.from('news_articles').upsert(rows,{onConflict:'id'});if(error)return json({error:error.message},500)}
  return json({ok:true,inserted:rows.length,errors});
});
