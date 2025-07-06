"use client";

import { useAuth } from '../lib/hooks/useAuth';
import SignInWithGoogle from '../components/SignInWithGoogle';
import SankeyDiagram from '../components/SankeyDiagram';
import { useState, useEffect, useRef } from 'react';
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

// FallingStars background animation component
function FallingStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const numStars = 80;
    const stars = Array.from({ length: numStars }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.2 + 0.5,
      speed: Math.random() * 0.7 + 0.3,
      opacity: Math.random() * 0.5 + 0.5,
    }));

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    function update() {
      for (const star of stars) {
        star.y += star.speed;
        if (star.y > height) {
          star.y = -2;
          star.x = Math.random() * width;
        }
      }
    }

    function animate() {
      update();
      draw();
      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    function handleResize() {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
      aria-hidden="true"
    />
  );
}

// MorphingShape: morphs through 8 different polygons (triangle to decagon)
function MorphingShape() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId: number;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    // Generate polygons from 3 to 10 sides, all with 32 points for smooth morphing
    function makePolygon(sides: number, points: number) {
      return Array.from({ length: points }, (_, i) => {
        const angle = (2 * Math.PI * i) / points;
        // For points beyond the number of sides, repeat the last vertex
        const vertexIdx = Math.floor((i * sides) / points);
        const vertexAngle = (2 * Math.PI * vertexIdx) / sides - Math.PI / 2;
        return { x: Math.cos(vertexAngle), y: Math.sin(vertexAngle) };
      });
    }
    const points = 32;
    const polygons = Array.from({ length: 8 }, (_, i) => makePolygon(i + 3, points));

    let shapeIdx = 0;
    let nextIdx = 1;
    let morph = 0;
    let morphDir = 1;
    const morphSpeed = 0.012;

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t;
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      const size = Math.min(width, height) * 0.36;
      ctx.beginPath();
      for (let i = 0; i < points; i++) {
        const p1 = polygons[shapeIdx][i];
        const p2 = polygons[nextIdx][i];
        const x = lerp(p1.x, p2.x, morph) * size;
        const y = lerp(p1.y, p2.y, morph) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(34,197,94,0.7)'; // green-500 with opacity
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    function animate() {
      morph += morphDir * morphSpeed;
      if (morph >= 1) {
        morph = 0;
        shapeIdx = nextIdx;
        nextIdx = (nextIdx + 1) % polygons.length;
      }
      draw();
      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    function handleResize() {
      if (!canvas) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    />
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
        <h1 className="text-5xl font-extrabold text-black text-center mt-12 mb-2">Finualize</h1>
        <p className="text-xl text-center mb-8 text-gray-700">Extract P&amp;L data from QuickBooks screenshots and create interactive visualizations</p>
        <div className="mb-4 text-center text-lg font-medium text-gray-800">Welcome, {user.displayName} <span className="text-gray-500 text-base">{user.email}</span></div>
        <div className="w-full max-w-4xl mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Your Analyses</h2>
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
            <div className="text-center py-8 text-gray-700">Loading...</div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No analyses found. Create a new analysis to get started!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analyses.map(analysis => (
                <div key={analysis.id} className="bg-white rounded-xl shadow p-6 flex flex-col gap-2">
                  <div className="font-semibold text-lg text-gray-900">{analysis.name}</div>
                  <div className="text-gray-600 text-sm">Created: {new Date(analysis.createdAt).toLocaleString()}</div>
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
    <div className="min-h-screen bg-black flex flex-col relative p-4 overflow-hidden">
      <FallingStars />
      {/* Google Sign In Button - Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <SignInWithGoogle />
      </div>
      {/* Top Left Brand */}
      <div className="absolute top-6 left-6 z-40">
        <h1 className="text-3xl font-extrabold text-green-400 tracking-tight">Finualize</h1>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center w-full">
        {/* Title and Subtitle with Emoji */}
        <div className="mb-10 flex flex-col items-center w-full">
          <div className="flex items-center justify-center mb-4">
            <span className="text-2xl mr-2">🧮</span>
            <p className="text-2xl text-gray-100 font-medium text-center">P&L Data Extraction & Visualization</p>
          </div>
        </div>
        {/* Morphing shape animation with no background box */}
        <div className="w-full max-w-md h-32 flex items-center justify-center mb-8">
          <MorphingShape />
        </div>
        {/* Features Preview */}
        <div className="space-y-4 text-lg text-white font-medium text-center max-w-md mb-8">
          <div>✔️ AI-powered P&L data extraction</div>
          <div>✔️ Interactive data tables</div>
          <div>✔️ Custom visualizations & charts</div>
          <div>✔️ Sankey diagram generation</div>
        </div>
        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-400">
          <p>Powered by Next.js, Firebase & OpenAI</p>
        </div>
      </div>
    </div>
  );
}
