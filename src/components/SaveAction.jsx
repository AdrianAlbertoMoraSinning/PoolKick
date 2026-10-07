import React,{useState} from 'react'
import { Button } from './UI'
import { useApp } from '../context/AppContext'
import { qaCopy } from '../lib/qa'

export default function SaveAction({action,children,disabled=false,success,className='',...props}){
 const {state}=useApp(),c=qaCopy(state.locale)
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const run=async()=>{setBusy(true);setMessage('');setError('');try{const result=await action();if(result===false)throw new Error(c.failed);setMessage(success||c.saved)}catch(e){setError(e.message||c.failed)}finally{setBusy(false)}}
 return <div className={`save-action ${className}`}><Button {...props} disabled={disabled||busy} onClick={run}>{busy?c.saving:children}</Button>{error&&<div role="alert" className="form-error">{error}</div>}{message&&<small role="status" className="form-success">{message}</small>}</div>
}
