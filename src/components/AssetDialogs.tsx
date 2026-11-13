import {X} from 'lucide-react';
import React, {useEffect, useState} from 'react';
import type {Asset} from '../types.ts';

interface AssetFormModalProps {
  open: boolean;
  initialAsset: Asset | null;
  onClose: () => void;
  onSave: (asset: Asset) => Promise<void>;
}

const CATEGORIES = [
  'IT Equipment',
  'Furniture',
  'Office Equipment',
  'Vehicle',
  'Electrical',
  'Machinery',
  'Other',
];

const CONDITIONS = ['Good', 'Fair', 'Poor', 'Damaged'];
const STATUSES = ['Available', 'In Use', 'Under Maintenance', 'Disposed'];

function createEmptyAsset(): Asset {
  return {
    id: '',
    name: '',
    code: '',
    category: 'IT Equipment',
    serial: '',
    purchase_date: '',
    value: 0,
    location: '',
    condition: 'Good',
    status: 'Available',
    custodian: '',
    remarks: '',
  };
}

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  open,
  initialAsset,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<Asset>(createEmptyAsset);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialAsset ? {...initialAsset} : createEmptyAsset());
      setError('');
      setSaving(false);
    }
  }, [open, initialAsset]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const id =
        form.id ||
        (typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
      await onSave({
        ...form,
        id,
        value: Number(form.value) || 0,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2238]/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#d6e0e7] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-[#edf1f4] pb-4">
          <h2
            id="asset-modal-title"
            className="text-lg font-semibold text-[#123b5d]"
          >
            {initialAsset ? 'Edit asset details' : 'Add new asset'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#72828e] hover:bg-[#edf2f5] hover:text-[#193246] cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-[#516879]">
              Asset name *
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                placeholder="e.g. Dell Latitude 5540"
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-[#516879]">
              Asset code *
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({...form, code: e.target.value})}
                placeholder="e.g. PEDO-IT-042"
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 font-mono text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-[#516879]">
              Category *
              <select
                value={form.category}
                onChange={(e) => setForm({...form, category: e.target.value})}
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-[#516879]">
              Serial / model
              <input
                type="text"
                value={form.serial}
                onChange={(e) => setForm({...form, serial: e.target.value})}
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 font-mono text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-[#516879]">
              Purchase date
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) =>
                  setForm({...form, purchase_date: e.target.value})
                }
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-[#516879]">
              Value (PKR)
              <input
                type="number"
                min={0}
                value={form.value || ''}
                onChange={(e) =>
                  setForm({...form, value: Number(e.target.value) || 0})
                }
                placeholder="0"
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 font-mono text-sm tabular-nums text-[#193246] focus:border-[#176b9a] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-[#516879]">
              Location
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({...form, location: e.target.value})}
                placeholder="e.g. PMO Room 204"
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-[#516879]">
              Condition
              <select
                value={form.condition}
                onChange={(e) => setForm({...form, condition: e.target.value})}
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-[#516879]">
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({...form, status: e.target.value})}
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-[#516879]">
              Custodian
              <input
                type="text"
                value={form.custodian}
                onChange={(e) => setForm({...form, custodian: e.target.value})}
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-[#516879] sm:col-span-2">
              Remarks
              <textarea
                rows={3}
                value={form.remarks}
                onChange={(e) => setForm({...form, remarks: e.target.value})}
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              />
            </label>
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-[#b43d3d]">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 border-t border-[#edf1f4] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-[#d8e1e8] bg-[#edf2f5] px-4 py-2 text-sm font-semibold text-[#365064] transition-colors hover:bg-[#e1e9ee] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#176b9a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#145d86] disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving…' : 'Save asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AssignmentFormModalProps {
  open: boolean;
  assets: Asset[];
  onClose: () => void;
  onSave: (payload: {
    id: string;
    asset_id: string;
    person: string;
    department: string;
    issue_date: string;
    due_date: string;
    notes: string;
  }) => Promise<void>;
}

export const AssignmentFormModal: React.FC<AssignmentFormModalProps> = ({
  open,
  assets,
  onClose,
  onSave,
}) => {
  const selectableAssets = assets.filter((a) => a.status !== 'Disposed');
  const [assetId, setAssetId] = useState('');
  const [person, setPerson] = useState('');
  const [department, setDepartment] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAssetId(selectableAssets[0]?.id || '');
      setPerson('');
      setDepartment('');
      setIssueDate(new Date().toISOString().slice(0, 10));
      setDueDate('');
      setNotes('');
      setError('');
      setSaving(false);
    }
  }, [open, assets]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const id =
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      await onSave({
        id,
        asset_id: assetId,
        person,
        department,
        issue_date: issueDate,
        due_date: dueDate,
        notes,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save assignment',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2238]/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assignment-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#d6e0e7] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-[#edf1f4] pb-4">
          <h2
            id="assignment-modal-title"
            className="text-lg font-semibold text-[#123b5d]"
          >
            Assign asset
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#72828e] hover:bg-[#edf2f5] hover:text-[#193246] cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-xs font-medium text-[#516879]">
            Asset *
            <select
              required
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
            >
              {selectableAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-[#516879]">
            Employee / custodian *
            <input
              type="text"
              required
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
            />
          </label>

          <label className="block text-xs font-medium text-[#516879]">
            Department / section
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-[#516879]">
              Issue date *
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-[#516879]">
              Expected return
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-[#516879]">
            Notes
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
            />
          </label>

          {error && (
            <p role="alert" className="text-xs font-medium text-[#b43d3d]">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 border-t border-[#edf1f4] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-[#d8e1e8] bg-[#edf2f5] px-4 py-2 text-sm font-semibold text-[#365064] transition-colors hover:bg-[#e1e9ee] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#176b9a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#145d86] disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving…' : 'Save assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface MaintenanceFormModalProps {
  open: boolean;
  assets: Asset[];
  onClose: () => void;
  onSave: (payload: {
    id: string;
    asset_id: string;
    date: string;
    type: string;
    provider: string;
    cost: number;
    notes: string;
    set_under_maintenance: boolean;
  }) => Promise<void>;
}

const MAINTENANCE_TYPES = [
  'Repair',
  'Inspection',
  'Preventive Maintenance',
  'Warranty',
  'Other',
];

export const MaintenanceFormModal: React.FC<MaintenanceFormModalProps> = ({
  open,
  assets,
  onClose,
  onSave,
}) => {
  const selectableAssets = assets.filter((a) => a.status !== 'Disposed');
  const [assetId, setAssetId] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('Repair');
  const [provider, setProvider] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [setUnderMaintenance, setSetUnderMaintenance] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAssetId(selectableAssets[0]?.id || '');
      setDate(new Date().toISOString().slice(0, 10));
      setType('Repair');
      setProvider('');
      setCost('');
      setNotes('');
      setSetUnderMaintenance(true);
      setError('');
      setSaving(false);
    }
  }, [open, assets]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const id =
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      await onSave({
        id,
        asset_id: assetId,
        date,
        type,
        provider,
        cost: Number(cost) || 0,
        notes,
        set_under_maintenance: setUnderMaintenance,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save maintenance record',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2238]/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#d6e0e7] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-[#edf1f4] pb-4">
          <h2
            id="maintenance-modal-title"
            className="text-lg font-semibold text-[#123b5d]"
          >
            Maintenance record
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#72828e] hover:bg-[#edf2f5] hover:text-[#193246] cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-xs font-medium text-[#516879]">
            Asset *
            <select
              required
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
            >
              {selectableAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-[#516879]">
              Date *
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-[#516879]">
              Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              >
                {MAINTENANCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-[#516879]">
              Service provider
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-[#516879]">
              Cost (PKR)
              <input
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
                className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 font-mono text-sm tabular-nums text-[#193246] focus:border-[#176b9a] focus:outline-none"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-[#516879]">
            Details
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 py-2 text-sm text-[#193246] focus:border-[#176b9a] focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2.5 text-xs font-medium text-[#365064] cursor-pointer">
            <input
              type="checkbox"
              checked={setUnderMaintenance}
              onChange={(e) => setSetUnderMaintenance(e.target.checked)}
              className="h-4 w-4 rounded border-[#d6e0e7] text-[#176b9a] focus:ring-[#176b9a]"
            />
            Set asset status to Under Maintenance
          </label>

          {error && (
            <p role="alert" className="text-xs font-medium text-[#b43d3d]">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 border-t border-[#edf1f4] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-[#d8e1e8] bg-[#edf2f5] px-4 py-2 text-sm font-semibold text-[#365064] transition-colors hover:bg-[#e1e9ee] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#176b9a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#145d86] disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving…' : 'Save record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
