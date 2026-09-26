import React from 'react'
import { Ban, Heart, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { APP } from '../config'
import { useApp } from '../context/AppContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { Button, Card } from '../components/UI'

export default function Support({publicView=false}){
  const {t}=useApp()
  const donate=()=>{
    if(APP.donationUrl) window.open(APP.donationUrl,'_blank','noopener,noreferrer')
    else alert(t('support.notReady'))
  }
  const body=<>
    <div className="support-hero"><span className="eyebrow">{t('support.eyebrow')}</span><h1>{t('support.title')}</h1><p>{t('support.text')}</p><Button onClick={donate}><Heart size={17}/>{t('support.button')}</Button>{!APP.donationUrl&&<small>{t('support.notReady')}</small>}</div>
    <div className="support-grid"><Card><Ban/><h3>{t('support.noAds')}</h3><p>{t('support.noAdsText')}</p></Card><Card><Heart/><h3>{t('support.optional')}</h3><p>{t('support.optionalText')}</p></Card><Card><ShieldCheck/><h3>{t('support.noAdvantage')}</h3><p>{t('support.noAdvantageText')}</p></Card></div>
    <Card className="support-note"><ShieldCheck/><p>{t('support.secure')}</p></Card>
  </>
  if(!publicView)return body
  return <div className="public-subpage"><header className="manual-public-head"><Link to="/" className="brand">⚽ {APP.name}</Link><div className="public-sub-actions"><LanguageSwitcher compact/><Link to="/">{t('landing.signIn')}</Link></div></header><main className="public-sub-main">{body}</main></div>
}
