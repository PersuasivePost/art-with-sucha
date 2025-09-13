import { BrowserRouter as Router } from 'react-router-dom'
import AppRouter from './components/Router'

function App() {
  return (
    <Router>
      <div>
        <AppRouter />
      </div>
    </Router>
  )
}

export default App