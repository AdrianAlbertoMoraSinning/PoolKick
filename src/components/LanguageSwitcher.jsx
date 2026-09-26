import React from 'react'
import { Languages } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { LANGUAGES } from '../i18n'

export default function LanguageSwitcher({ compact=false }){
  const {state,setLocale}=useApp()
  const locale=state.locale || 'en'
  return <div className={`lang-switch ${compact?'compact':''}`} aria-label="Language selector">
    {!compact&&<Languages size={15}/>}
    {LANGUAGES.map(lang=><button key={lang.code} type="button" className={locale===lang.code?'active':''} title={lang.name} onClick={()=>setLocale(lang.code)}>{lang.label}</button>)}
  </div>
}
