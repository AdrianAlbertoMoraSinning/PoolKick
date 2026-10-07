import test from 'node:test'
import assert from 'node:assert/strict'
import { calculatePoints,recalculatePredictions,standingsForPool } from '../src/lib/scoring.js'
import { predictionOpen,validScores,syncSummary,qaCopy } from '../src/lib/qa.js'

test('classic and simple scoring: exact, difference, outcome and loss',()=>{
 const match={status:'finished',homeScore:3,awayScore:1}
 assert.equal(calculatePoints({homeScore:3,awayScore:1},match),5)
 assert.equal(calculatePoints({homeScore:2,awayScore:0},match),3)
 assert.equal(calculatePoints({homeScore:1,awayScore:0},match),2)
 assert.equal(calculatePoints({homeScore:0,awayScore:1},match),0)
 assert.equal(calculatePoints({homeScore:3,awayScore:1},match,'simple'),3)
 assert.equal(calculatePoints({homeScore:2,awayScore:0},match,'simple'),1)
 assert.equal(calculatePoints({homeScore:0,awayScore:0},{status:'finished',homeScore:1,awayScore:1}),3)
})
test('missing or unfinished results do not award points',()=>{
 assert.equal(calculatePoints({homeScore:0,awayScore:0},undefined),null)
 assert.equal(calculatePoints({homeScore:0,awayScore:0},{status:'scheduled',homeScore:0,awayScore:0}),null)
 assert.equal(calculatePoints({homeScore:0,awayScore:0},{status:'finished',homeScore:null,awayScore:null}),null)
})
test('recalculation preserves application state through profile, chat and notification mutations',()=>{
 const state={sessionUserId:'u1',users:[{id:'u1',displayName:'A'}],pools:[{id:'p1',scoring:'classic',members:['u1']}],matches:[{id:'m1',status:'finished',homeScore:2,awayScore:1}],predictions:[{id:'pr1',poolId:'p1',matchId:'m1',userId:'u1',homeScore:2,awayScore:1}],comments:[],notifications:[]}
 const result=recalculatePredictions(state)
 assert.equal(Array.isArray(result),false)
 assert.equal(result.sessionUserId,'u1')
 assert.equal(result.predictions[0].points,5)
 assert.equal(state.predictions[0].points,undefined)
 assert.equal(standingsForPool(result,'p1')[0].points,5)
})
test('a temporarily missing member profile does not crash standings',()=>{
 const result=standingsForPool({users:[],predictions:[],pools:[{id:'p',members:['missing']}]},'p')
 assert.equal(result[0].user.id,'missing')
})
test('only scheduled future matches accept picks, with kickoff equality locked',()=>{
 const now=Date.parse('2026-10-07T00:00:00Z')
 assert.equal(predictionOpen({status:'scheduled',kickoff:'2026-10-07T01:00:00Z'},now),true)
 for(const status of ['live','finished','postponed','cancelled'])assert.equal(predictionOpen({status,kickoff:'2026-10-07T01:00:00Z'},now),false)
 assert.equal(predictionOpen({status:'scheduled',kickoff:'2026-10-07T00:00:00Z'},now),false)
})
test('invalid score input is rejected before persistence',()=>{
 assert.equal(validScores('0','2'),true)
 for(const v of ['',null,undefined,-1,1.5,'NaN',Infinity,2147483648])assert.equal(validScores(v,0),false)
})
test('partial sports sync is an error, never a full-success message',()=>{
 assert.equal(syncSummary({results:[{matches:5},{matches:7}]},'en'),'Synced matches: 12')
 assert.throws(()=>syncSummary({results:[{id:'t1',matches:5},{id:'t2',error:'Provider unavailable'}]},'es'),/t2: Provider unavailable/)
 assert.throws(()=>syncSummary({result:{id:'t3',skipped:true,reason:'No league ID'}},'fr'),/t3/)
})
test('all QA interface messages have EN ES FR translations',()=>{
 for(const locale of ['en','es','fr'])assert.deepEqual(Object.keys(qaCopy(locale)),Object.keys(qaCopy('en')))
})
