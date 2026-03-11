import React, { useState } from 'react';
import { Wifi, WifiOff, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

const DUMMY_ACTIVITIES = [
  { id: 1, day: 'Day 1', time: '09:00 AM', title: 'Arrival & Check-in', desc: 'Arrive at the international airport and check into the central hotel.' },
  { id: 2, day: 'Day 1', time: '01:00 PM', title: 'Lunch at Local Market', desc: 'Try the agent-recommended local street food.' },
  { id: 3, day: 'Day 1', time: '03:30 PM', title: 'City Walking Tour', desc: 'Guided tour around the historical center.' },
  { id: 4, day: 'Day 2', time: '10:00 AM', title: 'Museum Visit', desc: 'Entrance tickets are pre-booked.' },
  { id: 5, day: 'Day 2', time: '07:00 PM', title: 'Dinner Cruise', desc: 'Sunset dinner cruise on the river.' },
];

export default function Itinerary() {
  const [isOffline, setIsOffline] = useState(false);
  const [proposalStatus, setProposalStatus] = useState('pending'); // 'pending', 'accepted', 'rejected'

  // TODO: Replace with dynamic grouping logic when hooked to real data
  const groupedActivities = DUMMY_ACTIVITIES.reduce((acc, curr) => {
    if (!acc[curr.day]) acc[curr.day] = [];
    acc[curr.day].push(curr);
    return acc;
  }, {});

  return (
    <div className={`min-h-[calc(100vh-64px)] transition-colors duration-500 p-6 ${isOffline ? 'bg-orange-50/60' : 'bg-transparent'}`}>
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Header & Offline Toggle */}
        <div className="flex items-center justify-between bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Trip Itinerary</h2>
            <p className="text-sm text-gray-500">Your scheduled activities and execution plan</p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold transition-colors ${isOffline ? 'text-orange-600' : 'text-gray-500'}`}>
              {isOffline ? 'Offline Mode Active' : 'Online'}
            </span>
            <button 
              onClick={() => setIsOffline(!isOffline)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                isOffline ? 'bg-orange-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                isOffline ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <div className={`p-2 rounded-full ${isOffline ? 'bg-orange-100' : 'bg-gray-100'}`}>
              {isOffline ? <WifiOff size={18} className="text-orange-600" /> : <Wifi size={18} className="text-gray-500" />}
            </div>
          </div>
        </div>

        {/* Agent Proposal UI */}
        {proposalStatus === 'pending' && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-4">
                <div className="mt-0.5 bg-blue-100 text-blue-600 p-2.5 rounded-full h-min shadow-sm">
                  <Sparkles size={22} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 bg-blue-200 w-fit px-2 py-0.5 rounded text-sm mb-1 uppercase tracking-wide">Agent Proposal</h3>
                  <p className="text-[15px] text-blue-800 leading-relaxed font-medium">
                    Your flight #AB123 to Kyoto has a high chance of delay. The agent suggests switching to an earlier direct flight #XY999 for only <span className="font-bold text-blue-900">+$40</span>.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 sm:shrink-0 ml-14 sm:ml-0">
                <button 
                  onClick={() => setProposalStatus('rejected')}
                  className="px-4 py-2 flex items-center gap-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <XCircle size={18} /> Reject
                </button>
                <button 
                  onClick={() => setProposalStatus('accepted')}
                  className="px-4 py-2 flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <CheckCircle2 size={18} /> Accept
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Proposal Resolved States */}
        {proposalStatus === 'accepted' && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm">
            <CheckCircle2 size={18} className="text-green-600" /> Agent proposal accepted. Booking flight #XY999...
          </div>
        )}
        {proposalStatus === 'rejected' && (
          <div className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm">
            <XCircle size={18} className="text-gray-500" /> Agent proposal dismissed. Keeping original flight.
          </div>
        )}

        {/* Timeline List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 overflow-hidden">
          {Object.entries(groupedActivities).map(([day, activities]) => (
            <div key={day} className="mb-10 last:mb-0">
              <h3 className="text-lg font-bold text-gray-800 mb-5 inline-block bg-gray-100 px-3.5 py-1.5 rounded-md shadow-sm border border-gray-200">{day}</h3>
              <div className="ml-4 border-l-2 border-indigo-100 space-y-6 pl-6 pt-1">
                {activities.map((act) => (
                  <div key={act.id} className="relative">
                    {/* Timeline Marker */}
                    <div className="absolute -left-[31px] top-1 w-[14px] h-[14px] rounded-full bg-indigo-500 border-[3px] border-white shadow-sm"></div>
                    
                    {/* Activity Card */}
                    <div className="bg-gray-50 border border-gray-200 p-4.5 rounded-xl hover:shadow-md hover:bg-white transition-all duration-300">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2 p-4">
                        <h4 className="font-bold text-gray-800 text-lg">{act.title}</h4>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded w-fit shadow-sm whitespace-nowrap">
                          {act.time}
                        </span>
                      </div>
                      <p className="text-[15px] text-gray-600 px-4 pb-4">{act.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
}
