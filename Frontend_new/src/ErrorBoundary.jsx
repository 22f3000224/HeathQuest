import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ error, info })
    // you could also log to an external service here
    // console.error(error, info)
  }

  render() {
    const { error, info } = this.state
    if (error) {
      return (
        <div style={{ padding: 24, color: '#fee', background: '#2b0b0b', minHeight: '100vh' }}>
          <h2 style={{ marginTop: 0 }}>An error occurred</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ffdcdc' }}>{error && String(error)}</pre>
          {info && <details style={{ color: '#ffdcdc' }}><summary>Component stack</summary><pre>{info.componentStack}</pre></details>}
        </div>
      )
    }
    return this.props.children
  }
}
