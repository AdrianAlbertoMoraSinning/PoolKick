import React,{useState} from 'react'

export function Button({children,variant='primary',className='',...props}){return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>}
export function Card({children,className=''}){return <div className={`card ${className}`}>{children}</div>}
export function Pill({children,tone='default'}){return <span className={`pill pill-${tone}`}>{children}</span>}
export function Empty({icon='⚽',title,children}){return <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{children}</p></div>}
export function TeamMark({team,size='md'}){
  const raw=team?.logoUrl||team?.logo_url
  const [failed,setFailed]=useState(null)
  const src=failed===raw?null:raw
  return <div className={`team-mark team-mark-${size} ${src?'has-logo':''}`} title={team?.name}>{src?<img src={src} onError={()=>setFailed(raw)} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<>{team?.flag || '⚽'}<span>{team?.badge || team?.code || '?'}</span></>}</div>
}
export function TournamentMark({tournament,size='md'}){
  const raw=tournament?.logoUrl||tournament?.logo_url
  const [failed,setFailed]=useState(null)
  const src=failed===raw?null:raw
  return <div className={`tourney-icon ${size==='lg'?'large':size==='sm'?'sm':''}`} style={!src?{background:tournament?.accent}:undefined}>{src?<img src={src} onError={()=>setFailed(raw)} alt="" loading="lazy" referrerPolicy="no-referrer"/>:(tournament?.icon||'🏆')}</div>
}
export function Avatar({user,size='md'}){return <div className={`avatar avatar-${size}`}>{user?.avatar || '⚽'}</div>}
export function Stat({value,label}){return <div className="stat"><strong>{value}</strong><span>{label}</span></div>}
