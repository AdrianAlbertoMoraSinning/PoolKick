import test from 'node:test'
import assert from 'node:assert/strict'
import { completePasswordSignIn, subscribeToSession } from '../src/lib/auth.js'

test('sign-in resolves only after the real session profile is loaded', async () => {
  const session={user:{id:'admin'}}
  let release
  const hydration=new Promise(resolve=>{release=resolve})
  let finished=false
  const completion=completePasswordSignIn({signInWithPassword:async()=>({data:{session}})}, {}, async value=>{
    assert.equal(value,session)
    await hydration
  }).then(()=>{finished=true})
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(finished,false)
  release()
  await completion
  assert.equal(finished,true)
})

test('auth errors and profile errors prevent successful completion', async()=>{
  let hydrated=false
  const error=new Error('Failed to fetch')
  await assert.rejects(completePasswordSignIn({signInWithPassword:async()=>({error})}, {},()=>{hydrated=true}),error)
  assert.equal(hydrated,false)
  await assert.rejects(completePasswordSignIn({signInWithPassword:async()=>({data:{session:{user:{id:'admin'}}}})}, {},async()=>{throw new Error('Profile unavailable')}),/Profile unavailable/)
  await assert.rejects(completePasswordSignIn({signInWithPassword:async()=>({data:{session:null}})}, {},()=>{}),/did not return a session/)
})

test('auth event database work is deferred outside the auth lock and cancelled on logout/unmount',()=>{
  let callback,unsubscribed=false,out=0,loaded=0,next=0
  const tasks=new Map()
  const cleanup=subscribeToSession({onAuthStateChange:fn=>{
    callback=fn
    return {data:{subscription:{unsubscribe:()=>{unsubscribed=true}}}}
  }},{signedOut:()=>{out++},changed:()=>{loaded++}},fn=>{tasks.set(++next,fn);return next},id=>tasks.delete(id))
  const session={user:{id:'admin'}}
  callback('SIGNED_IN',session)
  assert.equal(loaded,0)
  tasks.get(1)()
  tasks.delete(1)
  assert.equal(loaded,1)
  callback('SIGNED_IN',session)
  callback('SIGNED_OUT',null)
  assert.equal(tasks.size,0)
  assert.equal(out,1)
  callback('TOKEN_REFRESHED',session)
  assert.equal(tasks.size,0)
  callback('USER_UPDATED',session)
  cleanup()
  assert.equal(tasks.size,0)
  assert.equal(unsubscribed,true)
})
