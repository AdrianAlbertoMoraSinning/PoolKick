import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './context/AppContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Tournaments from './pages/Tournaments'
import Pools from './pages/Pools'
import PoolDetail from './pages/PoolDetail'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import Manual from './pages/Manual'
import News from './pages/News'
import Support from './pages/Support'
import Rankings from './pages/Rankings'
import LiveScores from './pages/LiveScores'

function Protected(){
  const {currentUser,loading,connectionError,t}=useApp()
  if(loading)return <div className="loading-screen">⚽<b>{t('common.loading')}</b></div>
  if(connectionError&&!currentUser)return <div className="loading-screen error-screen">⚠️<b>Database connection error</b><span>{connectionError}</span><a href="/">Return home</a></div>
  return currentUser?<Layout/>:<Navigate to="/" replace/>
}

export default function App(){return <Routes>
  <Route path="/" element={<Landing/>}/>
  <Route path="/manual-public" element={<Manual publicView/>}/>
  <Route path="/news-public" element={<News publicView/>}/>
  <Route path="/support-public" element={<Support publicView/>}/>
  <Route element={<Protected/>}>
    <Route path="/dashboard" element={<Dashboard/>}/>
    <Route path="/news" element={<News/>}/>
    <Route path="/live" element={<LiveScores/>}/>
    <Route path="/rankings" element={<Rankings/>}/>
    <Route path="/tournaments" element={<Tournaments/>}/>
    <Route path="/pools" element={<Pools/>}/>
    <Route path="/pools/:id" element={<PoolDetail/>}/>
    <Route path="/profile" element={<Profile/>}/>
    <Route path="/support" element={<Support/>}/>
    <Route path="/manual" element={<Manual/>}/>
    <Route path="/admin" element={<Admin/>}/>
  </Route>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes>}
