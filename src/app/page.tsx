"use client";

import { useAuth } from '../lib/hooks/useAuth';
import SignInWithGoogle from '../components/SignInWithGoogle';
import SankeyDiagram from '../components/SankeyDiagram';
import { useState, useEffect } from 'react';
import { addDocument, getDocuments, getUserAnalyses, logoutUser } from '../lib/firebase/firebaseUtils';
import Link from 'next/link';

interface SankeyData {
  nodes: { name: string }[];
  links: { source: string; target: string; value: number }[];
}

function PLTable({ plRows, setPLRows }: { plRows: { label: string; value: string }[]; setPLRows: (rows: { label: string; value: string }[]) => void }) {
  const handlePLChange = (idx: number, value: string) => {
    // Prevent editing Net Profit
    if (idx === 3) return;
    setPLRows(plRows.map((row, i) => i === idx ? { ...row, value } : row));
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 mb-8">
      <h2 className="text-xl font-semibold text-black mb-2">P&amp;L Table</h2>
      <table className="min-w-full bg-white rounded-xl shadow overflow-hidden">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left text-black">Item</th>
            <th className="px-4 py-2 text-left text-black">Value</th>
          </tr>
        </thead>
        <tbody>
          {plRows.map((row, idx) => (
            <tr key={row.label}>
              <td className="px-4 py-2 font-medium text-black">{row.label}</td>
              <td className="px-4 py-2">
                <input
                  className="w-full border rounded px-2 py-1 text-black"
                  value={row.value}
                  onChange={e => handlePLChange(idx, e.target.value)}
                  placeholder={`Enter ${row.label}`}
                  type="number"
                  step="0.01"
                  disabled={idx === 3}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlowDataTable({ flows }: { flows: { source: string; target: string; value: string }[] }) {
  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-black mb-2">Flow Data for Sankey Diagram</h2>
        <p className="text-sm text-gray-600 mb-4">
          This table is auto-generated from your P&amp;L data and visualized below.
        </p>
      </div>
      <table className="min-w-full bg-white rounded-xl shadow overflow-hidden">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left text-black">Source</th>
            <th className="px-4 py-2 text-left text-black">Target</th>
            <th className="px-4 py-2 text-left text-black">Value</th>
          </tr>
        </thead>
        <tbody>
          {flows.map((row, idx) => (
            <tr key={idx}>
              <td className="px-4 py-2">{row.source}</td>
              <td className="px-4 py-2">{row.target}</td>
              <td className="px-4 py-2">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const [plRows, setPLRows] = useState([
    { label: 'Revenue', value: '' },
    { label: 'COGs', value: '' },
    { label: 'Operating Expenses', value: '' },
    { label: 'Net Profit', value: '' },
  ]);
  const [finalized, setFinalized] = useState(false);
  const [analysisName, setAnalysisName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(false);

  // Auto-calculate Net Profit
  const revenue = parseFloat(plRows[0].value) || 0;
  const cogs = parseFloat(plRows[1].value) || 0;
  const opEx = parseFloat(plRows[2].value) || 0;
  const netProfit = revenue - cogs - opEx;

  // Update Net Profit in P&L table (not editable)
  if (plRows[3].value !== netProfit.toString()) {
    setTimeout(() => {
      setPLRows(rows => rows.map((row, i) => i === 3 ? { ...row, value: netProfit.toString() } : row));
    }, 0);
  }

  // Generate flows from P&L (Revenue is only a source)
  const flows = [
    { source: 'Revenue', target: 'COGs', value: plRows[1].value || '0' },
    { source: 'Revenue', target: 'Operating Expenses', value: plRows[2].value || '0' },
    { source: 'Revenue', target: 'Net Profit', value: netProfit.toString() },
  ];

  // Sankey expects nodes and links
  const sankeyData = {
    nodes: [
      { name: 'Revenue' },
      { name: 'COGs' },
      { name: 'Operating Expenses' },
      { name: 'Net Profit' },
    ],
    links: flows.map(f => ({ source: f.source, target: f.target, value: parseFloat(f.value) || 0 })),
  };

  useEffect(() => {
    if (!user) return;
    setAnalysesLoading(true);
    getUserAnalyses(user.uid).then(docs => {
      setAnalyses(docs);
      setAnalysesLoading(false);
    });
  }, [user]);

  async function handleSave() {
    if (!user) return;
    // Validation
    if (!analysisName.trim()) {
      setSaveStatus('error');
      alert('Analysis name is required.');
      return;
    }
    if (plRows.some(row => row.value === '' || isNaN(Number(row.value)))) {
      setSaveStatus('error');
      alert('All P&L values must be filled and valid numbers.');
      return;
    }
    const data = {
      userId: user.uid,
      name: analysisName,
      plRows,
      createdAt: new Date().toISOString(),
    };
    console.log('Saving analysis:', data);
    setSaveStatus('saving');
    try {
      await addDocument('analyses', data);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
      alert('Error saving analysis. See console for details.');
      console.error('Firestore save error:', e);
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center px-2 pb-12 relative">
        {/* Sign Out Button */}
        <button
          onClick={async () => {
            await logoutUser();
            window.location.reload();
          }}
          className="absolute top-6 right-6 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded shadow transition z-50"
        >
          Sign Out
        </button>
        <h1 className="text-5xl font-extrabold text-center mt-12 mb-2">Finualize</h1>
        <p className="text-xl text-center mb-8">Extract P&amp;L data from QuickBooks screenshots and create interactive visualizations</p>
        <div className="mb-4 text-center text-lg font-medium">Welcome, {user.displayName} <span className="text-gray-500 text-base">{user.email}</span></div>
        <div className="w-full max-w-4xl mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Your Analyses</h2>
            <button
              disabled={loading || !user || !user.uid}
              onClick={async () => {
                if (!user || !user.uid) return;
                try {
                  const docRef = await addDocument('analyses', {
                    userId: user.uid,
                    name: 'Untitled',
                    plRows: [
                      { label: 'Revenue', value: '' },
                      { label: 'COGs', value: '' },
                      { label: 'Operating Expenses', value: '' },
                      { label: 'Net Profit', value: '' },
                    ],
                    createdAt: new Date().toISOString(),
                  });
                  window.location.href = `/analysis/${docRef.id}`;
                } catch (e) {
                  console.error('Error creating analysis:', e);
                  alert('Failed to create analysis. Please try again.');
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow transition text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + New Analysis
            </button>
          </div>
          {analysesLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No analyses found. Create a new analysis to get started!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analyses.map(analysis => (
                <div key={analysis.id} className="bg-white rounded-xl shadow p-6 flex flex-col gap-2">
                  <div className="font-semibold text-lg">{analysis.name}</div>
                  <div className="text-gray-500 text-sm">Created: {new Date(analysis.createdAt).toLocaleString()}</div>
                  <Link href={`/analysis/${analysis.id}`} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-center w-fit">View / Edit</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Login Page
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-black mb-2">Finualize</h1>
          <p className="text-lg text-black">
            P&L Data Extraction & Visualization
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-black mb-2">
              Welcome Back
            </h2>
            <p className="text-black">
              Sign in to access your P&amp;L data and visualizations
            </p>
          </div>

          {/* Google Sign In Button */}
          <div className="mb-6">
            <SignInWithGoogle />
          </div>

          {/* Features Preview */}
          <div className="space-y-3 text-sm text-black">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              AI-powered P&L data extraction
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Interactive data tables
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Custom visualizations & charts
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Sankey diagram generation
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-black">
          <p>Powered by Next.js, Firebase & OpenAI</p>
        </div>
      </div>
    </div>
  );
}
