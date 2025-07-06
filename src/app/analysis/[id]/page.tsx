"use client";

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAnalysisById, updateDocument } from '../../../lib/firebase/firebaseUtils';
import Link from 'next/link';
import { useAuth } from '../../../lib/hooks/useAuth';
import SankeyDiagram from '../../../components/SankeyDiagram';
import AnalysisEditor from '../../../components/AnalysisEditor';

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

export default function AnalysisDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getAnalysisById(id as string).then((doc) => {
      if (!doc) {
        setError('Analysis not found.');
        setLoading(false);
        return;
      }
      if ((doc as any).userId !== user.uid) {
        setError('You are not authorized to view this analysis.');
        setLoading(false);
        return;
      }
      setAnalysis(doc);
      setLoading(false);
    });
  }, [id, user]);

  const handleSave = async (data: { name: string; plRows: any[] }) => {
    if (!analysis) return;
    await updateDocument('analyses', analysis.id, data);
    setAnalysis({ ...analysis, ...data });
  };

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  }
  if (!analysis) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center px-2 pb-12 justify-center">
      <AnalysisEditor
        initialAnalysis={analysis}
        onSave={handleSave}
        isNew={false}
      />
      <Link href="/" className="mt-8 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">Back to Home</Link>
    </div>
  );
} 