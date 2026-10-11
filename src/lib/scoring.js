import { SCORING_PRESETS } from '../config.js'

export function outcome(a, b) {
  if (a === b) return 'D'
  return a > b ? 'H' : 'A'
}

export function calculatePoints(prediction, match, scoringKey = 'classic') {
  if (!match || match.status !== 'finished' || prediction == null || match.homeScore == null || match.awayScore == null) return null
  const ph = Number(prediction.homeScore)
  const pa = Number(prediction.awayScore)
  const ah = Number(match.homeScore)
  const aa = Number(match.awayScore)

  if (scoringKey === 'classic') {
    const rules = SCORING_PRESETS.classic
    const predicted = outcome(ph, pa)
    const actual = outcome(ah, aa)
    const exact = ph === ah && pa === aa
    if (actual === 'D') return exact ? rules.exactDraw : (predicted === 'D' ? rules.draw : 0)
    if (exact) return rules.exactWin
    return predicted === actual ? rules.winner : 0
  }

  const rules = SCORING_PRESETS[scoringKey] || SCORING_PRESETS.simple
  if (ph === ah && pa === aa) return rules.exact
  if ((ph - pa) === (ah - aa) && outcome(ph, pa) === outcome(ah, aa)) return rules.difference
  if (outcome(ph, pa) === outcome(ah, aa)) return rules.outcome
  return 0
}

export function recalculatePredictions(state) {
  const poolMap = Object.fromEntries(state.pools.map(p => [p.id, p]))
  const matchMap = Object.fromEntries(state.matches.map(m => [m.id, m]))
  return {...state, predictions: state.predictions.map(p => {
    const pool = poolMap[p.poolId]
    const match = matchMap[p.matchId]
    return { ...p, points: calculatePoints(p, match, pool?.scoring) }
  })}
}

function isExactPrediction(p, matchMap) {
  const match = matchMap[p.matchId]
  return !!match && match.status === 'finished' && Number(p.homeScore) === Number(match.homeScore) && Number(p.awayScore) === Number(match.awayScore)
}

export function standingsForPool(state, poolId) {
  const pool = state.pools.find(p => p.id === poolId)
  if (!pool) return []
  const users = Object.fromEntries(state.users.map(u => [u.id, u]))
  const matchMap = Object.fromEntries(state.matches.map(m => [m.id, m]))
  return pool.members.map(userId => {
    const picks = state.predictions.filter(p => p.poolId === poolId && p.userId === userId)
    const scored = picks.filter(p => typeof p.points === 'number')
    const points = scored.reduce((sum, p) => sum + p.points, 0)
    return {
      user: users[userId] || {id:userId,displayName:'—',avatar:'⚽'},
      points,
      exact: scored.filter(p => isExactPrediction(p, matchMap)).length,
      correct: scored.filter(p => p.points > 0).length,
      picks: scored.length,
    }
  }).sort((a,b) => b.points - a.points || b.exact - a.exact || a.user.displayName.localeCompare(b.user.displayName))
}

export function rankingsForState(state, tournamentId=null) {
  const pools=state.pools.filter(p=>!tournamentId||p.tournamentId===tournamentId)
  const matchMap = Object.fromEntries(state.matches.map(m=>[m.id,m]))
  return state.users.map(user=>{
    const memberships=pools.filter(p=>p.members.includes(user.id))
    const picks=state.predictions.filter(p=>p.userId===user.id&&memberships.some(pool=>pool.id===p.poolId))
    return {user_id:user.id,display_name:user.displayName,avatar:user.avatar,
      total_points:picks.reduce((n,p)=>n+(p.points||0),0),
      exact_scores:picks.filter(p=>isExactPrediction(p,matchMap)).length,
      correct_predictions:picks.filter(p=>p.points>0).length,pools_played:memberships.length}
  }).filter(row=>!tournamentId||row.pools_played>0)
    .sort((a,b)=>b.total_points-a.total_points||b.exact_scores-a.exact_scores||b.correct_predictions-a.correct_predictions||a.display_name.localeCompare(b.display_name))
    .map((row,index)=>({...row,rank:index+1}))
}
