import { useState } from 'react'
import Planner from './components/Planner'
import Itinerary from './components/Itinerary'
import { Map, ListOrdered } from 'lucide-react'

function App() {
  const [currentView, setCurrentView] = useState('planner')

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              A
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Agentic Travel
            </h1>
          </div>
          
          <nav className="flex gap-2">
            <button
              onClick={() => setCurrentView('planner')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'planner' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Map size={18} />
              Planner
            </button>
            <button
              onClick={() => setCurrentView('itinerary')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'itinerary' 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ListOrdered size={18} />
              Itinerary
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto">
        {currentView === 'planner' ? <Planner /> : <Itinerary />}
      </main>
    </div>
  )
}

export default App
