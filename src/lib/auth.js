export async function completePasswordSignIn(auth, credentials, hydrate) {
  const { data, error } = await auth.signInWithPassword(credentials)
  if (error) throw error
  if (!data?.session?.user?.id) throw new Error('Sign-in did not return a session.')
  await hydrate(data.session)
}

// Supabase holds its auth lock while notifying subscribers. Defer database
// requests until the synchronous callback has returned.
export function subscribeToSession(auth, { signedOut, changed }, schedule = setTimeout, cancel = clearTimeout) {
  const pending = new Set()
  const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      for (const timer of pending) cancel(timer)
      pending.clear()
      signedOut()
    } else if (session && ['SIGNED_IN', 'USER_UPDATED'].includes(event)) {
      const timer = schedule(() => { pending.delete(timer); changed(session) }, 0)
      pending.add(timer)
    }
  })
  return () => {
    subscription.unsubscribe()
    for (const timer of pending) cancel(timer)
    pending.clear()
  }
}
