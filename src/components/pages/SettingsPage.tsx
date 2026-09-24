import React, { useState } from 'react';
import { useEvent } from '../../context/EventContext';
import {
  Settings,
  RotateCcw,
  Sparkles,
  Sliders,
  Shield,
  Calendar,
  MapPin,
  Check,
  AlertTriangle,
  Play,
  Pause,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    resetToDefault,
    autoSimulateEnabled,
    toggleAutoSimulate,
    simulateNewRegistration,
    stats,
  } = useEvent();

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('Pink Polo 2026 Charity Invitational & Gala');
  const [eventVenue, setEventVenue] = useState('Ghantoot Racing & Polo Club, Abu Dhabi, UAE');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleBatchSimulate = () => {
    simulateNewRegistration();
    setTimeout(() => simulateNewRegistration(), 250);
    setTimeout(() => simulateNewRegistration(), 500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">System & Event Settings</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure event parameters, demo simulation controls, and reset prototype states.
          </p>
        </div>
      </div>

      {/* Demo Simulation Controls */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-rose-600" />
          <h3 className="text-sm font-bold text-slate-900">Prototype Demo Controls</h3>
        </div>
        <p className="text-xs text-slate-500">
          Control live attendee traffic simulation to demonstrate realistic system behavior to stakeholders.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Automated Simulation Toggle */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Automatic Registration Simulator
              </span>
              <span className="text-[11px] text-slate-500">
                Pushes a new mock registration every 13 seconds
              </span>
            </div>
            <button
              type="button"
              onClick={toggleAutoSimulate}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                autoSimulateEnabled
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              {autoSimulateEnabled ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Active</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Start</span>
                </>
              )}
            </button>
          </div>

          {/* Rapid Batch Push */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Batch Simulate (x3 Registrations)
              </span>
              <span className="text-[11px] text-slate-500">
                Instantly generates 3 VIP & Grandstand candidates
              </span>
            </div>
            <button
              type="button"
              onClick={handleBatchSimulate}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-rose-700 border border-rose-200 hover:bg-rose-50 transition-colors"
            >
              + Generate 3
            </button>
          </div>
        </div>

        {/* Reset State Section */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              Clear Local Data & Reset Database State
            </span>
            <span className="text-[11px] text-slate-500">
              Clears all cached registrations and resets attendee statistics to clean zero state.
            </span>
          </div>

          {!resetConfirmOpen ? (
            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear Database State</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-700 font-medium">Are you sure?</span>
              <button
                type="button"
                onClick={() => {
                  resetToDefault();
                  setResetConfirmOpen(false);
                }}
                className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Yes, Reset
              </button>
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Event Configuration Form */}
      <form onSubmit={handleSaveSettings} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-rose-600" />
          <h3 className="text-sm font-bold text-slate-900">Event Configuration</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Event Official Title
            </label>
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Venue Location
            </label>
            <input
              type="text"
              value={eventVenue}
              onChange={(e) => setEventVenue(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-rose-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {savedNotice ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <Check className="w-4 h-4 text-emerald-600" />
              Settings updated successfully
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">
              Prototype settings are stored in browser session
            </span>
          )}

          <button
            type="submit"
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-2xs"
          >
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
};
