import type { Customer } from './types';

const KEY = 'coaris_customers';

function storageWarn(action: string, e: unknown): void {
  console.warn(`[customerStore] ${action} failed:`, e);
}

export function loadCustomers(): Customer[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    storageWarn('load', e);
    return [];
  }
}

export function saveCustomers(customers: Customer[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(customers));
  } catch (e) {
    storageWarn('save', e);
  }
}

export function addCustomer(customer: Customer): void {
  const customers = loadCustomers();
  if (customers.some((c) => c.id === customer.id)) return;
  saveCustomers([...customers, customer]);
}

export function upsertCustomer(customer: Customer): void {
  const customers = loadCustomers();
  const idx = customers.findIndex((c) => c.companyName === customer.companyName && c.email === customer.email);
  if (idx >= 0) {
    customers[idx] = { ...customers[idx], ...customer };
    saveCustomers(customers);
  } else {
    saveCustomers([...customers, customer]);
  }
}

export function resetCustomers(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
