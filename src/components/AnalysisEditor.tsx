import { useState, useEffect } from 'react';
import SankeyDiagram from './SankeyDiagram';

interface PLRow {
  label: string;
  value: string;
}

interface AnalysisData {
  id?: string;
  name: string;
  plRows: PLRow[];
}

interface AnalysisEditorProps {
  initialAnalysis?: AnalysisData;
  onSave?: (data: Omit<AnalysisData, 'id'>) => Promise<void>;
  isNew?: boolean;
  loading?: boolean;
  error?: string | null;
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
              <td className="px-4 py-2 text-gray-900">{row.source}</td>
              <td className="px-4 py-2 text-gray-900">{row.target}</td>
              <td className="px-4 py-2 text-gray-900">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalysisEditor({
  initialAnalysis,
  onSave,
  isNew = false,
  loading = false,
  error = null,
}: AnalysisEditorProps) {
  const [name, setName] = useState(initialAnalysis?.name || '');
  const [editingName, setEditingName] = useState(isNew);
  const [nameError, setNameError] = useState<string | null>(null);
  const [plRows, setPLRows] = useState<PLRow[]>(
    initialAnalysis?.plRows || [
      { label: 'Revenue', value: '' },
      { label: 'COGs', value: '' },
      { label: 'Operating Expenses', value: '' },
      { label: 'Net Profit', value: '' },
    ]
  );
  const [isEditingTable, setIsEditingTable] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAnalysis) {
      setName(initialAnalysis.name);
      setPLRows(initialAnalysis.plRows);
    }
  }, [initialAnalysis]);

  // Helper to auto-calculate Net Profit
  const getAutoNetProfit = (rows: PLRow[]) => {
    const revenue = parseFloat(rows[0]?.value) || 0;
    const cogs = parseFloat(rows[1]?.value) || 0;
    const opex = parseFloat(rows[2]?.value) || 0;
    return (revenue - cogs - opex).toString();
  };

  const handleTableValueChange = (idx: number, value: string) => {
    setPLRows((prev) => {
      const updated = prev.map((row, i) => i === idx ? { ...row, value } : row);
      // Always recalculate Net Profit (assume index 3)
      if (updated.length > 3) {
        updated[3] = { ...updated[3], value: getAutoNetProfit(updated) };
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setNameError(null);
    setTableError(null);
    if (!name.trim()) {
      setNameError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      if (onSave) {
        await onSave({ name: name.trim(), plRows });
      }
      setEditingName(false);
      setIsEditingTable(false);
    } catch (e) {
      setTableError('Failed to save analysis.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl flex flex-col items-center mt-12 mx-auto">
      <div className="flex flex-col items-center w-full mb-6">
        {editingName ? (
          <div className="flex flex-col items-center w-full">
            <input
              className="text-4xl font-bold text-center mb-2 border-b-2 border-blue-400 focus:outline-none bg-transparent w-full max-w-md text-black"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={saving || loading}
              maxLength={64}
              autoFocus
              placeholder="Enter analysis name"
            />
            <div className="flex gap-2 mt-2">
              <button
                className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 transition"
                onClick={handleSave}
                disabled={saving || loading}
              >
                {saving || loading ? 'Saving...' : 'Save'}
              </button>
              {!isNew && (
                <button
                  className="bg-gray-400 text-white px-4 py-1 rounded hover:bg-gray-500 transition"
                  onClick={() => { setEditingName(false); setName(initialAnalysis?.name || ''); setNameError(null); }}
                  disabled={saving || loading}
                >Cancel</button>
              )}
            </div>
            {nameError && <div className="text-red-600 mt-2 text-sm">{nameError}</div>}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-center mb-0 text-black">{name}</h1>
            <button
              className="ml-2 text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 bg-blue-50"
              onClick={() => setEditingName(true)}
              title="Edit name"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m2-2l-6 6m2-2l6-6" /></svg>
            </button>
          </div>
        )}
      </div>
      <div className="w-full bg-white rounded-xl shadow p-6 flex flex-col items-center">
        <div className="flex items-center w-full mb-4">
          <h2 className="text-xl font-semibold mr-2 text-black">P&amp;L Table</h2>
          {!isEditingTable && (
            <button
              className="ml-2 text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 bg-blue-50"
              onClick={() => setIsEditingTable(true)}
              title="Edit table"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m2-2l-6 6m2-2l6-6" /></svg>
            </button>
          )}
        </div>
        <table className="min-w-full bg-white rounded-xl shadow overflow-hidden">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left text-black">Item</th>
              <th className="px-4 py-2 text-left text-black">Value</th>
            </tr>
          </thead>
          <tbody>
            {isEditingTable ? (
              plRows.map((row, idx) => (
                <tr key={row.label}>
                  <td className="px-4 py-2 font-medium text-gray-900">{row.label}</td>
                  <td className="px-4 py-2 text-gray-900">
                    {idx < 3 ? (
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-24"
                        value={row.value}
                        onChange={e => handleTableValueChange(idx, e.target.value)}
                        disabled={saving || loading}
                      />
                    ) : (
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-24 bg-gray-100 text-gray-500"
                        value={getAutoNetProfit(plRows)}
                        disabled
                      />
                    )}
                  </td>
                </tr>
              ))
            ) : (
              plRows.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-2 font-medium text-gray-900">{row.label}</td>
                  <td className="px-4 py-2 text-gray-900">{row.value}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {isEditingTable && (
          <div className="flex gap-2 mt-4">
            <button
              className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 transition"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving || loading ? 'Saving...' : 'Save'}
            </button>
            {!isNew && (
              <button
                className="bg-gray-400 text-white px-4 py-1 rounded hover:bg-gray-500 transition"
                onClick={() => { setIsEditingTable(false); setPLRows(initialAnalysis?.plRows || plRows); setTableError(null); }}
                disabled={saving || loading}
              >Cancel</button>
            )}
          </div>
        )}
        {tableError && <div className="text-red-600 mt-2 text-sm">{tableError}</div>}
        {/* Flow Data Table for Sankey Diagram */}
        {Array.isArray(plRows) && plRows.length >= 4 && (
          <div className="flex flex-col items-center w-full">
            <FlowDataTable
              flows={[
                { source: 'Revenue', target: 'COGs', value: plRows[1]?.value || '0' },
                { source: 'Revenue', target: 'Operating Expenses', value: plRows[2]?.value || '0' },
                { source: 'Revenue', target: 'Net Profit', value: (
                  (parseFloat(plRows[0]?.value) || 0) - (parseFloat(plRows[1]?.value) || 0) - (parseFloat(plRows[2]?.value) || 0)
                ).toString() },
              ]}
            />
            <div className="w-full max-w-2xl mx-auto mt-8 flex flex-col items-center">
              <h2 className="text-xl font-semibold text-black mb-2">Sankey Diagram</h2>
              <SankeyDiagram
                data={{
                  nodes: [
                    { name: 'Revenue' },
                    { name: 'COGs' },
                    { name: 'Operating Expenses' },
                    { name: 'Net Profit' },
                  ],
                  links: [
                    { source: 'Revenue', target: 'COGs', value: parseFloat(plRows[1]?.value) || 0 },
                    { source: 'Revenue', target: 'Operating Expenses', value: parseFloat(plRows[2]?.value) || 0 },
                    { source: 'Revenue', target: 'Net Profit', value: (
                      (parseFloat(plRows[0]?.value) || 0) - (parseFloat(plRows[1]?.value) || 0) - (parseFloat(plRows[2]?.value) || 0)
                    ) },
                  ],
                }}
                width={600}
                height={320}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 