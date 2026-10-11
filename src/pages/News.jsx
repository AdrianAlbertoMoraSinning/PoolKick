import React,{useEffect,useMemo,useState} from 'react'
import { ExternalLink, Newspaper, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { APP } from '../config'
import { localizedField, localeTag } from '../i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { Button, Card, Pill } from '../components/UI'

export default function News({publicView=false}){
  const {state,t,currentUser}=useApp()
  const [filter,setFilter]=useState('all'),[syncing,setSyncing]=useState(false),[syncMsg,setSyncMsg]=useState('')
  const locale=state.locale||'en'
  const news=useMemo(()=>[...(state.news||[])].filter(n=>n.status!=='draft').sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0)),[state.news])
  const filters=[['all',t('news.all')],['general','Latest'],['world-cup',t('news.worldCup')],['champions',t('news.champions')],['copa',t('news.copa')],['euro',t('news.euro')],['platform',t('news.platform')]]
  const rows=filter==='all'?news:news.filter(n=>n.category===filter)
  const featured=rows.find(n=>n.featured)||rows[0]
  const rest=featured?rows.filter(n=>n.id!==featured.id):[]
  const date=n=>new Date(n.publishedAt||Date.now()).toLocaleDateString(localeTag(locale),{year:'numeric',month:'short',day:'numeric'})
  const syncNews=async()=>{if(!currentUser||publicView)return;setSyncing(true);setSyncMsg('');try{const {data,error}=await supabase.functions.invoke('news-sync',{body:{}});if(error)throw error;setSyncMsg(data?.skipped?'News is already current.':`Updated ${data?.inserted||0} stories. Refreshing…`);if(!data?.skipped)setTimeout(()=>window.location.reload(),700)}catch(e){setSyncMsg(e.message||'Unable to refresh news.')}finally{setSyncing(false)}}
  useEffect(()=>{if(currentUser&&!publicView)void syncNews()},[])
  const CardBody=({n,feature=false})=><>
    <div className={`news-art ${feature?'feature':''}`}>
      <div className="news-art-cover">{n.imageUrl?<img src={n.imageUrl} alt=""/>:<Newspaper/>}</div>
      <div className="news-art-copy">{n.featured&&<Pill tone="green">{t('news.featured')}</Pill>}<span className="eyebrow">{n.sourceName||APP.name} · {date(n)}</span><h2>{localizedField(n,'title',locale)}</h2><p>{localizedField(n,'summary',locale)}</p>{n.sourceUrl&&<a className="text-link" href={n.sourceUrl} target="_blank" rel="noreferrer">{t('news.read')} <ExternalLink size={14}/></a>}</div>
    </div>
  </>

  const body=<>
    <div className="page-head"><div><span className="eyebrow">{t('news.eyebrow')}</span><h1>{t('news.title')}</h1><p>{t('news.text')} Live headlines are aggregated from MARCA, Mundo Deportivo and Sky Sports; PoolKick stores only short feed summaries and links back to the original source.</p></div>{currentUser&&!publicView&&<Button variant="secondary" onClick={syncNews} disabled={syncing}><RefreshCw size={16}/>{syncing?'Refreshing…':'Refresh news'}</Button>}</div>
    {syncMsg&&<div className="small muted" style={{marginBottom:12}}>{syncMsg}</div>}
    <div className="news-filters">{filters.map(([id,label])=><button key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>{label}</button>)}</div>
    {!rows.length?<Card className="empty"><Newspaper/><h3>{t('news.empty')}</h3></Card>:<>
      {featured&&<Card className="news-feature"><CardBody n={featured} feature/></Card>}
      <div className="news-grid">{rest.map(n=><Card key={n.id}><CardBody n={n}/></Card>)}</div>
    </>}
  </>

  if(!publicView)return body
  return <div className="public-subpage"><header className="manual-public-head"><Link to="/" className="brand">⚽ {APP.name}</Link><div className="public-sub-actions"><LanguageSwitcher compact/><Link to="/">{t('landing.signIn')}</Link></div></header><main className="public-sub-main">{body}</main></div>
}
