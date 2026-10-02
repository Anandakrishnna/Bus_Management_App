import { strings } from '../strings'

export function AppLoading() {
  return (
    <main className="loading-page" aria-live="polite">
      <span className="loading-mark" aria-hidden="true">●</span>
      <p>{strings.loading}</p>
    </main>
  )
}
