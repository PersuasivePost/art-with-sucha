import { BrowserRouter as Router } from 'react-router-dom'
import AppRouter from './components/Router'
import { useState } from 'react'
import './App.css'

function App() {
  return (
    <Router>
      <div>
        <h1>Art with Sucha</h1>
        <AppRouter />
      </div>
    </Router>
  )
}

export default App
