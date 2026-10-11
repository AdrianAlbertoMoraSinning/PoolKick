import { useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

export default function BackgroundRefresh(){
  const {mode,currentUser,refreshSportsData}=useApp()
  const running=useRef(false)

  useEffect(()=>{
    if(mode!=='supabase' || !currentUser) return
    let cancelled=false

    const refresh=async()=>{
      if(cancelled || running.current || document.visibilityState==='hidden') return
      running.current=true
      try{
        const sports=await supabase.functions.invoke('sports-sync',{body:{action:'refresh_live'}})
        if(!sports.error && !sports.data?.error && !cancelled) await refreshSportsData()

        const news=await supabase.functions.invoke('news-sync',{body:{}})
        if(!news.error && !news.data?.error && !cancelled && !news.data?.skipped) await refreshSportsData()
      }catch{
        // Background refresh is best-effort; foreground pages keep their own manual refresh controls.
      }finally{
        running.current=false
      }
    }

    void refresh()
    const timer=setInterval(refresh,120000)
    const onVisible=()=>{if(document.visibilityState==='visible')void refresh()}
    document.addEventListener('visibilitychange',onVisible)
    return ()=>{cancelled=true;clearInterval(timer);document.removeEventListener('visibilitychange',onVisible)}
  },[mode,currentUser?.id,refreshSportsData])

  return null
}
