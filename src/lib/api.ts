let _baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
if (_baseUrl && !_baseUrl.startsWith("http")) {
  _baseUrl = `https://${_baseUrl}`;
}
export const API_BASE_URL = _baseUrl;

export interface Charge {
  id: number;
  period: string;
  amount: number;
}

export interface House {
  id: number;
  number: number;
  monthly_fee: number | null;
  initial_balance: number;
  current_debt: number;
  payments: Payment[];
  charges: Charge[];
}

export interface Payment {
  id: number;
  house_id: number;
  amount: number;
  payment_date: string;
  description: string;
}

export async function fetchHouses(): Promise<House[]> {
  const res = await fetch(`${API_BASE_URL}/houses`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch houses");
  return res.json();
}

export async function fetchHouse(id: number): Promise<House> {
  const res = await fetch(`${API_BASE_URL}/houses/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch house");
  return res.json();
}

export async function fetchHousePayments(houseId: number): Promise<Payment[]> {
  const res = await fetch(`${API_BASE_URL}/houses/${houseId}/payments`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch payments");
  return res.json();
}

export async function uploadPdf(file: File, period: string) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/payments/upload?period=${period}`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  
  if (!res.ok) throw new Error("Failed to upload PDF");
  return res.json();
}

export async function fetchUnidentifiedPayments(): Promise<Payment[]> {
  const res = await fetch(`${API_BASE_URL}/payments/unidentified`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch unidentified payments");
  return res.json();
}

export async function assignPayment(paymentId: number, houseId: number) {
  const res = await fetch(`${API_BASE_URL}/payments/${paymentId}/assign?house_id=${houseId}`, {
    method: "PUT",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to assign payment");
  return res.json();
}

export async function unassignPayment(paymentId: number) {
  const res = await fetch(`${API_BASE_URL}/payments/${paymentId}/unassign`, {
    method: "PUT",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to unassign payment");
  return res.json();
}

export async function generateCharges(period: string) {
  const res = await fetch(`${API_BASE_URL}/houses/generate-charges?period=${period}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to generate charges");
  }
  return res.json();
}

export interface Expense {
  id: number;
  amount: number;
  description: string | null;
  expense_date: string;
  category: string;
  period: string;
  created_at: string;
}

export async function fetchExpenses(): Promise<Expense[]> {
  const res = await fetch(`${API_BASE_URL}/expenses`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export async function createExpense(data: Omit<Expense, "id" | "created_at">): Promise<Expense> {
  const res = await fetch(`${API_BASE_URL}/expenses/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to create expense");
  }
  return res.json();
}

export async function deleteExpense(id: number) {
  const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete expense");
  return res.json();
}

export interface DelinquencyReport {
  total_debt: number;
  ranking: { house_number: number; debt: number }[];
  distribution: {
    al_corriente: number;
    un_mes: number;
    dos_meses: number;
    tres_o_mas: number;
  };
}

export interface IncomeReport {
  period: string;
  expected: number;
  identified_income: number;
  unidentified_income: number;
  total_income: number;
  expenses: number;
  balance: number;
}

export async function fetchDelinquency(): Promise<DelinquencyReport> {
  const res = await fetch(`${API_BASE_URL}/reports/delinquency`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch delinquency report");
  return res.json();
}

export async function fetchIncomeVsExpected(period: string): Promise<IncomeReport> {
  const res = await fetch(`${API_BASE_URL}/reports/income-vs-expected?period=${period}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch income report");
  return res.json();
}

