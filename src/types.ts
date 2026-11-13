export interface Asset {
  id: string;
  name: string;
  code: string;
  category: string;
  serial: string;
  purchase_date: string;
  value: number;
  location: string;
  condition: string;
  status: string;
  custodian: string;
  remarks: string;
}

export interface Assignment {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_code: string;
  person: string;
  department: string;
  issue_date: string;
  due_date: string;
  notes: string;
  returned: boolean;
  returned_date?: string;
}

export interface MaintenanceRecord {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_code: string;
  date: string;
  type: string;
  provider: string;
  cost: number;
  notes: string;
}

export interface InventoryData {
  assets: Asset[];
  assignments: Assignment[];
  maintenance: MaintenanceRecord[];
}

export type ActiveTab = 'assets' | 'assignments' | 'maintenance' | 'backup';
