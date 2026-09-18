const now = new Date()
const plusDays = (days, hour = 18) => {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

export const avatars = ['🦁','🦊','🐺','🐯','🦅','🐉','🤖','🥷','🧙','👽','🐻','🦈']

export const seedState = {
  sessionUserId: 'u1',
  locale: 'en',
  notifications: [
    { id: 'n1', userId: 'u1', text: 'Your World Cup picks for Matchday 1 are still open.', read: false, createdAt: plusDays(-1) },
    { id: 'n2', userId: 'u1', text: 'Marlon joined “The Crew — World Cup”.', read: true, createdAt: plusDays(-2) },
  ],
  users: [
    { id: 'u1', email: 'adrian@poolkick.demo', displayName: 'Adrian', country: 'CO', countryFlag: '🇨🇴', avatar: '🦁', favoriteTeam: 'Colombia', role: 'player', createdAt: plusDays(-60) },
    { id: 'u2', email: 'marlon@poolkick.demo', displayName: 'Marlon', country: 'CA', countryFlag: '🇨🇦', avatar: '🦊', favoriteTeam: 'Canada', role: 'admin', createdAt: plusDays(-60) },
    { id: 'u3', email: 'luisa@poolkick.demo', displayName: 'Luisa', country: 'CO', countryFlag: '🇨🇴', avatar: '🦅', favoriteTeam: 'Colombia', role: 'player', createdAt: plusDays(-45) },
    { id: 'u4', email: 'fabian@poolkick.demo', displayName: 'Fabian', country: 'US', countryFlag: '🇺🇸', avatar: '🐺', favoriteTeam: 'USA', role: 'player', createdAt: plusDays(-20) },
  ],
  tournaments: [
    { id: 't1', slug: 'world-cup-2026', name: 'World Cup', shortName: 'WC 2026', edition: '2026', icon: '🌎', accent: '#ff4d4f', status: 'active', format: '48 teams · group stage + knockout', description: 'The biggest national-team tournament in football.' },
    { id: 't2', slug: 'champions-league-2026', name: 'Champions League', shortName: 'UCL', edition: '2026/27', icon: '🏆', accent: '#6f7cff', status: 'active', format: 'League phase + knockout', description: 'Europe’s premier club competition.' },
    { id: 't3', slug: 'euro-2028', name: 'EURO', shortName: 'EURO', edition: '2028', icon: '🇪🇺', accent: '#00a8ff', status: 'coming', format: 'Group stage + knockout', description: 'Europe’s national-team championship.' },
    { id: 't4', slug: 'copa-america-2028', name: 'Copa América', shortName: 'COPA', edition: '2028', icon: '🌎', accent: '#20c997', status: 'coming', format: 'Group stage + knockout', description: 'South America’s flagship national-team tournament.' },
  ],
  teams: [
    { id:'tm1', tournamentId:'t1', name:'Canada', code:'CAN', flag:'🇨🇦', badge:'CAN' },
    { id:'tm2', tournamentId:'t1', name:'Mexico', code:'MEX', flag:'🇲🇽', badge:'MEX' },
    { id:'tm3', tournamentId:'t1', name:'Colombia', code:'COL', flag:'🇨🇴', badge:'COL' },
    { id:'tm4', tournamentId:'t1', name:'Argentina', code:'ARG', flag:'🇦🇷', badge:'ARG' },
    { id:'tm5', tournamentId:'t1', name:'Brazil', code:'BRA', flag:'🇧🇷', badge:'BRA' },
    { id:'tm6', tournamentId:'t1', name:'Spain', code:'ESP', flag:'🇪🇸', badge:'ESP' },
    { id:'tm7', tournamentId:'t1', name:'France', code:'FRA', flag:'🇫🇷', badge:'FRA' },
    { id:'tm8', tournamentId:'t1', name:'USA', code:'USA', flag:'🇺🇸', badge:'USA' },
    { id:'tm9', tournamentId:'t2', name:'Real Madrid', code:'RMA', flag:'⚪', badge:'RMA' },
    { id:'tm10', tournamentId:'t2', name:'Manchester City', code:'MCI', flag:'🔵', badge:'MCI' },
    { id:'tm11', tournamentId:'t2', name:'Bayern Munich', code:'FCB', flag:'🔴', badge:'FCB' },
    { id:'tm12', tournamentId:'t2', name:'Paris SG', code:'PSG', flag:'🔷', badge:'PSG' },
  ],
  matches: [
    { id:'m1', tournamentId:'t1', stage:'Group Stage', round:'Matchday 1', homeTeamId:'tm1', awayTeamId:'tm2', kickoff:plusDays(1,18), status:'scheduled', homeScore:null, awayScore:null },
    { id:'m2', tournamentId:'t1', stage:'Group Stage', round:'Matchday 1', homeTeamId:'tm3', awayTeamId:'tm4', kickoff:plusDays(1,20), status:'scheduled', homeScore:null, awayScore:null },
    { id:'m3', tournamentId:'t1', stage:'Group Stage', round:'Matchday 1', homeTeamId:'tm5', awayTeamId:'tm6', kickoff:plusDays(2,16), status:'scheduled', homeScore:null, awayScore:null },
    { id:'m4', tournamentId:'t1', stage:'Group Stage', round:'Matchday 1', homeTeamId:'tm7', awayTeamId:'tm8', kickoff:plusDays(2,19), status:'scheduled', homeScore:null, awayScore:null },
    { id:'m5', tournamentId:'t1', stage:'Group Stage', round:'Matchday 2', homeTeamId:'tm2', awayTeamId:'tm3', kickoff:plusDays(6,18), status:'scheduled', homeScore:null, awayScore:null },
    { id:'m6', tournamentId:'t1', stage:'Group Stage', round:'Matchday 2', homeTeamId:'tm4', awayTeamId:'tm5', kickoff:plusDays(6,20), status:'scheduled', homeScore:null, awayScore:null },
    { id:'m7', tournamentId:'t1', stage:'Group Stage', round:'Completed', homeTeamId:'tm8', awayTeamId:'tm1', kickoff:plusDays(-4,18), status:'finished', homeScore:1, awayScore:2 },
    { id:'m8', tournamentId:'t1', stage:'Group Stage', round:'Completed', homeTeamId:'tm6', awayTeamId:'tm7', kickoff:plusDays(-3,20), status:'finished', homeScore:0, awayScore:0 },
    { id:'m9', tournamentId:'t2', stage:'League Phase', round:'Matchday 1', homeTeamId:'tm9', awayTeamId:'tm10', kickoff:plusDays(3,19), status:'scheduled', homeScore:null, awayScore:null },
    { id:'m10', tournamentId:'t2', stage:'League Phase', round:'Matchday 1', homeTeamId:'tm11', awayTeamId:'tm12', kickoff:plusDays(3,21), status:'scheduled', homeScore:null, awayScore:null },
  ],
  pools: [
    { id:'p1', tournamentId:'t1', name:'The Crew — World Cup', code:'CREW26', commissionerId:'u1', visibility:'private', scoring:'classic', createdAt:plusDays(-15), members:['u1','u2','u3','u4'] },
    { id:'p2', tournamentId:'t2', name:'Champions Nights', code:'UCLFUN', commissionerId:'u2', visibility:'private', scoring:'simple', createdAt:plusDays(-8), members:['u1','u2','u3'] },
  ],
  predictions: [
    { id:'pr1', poolId:'p1', matchId:'m7', userId:'u1', homeScore:1, awayScore:2, points:5 },
    { id:'pr2', poolId:'p1', matchId:'m7', userId:'u2', homeScore:0, awayScore:2, points:3 },
    { id:'pr3', poolId:'p1', matchId:'m7', userId:'u3', homeScore:1, awayScore:1, points:0 },
    { id:'pr4', poolId:'p1', matchId:'m7', userId:'u4', homeScore:0, awayScore:1, points:2 },
    { id:'pr5', poolId:'p1', matchId:'m8', userId:'u1', homeScore:1, awayScore:1, points:2 },
    { id:'pr6', poolId:'p1', matchId:'m8', userId:'u2', homeScore:0, awayScore:0, points:5 },
    { id:'pr7', poolId:'p1', matchId:'m8', userId:'u3', homeScore:2, awayScore:2, points:2 },
    { id:'pr8', poolId:'p1', matchId:'m8', userId:'u4', homeScore:2, awayScore:1, points:0 },
    { id:'pr9', poolId:'p1', matchId:'m1', userId:'u1', homeScore:2, awayScore:1, points:null },
    { id:'pr10', poolId:'p1', matchId:'m2', userId:'u1', homeScore:1, awayScore:1, points:null },
  ],
  comments: [
    { id:'c1', poolId:'p1', userId:'u2', text:'I’m calling a huge upset in Matchday 1 👀', createdAt:plusDays(-1) },
    { id:'c2', poolId:'p1', userId:'u3', text:'No copying picks after kickoff 😄', createdAt:plusDays(-1) },
  ],
}
