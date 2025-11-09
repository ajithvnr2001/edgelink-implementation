'use client';

/**
 * Import/Export Page (Week 5)
 * Bulk link management operations
 */

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL, getAuthHeaders } from '@/lib/api';

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    slug?: string;
    destination?: string;
    error: string;
  }>;
  imported_links: Array<{
    slug: string;
    destination: string;
    short_url: string;
  }>;
}

export default function ImportExportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');

  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportLoading, setExportLoading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportError('');
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setImportError('Please select a CSV file');
      return;
    }

    setImportLoading(true);
    setImportError('');

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch(`${API_URL}/api/import/links`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportResult(data);
    } catch (error: any) {
      setImportError(error.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportLinks = async () => {
    setExportLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/export/links?format=${exportFormat}`,
        {
          method: 'GET',
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `links-export-${Date.now()}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      alert('Export failed: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `destination,slug,domain,expires,utm_params,password
https://example.com,example-link,,2025-12-31T23:59:59Z,utm_source=newsletter&utm_medium=email,
https://example.com/product,product-page,,,utm_source=twitter,mypassword123
https://example.com/blog,,,,,`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-5xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold mb-2">Import & Export</h1>
          <p className="text-gray-400">Manage your links in bulk</p>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-lg mb-6">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 py-4 px-6 font-medium ${
                activeTab === 'import'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📥 Import Links
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 py-4 px-6 font-medium ${
                activeTab === 'export'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📤 Export Links
            </button>
          </div>
        </div>

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Import Instructions
              </h3>
              <ul className="space-y-2 text-sm text-blue-200">
                <li>• CSV file must have a "destination" or "url" column</li>
                <li>• Optional columns: slug, domain, expires, utm_params, password</li>
                <li>• Maximum 1000 links per import</li>
                <li>• Slugs must be unique (5-20 characters, alphanumeric and dashes)</li>
                <li>• Dates in ISO format (YYYY-MM-DDTHH:MM:SSZ)</li>
              </ul>
              <button
                onClick={downloadTemplate}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
              >
                Download CSV Template
              </button>
            </div>

            {/* File Upload */}
            <div className="bg-gray-800 rounded-lg p-6">
              <label className="block text-sm font-medium mb-4">Select CSV File</label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>

                {importFile ? (
                  <div>
                    <p className="text-white font-medium">{importFile.name}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {(importFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-white font-medium">Click to upload CSV file</p>
                    <p className="text-sm text-gray-400 mt-1">or drag and drop</p>
                  </div>
                )}
              </div>

              {importFile && (
                <button
                  onClick={handleImport}
                  disabled={importLoading}
                  className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold"
                >
                  {importLoading ? 'Importing...' : 'Import Links'}
                </button>
              )}
            </div>

            {/* Import Error */}
            {importError && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-300">
                {importError}
              </div>
            )}

            {/* Import Results */}
            {importResult && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="font-semibold mb-4">Import Results</h3>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-white">{importResult.total}</p>
                    <p className="text-sm text-gray-400">Total</p>
                  </div>
                  <div className="bg-green-900/30 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-500">{importResult.successful}</p>
                    <p className="text-sm text-gray-400">Successful</p>
                  </div>
                  <div className="bg-red-900/30 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-500">{importResult.failed}</p>
                    <p className="text-sm text-gray-400">Failed</p>
                  </div>
                </div>

                {/* Imported Links */}
                {importResult.imported_links.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3 text-green-500">✓ Successfully Imported</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {importResult.imported_links.slice(0, 10).map((link, index) => (
                        <div key={index} className="bg-gray-700 rounded p-3 text-sm">
                          <p className="text-white font-mono">{link.slug}</p>
                          <p className="text-gray-400 truncate">{link.destination}</p>
                        </div>
                      ))}
                      {importResult.imported_links.length > 10 && (
                        <p className="text-sm text-gray-400 text-center py-2">
                          and {importResult.imported_links.length - 10} more...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {importResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 text-red-500">✗ Errors</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="bg-red-900/20 border border-red-700 rounded p-3 text-sm">
                          <p className="text-red-300 font-medium">Row {error.row}</p>
                          <p className="text-gray-300">{error.error}</p>
                          {error.slug && (
                            <p className="text-gray-400 text-xs mt-1">Slug: {error.slug}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full mt-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            {/* Export Format */}
            <div className="bg-gray-800 rounded-lg p-6">
              <label className="block text-sm font-medium mb-4">Export Format</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`py-4 px-6 rounded-lg border-2 ${
                    exportFormat === 'csv'
                      ? 'border-blue-500 bg-blue-900/20 text-blue-500'
                      : 'border-gray-700 bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="text-3xl mb-2">📄</div>
                  <div className="font-semibold">CSV</div>
                  <div className="text-xs mt-1">Spreadsheet format</div>
                </button>
                <button
                  onClick={() => setExportFormat('json')}
                  className={`py-4 px-6 rounded-lg border-2 ${
                    exportFormat === 'json'
                      ? 'border-blue-500 bg-blue-900/20 text-blue-500'
                      : 'border-gray-700 bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="text-3xl mb-2">📋</div>
                  <div className="font-semibold">JSON</div>
                  <div className="text-xs mt-1">Developer format</div>
                </button>
              </div>
            </div>

            {/* Export Options */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Export All Links</h3>
              <p className="text-gray-400 text-sm mb-6">
                Download all your links with their settings and click counts
              </p>

              <button
                onClick={handleExportLinks}
                disabled={exportLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold"
              >
                {exportLoading ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
              </button>
            </div>

            {/* Export Info */}
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Export Information
              </h4>
              <ul className="space-y-2 text-sm text-blue-200">
                <li>• Includes all link details: slug, destination, domains, expiration, etc.</li>
                <li>• Password hashes are not included for security</li>
                <li>• Click counts and creation dates are included</li>
                <li>• CSV format is compatible with Excel and Google Sheets</li>
                <li>• JSON format includes structured data for developers</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
