/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Lock,
  LogOut,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AssetFormModal,
  AssignmentFormModal,
  MaintenanceFormModal,
} from './components/AssetDialogs.tsx';
import {ConfirmDialog} from './components/ConfirmDialog.tsx';
import {OfflineIndicator} from './components/OfflineIndicator.tsx';
import {PWAInstallButton} from './components/PWAInstallButton.tsx';
import type {ActiveTab, Asset, InventoryData} from './types.ts';

const TOKEN_KEY = 'pedo_pmo_session_token';

async function apiFetch<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...opts,
    credentials: 'include',
    headers,
  });

  let payload: Record<string, unknown> = {};
  try {
    payload = (await res.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (!res.ok) {
    throw new Error(
      typeof payload.error === 'string' ? payload.error : 'Request failed',
    );
  }
  return payload as T;
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], {type: mimeType}));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function statusClass(status: string): string {
  switch (status) {
    case 'Available':
      return 'text-emerald-700';
    case 'In Use':
      return 'text-[#176b9a]';
    case 'Under Maintenance':
      return 'text-amber-700';
    case 'Disposed':
      return 'text-slate-500';
    default:
      return 'text-[#193246]';
  }
}

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [data, setData] = useState<InventoryData>({
    assets: [],
    assignments: [],
    maintenance: [],
  });
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('assets');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const refreshData = useCallback(async () => {
    setLoadingData(true);
    try {
      const next = await apiFetch<InventoryData>('/api/data');
      setData(next);
    } catch (err) {
      if (err instanceof Error && err.message === 'Authentication required') {
        sessionStorage.removeItem(TOKEN_KEY);
        setAuthenticated(false);
      } else {
        showToast(
          err instanceof Error ? err.message : 'Failed to load inventory',
        );
      }
    } finally {
      setLoadingData(false);
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch<{authenticated: boolean}>('/api/session');
        if (!active) return;
        setAuthenticated(Boolean(res.authenticated));
        if (res.authenticated) {
          await refreshData();
        }
      } catch {
        if (active) setAuthenticated(false);
      } finally {
        if (active) setAuthChecked(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await apiFetch<{authenticated: boolean; token?: string}>(
        '/api/login',
        {
          method: 'POST',
          body: JSON.stringify({password}),
        },
      );
      if (res.token) {
        sessionStorage.setItem(TOKEN_KEY, res.token);
      }
      setPassword('');
      setAuthenticated(true);
      await refreshData();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/logout', {method: 'POST'});
    } catch {
      // Ignore logout network error
    }
    sessionStorage.removeItem(TOKEN_KEY);
    setAuthenticated(false);
    setData({assets: [], assignments: [], maintenance: []});
  };

  const stats = useMemo(() => {
    const assets = data.assets;
    return {
      total: assets.length,
      available: assets.filter((x) => x.status === 'Available').length,
      inUse: assets.filter((x) => x.status === 'In Use').length,
      maintenance: assets.filter((x) => x.status === 'Under Maintenance')
        .length,
    };
  }, [data.assets]);

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.assets.filter((x) => {
      const matchesStatus =
        statusFilter === 'All' || x.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return [x.name, x.code, x.serial, x.custodian, x.location, x.category]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [data.assets, searchQuery, statusFilter]);

  const handleSaveAsset = async (asset: Asset) => {
    await apiFetch('/api/assets', {
      method: 'POST',
      body: JSON.stringify(asset),
    });
    await refreshData();
    showToast('Asset saved');
  };

  const handleDeleteAsset = (asset: Asset) => {
    setConfirmState({
      open: true,
      title: 'Delete asset',
      description: `Remove "${asset.name}" (${asset.code}) from the office register? This action cannot be undone.`,
      confirmLabel: 'Delete asset',
      danger: true,
      onConfirm: async () => {
        await apiFetch(`/api/assets/${asset.id}`, {method: 'DELETE'});
        await refreshData();
        showToast('Asset deleted');
      },
    });
  };

  const handleCreateAssignment = async (payload: {
    id: string;
    asset_id: string;
    person: string;
    department: string;
    issue_date: string;
    due_date: string;
    notes: string;
  }) => {
    await apiFetch('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await refreshData();
    showToast('Asset assigned');
  };

  const handleReturnAssignment = (assignmentId: string, assetName: string) => {
    setConfirmState({
      open: true,
      title: 'Confirm asset return',
      description: `Mark "${assetName}" as returned and set its status back to Available?`,
      confirmLabel: 'Record return',
      onConfirm: async () => {
        await apiFetch(`/api/assignments/${assignmentId}/return`, {
          method: 'POST',
        });
        await refreshData();
        showToast('Return recorded');
      },
    });
  };

  const handleCreateMaintenance = async (payload: {
    id: string;
    asset_id: string;
    date: string;
    type: string;
    provider: string;
    cost: number;
    notes: string;
    set_under_maintenance: boolean;
  }) => {
    await apiFetch('/api/maintenance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await refreshData();
    showToast('Maintenance record saved');
  };

  const handleExportCsv = () => {
    const cols: (keyof Asset)[] = [
      'name',
      'code',
      'category',
      'serial',
      'purchase_date',
      'value',
      'location',
      'condition',
      'status',
      'custodian',
      'remarks',
    ];
    const rows = [
      cols.join(','),
      ...data.assets.map((asset) =>
        cols
          .map(
            (key) =>
              `"${String(asset[key] ?? '').replaceAll('"', '""')}"`,
          )
          .join(','),
      ),
    ];
    downloadFile(
      'PEDO_PMO_Assets.csv',
      `\uFEFF${rows.join('\n')}`,
      'text/csv;charset=utf-8',
    );
    showToast('CSV exported');
  };

  const handleDownloadBackup = async () => {
    try {
      const backup = await apiFetch<Record<string, unknown>>('/api/backup');
      downloadFile(
        `PEDO_PMO_Shared_Backup_${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(backup, null, 2),
        'application/json',
      );
      showToast('Backup downloaded');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Backup failed');
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as InventoryData;
      if (
        !Array.isArray(parsed.assets) ||
        !Array.isArray(parsed.assignments) ||
        !Array.isArray(parsed.maintenance)
      ) {
        showToast('Invalid JSON backup structure');
        return;
      }

      setConfirmState({
        open: true,
        title: 'Restore shared backup',
        description: `Replace all shared records with ${parsed.assets.length} assets, ${parsed.assignments.length} assignments, and ${parsed.maintenance.length} maintenance logs from "${file.name}"?`,
        confirmLabel: 'Restore backup',
        danger: true,
        onConfirm: async () => {
          await apiFetch('/api/restore', {
            method: 'POST',
            body: JSON.stringify(parsed),
          });
          await refreshData();
          showToast('Backup restored');
        },
      });
    } catch {
      showToast('Could not parse backup JSON file');
    }
  };

  const runConfirm = async () => {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      await confirmState.onConfirm();
      setConfirmState(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setConfirmBusy(false);
    }
  };

  const tabs: {id: ActiveTab; label: string}[] = [
    {id: 'assets', label: 'Asset Register'},
    {id: 'assignments', label: 'Assignments'},
    {id: 'maintenance', label: 'Maintenance'},
    {id: 'backup', label: 'Backup'},
  ];

  return (
    <div className="min-h-screen bg-[#f3f6f9] text-[#193246]">
      <header className="sticky top-0 z-30 border-b border-[#0d2b45] bg-[#123b5d] text-white">
        <div className="mx-auto flex h-16 max-w-[1250px] items-center justify-between gap-8 px-5">
          <span className="text-lg font-bold tracking-tight whitespace-nowrap shrink-0">
            PEDO PMO
          </span>

          {authenticated && (
            <nav
              aria-label="Primary sections"
              className="hidden md:flex items-center gap-6"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                    activeTab === tab.id
                      ? 'border-white text-white'
                      : 'border-transparent text-white/75 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3 shrink-0">
            <PWAInstallButton />
            {authenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1250px] px-5 py-8">
        {!authChecked ? (
          <div className="mx-auto mt-16 max-w-md rounded-xl border border-[#e2e9ee] bg-white p-8">
            <div className="h-6 w-44 animate-pulse rounded bg-[#edf2f5]" />
            <div className="mt-3 h-4 w-64 animate-pulse rounded bg-[#edf2f5]" />
            <div className="mt-6 h-10 w-full animate-pulse rounded-lg bg-[#edf2f5]" />
          </div>
        ) : !authenticated ? (
          <section className="mx-auto mt-12 max-w-md rounded-xl border border-[#e2e9ee] bg-white p-7 shadow-xs">
            <div className="flex items-center gap-2.5 text-[#123b5d]">
              <Lock className="h-5 w-5" aria-hidden="true" />
              <h1 className="text-xl font-bold tracking-tight">
                Office Asset Register
              </h1>
            </div>
            <p className="mt-2 text-sm text-[#617381]">
              Sign in with the shared PEDO PMO office access password.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div className="relative">
                <label className="sr-only" htmlFor="office-password">
                  Office password
                </label>
                <input
                  id="office-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Office password"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-[#d6e0e7] bg-white py-2.5 pr-10 pl-3.5 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2.5 flex items-center text-[#72828e] hover:text-[#193246] cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {loginError && (
                <p role="alert" className="text-xs font-medium text-[#b43d3d]">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full rounded-lg bg-[#176b9a] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#145d86] disabled:opacity-50 cursor-pointer"
              >
                {loggingIn ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </section>
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#123b5d]">
                  Asset Dashboard
                </h1>
                
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingAsset(null);
                  setAssetModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#176b9a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#145d86] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Asset
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              <div className="rounded-xl border border-[#e2e9ee] bg-white p-5">
                <span className="text-xs font-medium text-[#617381]">
                  Total assets
                </span>
                <div className="mt-2 font-mono text-3xl font-semibold tabular-nums text-[#123b5d]">
                  {stats.total}
                </div>
              </div>
              <div className="rounded-xl border border-[#e2e9ee] bg-white p-5">
                <span className="text-xs font-medium text-[#617381]">
                  Available
                </span>
                <div className="mt-2 font-mono text-3xl font-semibold tabular-nums text-emerald-700">
                  {stats.available}
                </div>
              </div>
              <div className="rounded-xl border border-[#e2e9ee] bg-white p-5">
                <span className="text-xs font-medium text-[#617381]">
                  In use
                </span>
                <div className="mt-2 font-mono text-3xl font-semibold tabular-nums text-[#176b9a]">
                  {stats.inUse}
                </div>
              </div>
              <div className="rounded-xl border border-[#e2e9ee] bg-white p-5">
                <span className="text-xs font-medium text-[#617381]">
                  Maintenance
                </span>
                <div className="mt-2 font-mono text-3xl font-semibold tabular-nums text-amber-700">
                  {stats.maintenance}
                </div>
              </div>
            </div>

            {/* Mobile section tabs */}
            <div className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-1 md:hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#123b5d] text-white'
                      : 'bg-[#e7edf2] text-[#516879]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'assets' && (
              <section className="mt-6 rounded-xl border border-[#e2e9ee] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="relative min-w-[220px] flex-1 max-w-sm">
                      <Search
                        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#72828e]"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search assets, code, custodian…"
                        className="w-full rounded-lg border border-[#d6e0e7] bg-white py-2 pr-3 pl-9 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
                      />
                    </div>

                    <div
                      role="group"
                      aria-label="Filter by status"
                      className="flex items-center gap-1 rounded-lg bg-[#f3f6f9] p-1"
                    >
                      {[
                        'All',
                        'Available',
                        'In Use',
                        'Under Maintenance',
                        'Disposed',
                      ].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStatusFilter(status)}
                          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            statusFilter === status
                              ? 'bg-white text-[#123b5d] shadow-xs'
                              : 'text-[#617381] hover:text-[#193246]'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#d8e1e8] bg-[#edf2f5] px-3.5 py-2 text-xs font-semibold text-[#365064] transition-colors hover:bg-[#e1e9ee] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FileSpreadsheet
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto border-t border-[#edf1f4]">
                  {loadingData && data.assets.length === 0 ? (
                    <div className="space-y-2 py-4">
                      {[1, 2, 3].map((row) => (
                        <div
                          key={row}
                          className="h-11 w-full animate-pulse rounded bg-[#f3f6f9]"
                        />
                      ))}
                    </div>
                  ) : filteredAssets.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm font-medium text-[#365064]">
                        {data.assets.length === 0
                          ? 'No assets registered yet.'
                          : 'No assets match your current search or filter.'}
                      </p>
                      <p className="mt-1 text-xs text-[#72828e]">
                        {data.assets.length === 0
                          ? 'Add your first office asset to begin tracking inventory, custodians, and maintenance.'
                          : 'Try clearing the search query or switching back to All statuses.'}
                      </p>
                      {data.assets.length === 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAsset(null);
                            setAssetModalOpen(true);
                          }}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#176b9a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#145d86] cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add first asset
                        </button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full min-w-[780px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[#edf1f4] bg-[#f8fafb] text-[11px] font-semibold uppercase tracking-wide text-[#72828e]">
                          <th className="px-3 py-3">Asset / Code</th>
                          <th className="px-3 py-3">Category</th>
                          <th className="px-3 py-3">Location</th>
                          <th className="px-3 py-3">Custodian</th>
                          <th className="px-3 py-3">Condition</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3 text-right">Value (PKR)</th>
                          <th className="px-3 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#edf1f4] text-[13px]">
                        {filteredAssets.map((asset) => (
                          <tr
                            key={asset.id}
                            className="transition-colors hover:bg-[#f8fafc]"
                          >
                            <td className="px-3 py-3">
                              <div className="font-semibold text-[#123b5d]">
                                {asset.name}
                              </div>
                              <div className="font-mono text-xs text-[#617381]">
                                {asset.code}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-[#365064]">
                              {asset.category}
                            </td>
                            <td className="px-3 py-3 text-[#365064]">
                              {asset.location || '—'}
                            </td>
                            <td className="px-3 py-3 text-[#365064]">
                              {asset.custodian || '—'}
                            </td>
                            <td className="px-3 py-3 text-[#365064]">
                              {asset.condition}
                            </td>
                            <td
                              className={`px-3 py-3 font-medium ${statusClass(asset.status)}`}
                            >
                              {asset.status}
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-[#193246]">
                              {Number(asset.value || 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAsset(asset);
                                  setAssetModalOpen(true);
                                }}
                                className="mr-3 text-xs font-semibold text-[#176b9a] hover:underline cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAsset(asset)}
                                className="text-xs font-semibold text-[#b43d3d] hover:underline cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'assignments' && (
              <section className="mt-6 rounded-xl border border-[#e2e9ee] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
                  <h2 className="text-base font-semibold text-[#123b5d]">
                    Assignment history
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        data.assets.filter((a) => a.status !== 'Disposed')
                          .length === 0
                      ) {
                        showToast('Add an active asset first');
                        return;
                      }
                      setAssignmentModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#176b9a] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#145d86] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Assign asset
                  </button>
                </div>

                <div className="overflow-x-auto border-t border-[#edf1f4]">
                  {data.assignments.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm font-medium text-[#365064]">
                        No asset assignments recorded.
                      </p>
                      <p className="mt-1 text-xs text-[#72828e]">
                        Issue an office asset to an employee or section to track
                        custody and return dates.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full min-w-[720px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[#edf1f4] bg-[#f8fafb] text-[11px] font-semibold uppercase tracking-wide text-[#72828e]">
                          <th className="px-3 py-3">Asset</th>
                          <th className="px-3 py-3">Custodian</th>
                          <th className="px-3 py-3">Section</th>
                          <th className="px-3 py-3">Issue date</th>
                          <th className="px-3 py-3">Due date</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#edf1f4] text-[13px]">
                        {data.assignments.map((item) => (
                          <tr
                            key={item.id}
                            className="transition-colors hover:bg-[#f8fafc]"
                          >
                            <td className="px-3 py-3">
                              <div className="font-semibold text-[#123b5d]">
                                {item.asset_name}
                              </div>
                              <div className="font-mono text-xs text-[#617381]">
                                {item.asset_code}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-[#365064]">
                              {item.person}
                            </td>
                            <td className="px-3 py-3 text-[#365064]">
                              {item.department || '—'}
                            </td>
                            <td className="px-3 py-3 font-mono text-xs tabular-nums text-[#365064]">
                              {item.issue_date}
                            </td>
                            <td className="px-3 py-3 font-mono text-xs tabular-nums text-[#365064]">
                              {item.due_date || '—'}
                            </td>
                            <td
                              className={`px-3 py-3 font-medium ${
                                item.returned
                                  ? 'text-emerald-700'
                                  : 'text-[#176b9a]'
                              }`}
                            >
                              {item.returned ? 'Returned' : 'Issued'}
                            </td>
                            <td className="px-3 py-3 text-right">
                              {!item.returned && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReturnAssignment(
                                      item.id,
                                      item.asset_name,
                                    )
                                  }
                                  className="text-xs font-semibold text-[#176b9a] hover:underline cursor-pointer"
                                >
                                  Return
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'maintenance' && (
              <section className="mt-6 rounded-xl border border-[#e2e9ee] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
                  <h2 className="text-base font-semibold text-[#123b5d]">
                    Maintenance history
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        data.assets.filter((a) => a.status !== 'Disposed')
                          .length === 0
                      ) {
                        showToast('Add an active asset first');
                        return;
                      }
                      setMaintenanceModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#176b9a] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#145d86] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add record
                  </button>
                </div>

                <div className="overflow-x-auto border-t border-[#edf1f4]">
                  {data.maintenance.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm font-medium text-[#365064]">
                        No maintenance records logged.
                      </p>
                      <p className="mt-1 text-xs text-[#72828e]">
                        Log repairs, inspections, or preventive maintenance
                        performed on office assets.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full min-w-[720px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[#edf1f4] bg-[#f8fafb] text-[11px] font-semibold uppercase tracking-wide text-[#72828e]">
                          <th className="px-3 py-3">Asset</th>
                          <th className="px-3 py-3">Date</th>
                          <th className="px-3 py-3">Type</th>
                          <th className="px-3 py-3">Provider</th>
                          <th className="px-3 py-3 text-right">Cost (PKR)</th>
                          <th className="px-3 py-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#edf1f4] text-[13px]">
                        {data.maintenance.map((item) => (
                          <tr
                            key={item.id}
                            className="transition-colors hover:bg-[#f8fafc]"
                          >
                            <td className="px-3 py-3">
                              <div className="font-semibold text-[#123b5d]">
                                {item.asset_name}
                              </div>
                              <div className="font-mono text-xs text-[#617381]">
                                {item.asset_code}
                              </div>
                            </td>
                            <td className="px-3 py-3 font-mono text-xs tabular-nums text-[#365064]">
                              {item.date}
                            </td>
                            <td className="px-3 py-3 text-[#365064]">
                              {item.type}
                            </td>
                            <td className="px-3 py-3 text-[#365064]">
                              {item.provider || '—'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-[#193246]">
                              {Number(item.cost || 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-[#365064]">
                              {item.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'backup' && (
              <section className="mt-6 rounded-xl border border-[#e2e9ee] bg-white p-6">
                <h2 className="text-base font-semibold text-[#123b5d]">
                  Database backup
                </h2>
                <p className="mt-1.5 max-w-xl text-sm text-[#617381]">
                  Download a complete JSON snapshot of the shared office
                  database or restore records from a previous export.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#176b9a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#145d86] cursor-pointer"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download JSON backup
                  </button>

                  <label className="inline-flex items-center gap-2 rounded-lg border border-[#d8e1e8] bg-[#edf2f5] px-4 py-2.5 text-sm font-semibold text-[#365064] transition-colors hover:bg-[#e1e9ee] cursor-pointer">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Restore JSON backup
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleRestoreFile}
                      className="sr-only"
                    />
                  </label>
                </div>

                <p className="mt-4 text-xs text-[#72828e]">
                  Restoring replaces all shared asset, assignment, and
                  maintenance records for every user.
                </p>
              </section>
            )}
          </div>
        )}
      </main>

      <AssetFormModal
        open={assetModalOpen}
        initialAsset={editingAsset}
        onClose={() => setAssetModalOpen(false)}
        onSave={handleSaveAsset}
      />

      <AssignmentFormModal
        open={assignmentModalOpen}
        assets={data.assets}
        onClose={() => setAssignmentModalOpen(false)}
        onSave={handleCreateAssignment}
      />

      <MaintenanceFormModal
        open={maintenanceModalOpen}
        assets={data.assets}
        onClose={() => setMaintenanceModalOpen(false)}
        onSave={handleCreateMaintenance}
      />

      <ConfirmDialog
        open={Boolean(confirmState?.open)}
        title={confirmState?.title || ''}
        description={confirmState?.description || ''}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
        busy={confirmBusy}
        onConfirm={runConfirm}
        onCancel={() => setConfirmState(null)}
      />

      {toast && (
        <div
          role="status"
          className="fixed right-5 bottom-5 z-50 rounded-lg bg-[#123b5d] px-4 py-2.5 text-xs font-semibold text-white shadow-lg"
        >
          {toast}
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
