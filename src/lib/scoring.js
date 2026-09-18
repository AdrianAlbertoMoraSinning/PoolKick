import { SCORING_PRESETS } from '../config'

export function outcome(a, b) {
  if (a === b) return 'D'
  return a > b ? 'H' : 'A'
}

export function calculatePoints(prediction, match, scoringKey = 'classic') {
  if (match.status !== 'finished' || prediction == null) return null
  const rules = SCORING_PRESETS[scoringKey] || SCORING_PRESETS.classic
  const ph = Number(prediction.homeScore)
  const pa = Number(prediction.awayScore)
  const ah = Number(match.homeScore)
  const aa = Number(match.awayScore)
  if (ph === ah && pa === aa) return rules.exact
  if ((ph - pa) === (ah - aa) && outcome(ph, pa) === outcome(ah, aa)) return rules.difference
  if (outcome(ph, pa) === outcome(ah, aa)) return rules.outcome
  return 0
}

export function recalculatePredictions(state) {
  const poolMap = Object.fromEntries(state.pools.map(p => [p.id, p]))
  const matchMap = Object.fromEntries(state.matches.map(m => [m.id, m]))
  return state.predictions.map(p => {
    const pool = poolMap[p.poolId]
    const match = matchMap[p.matchId]
    return { ...p, points: calculatePoints(p, match, pool?.scoring) }
  })
}

export function standingsForPool(state, poolId) {
  const pool = state.pools.find(p => p.id === poolId)
  if (!pool) return []
  const users = Object.fromEntries(state.users.map(u => [u.id, u]))
  return pool.members.map(userId => {
    const picks = state.predictions.filter(p => p.poolId === poolId && p.userId === userId)
    const scored = picks.filter(p => typeof p.points === 'number')
    const points = scored.reduce((sum, p) => sum + p.points, 0)
    const exactValue = (pool.scoring === 'simple' ? 3 : 5)
    return {
      user: users[userId],
      points,
      exact: scored.filter(p => p.points === exactValue).length,
      correct: scored.filter(p => p.points > 0).length,
      picks: scored.length,
    }
  }).sort((a,b) => b.points - a.points || b.exact - a.exact || a.user.displayName.localeCompare(b.user.displayName))
}
