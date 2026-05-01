import { Component } from 'react'

// React's standard error boundary. Catches render errors in children
// and shows a debuggable error UI instead of letting the whole tree
// unmount silently (which previously left the user with a blank screen
// + no TabBar when any individual tab crashed).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[ErrorBoundary]', error, info?.componentStack)

    // Auto-recover from stale-bundle chunk-load errors. The page is running
    // an old build that references hashed chunks that no longer exist on the
    // server. Reloading fetches fresh HTML pointing at current chunks.
    // Session flag prevents reload loops if the underlying error isn't actually
    // a chunk issue.
    const msg = String(error?.message || '').toLowerCase()
    const isChunkError =
      msg.includes('importing a module script failed') ||
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('loading chunk') ||
      msg.includes("can't find variable") && msg.includes('chunk')
    if (isChunkError && !sessionStorage.getItem('chunk-reload-attempted')) {
      sessionStorage.setItem('chunk-reload-attempted', '1')
      window.location.reload()
    }
  }

  reset = () => this.setState({ error: null, info: null })

  render() {
    if (!this.state.error) return this.props.children
    const e = this.state.error
    return (
      <div className="px-4 pt-14 pb-4 space-y-4 max-w-md mx-auto">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-danger)' }}>
            {this.props.label || 'Screen'} crashed
          </p>
          <h1 className="text-2xl font-black tracking-tight">Something broke</h1>
        </div>

        <div className="card p-4 space-y-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>
            {e?.name || 'Error'}: {e?.message || 'Unknown'}
          </p>
          {e?.stack && (
            <pre className="text-[10px] leading-snug overflow-x-auto whitespace-pre-wrap"
              style={{ color: 'var(--color-muted)' }}>
              {e.stack.slice(0, 1500)}
            </pre>
          )}
          {this.state.info?.componentStack && (
            <details className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
              <summary className="cursor-pointer">Component stack</summary>
              <pre className="mt-1 whitespace-pre-wrap">{this.state.info.componentStack.slice(0, 800)}</pre>
            </details>
          )}
        </div>

        <button onClick={this.reset}
          className="w-full py-3 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}>
          Try again
        </button>
        <button onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl text-sm font-medium"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
          Reload app
        </button>
      </div>
    )
  }
}
