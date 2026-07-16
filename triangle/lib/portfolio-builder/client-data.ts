import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ClientProfile, ClientTransaction } from "./types";

const CLIENTS_DIR = path.join(process.cwd(), "app", "namaa", "mrktdata", "clients");

let cachedClients: ClientProfile[] | null = null;
let cachedTransactions: ClientTransaction[] | null = null;

export async function loadClientProfiles(): Promise<ClientProfile[]> {
  if (!cachedClients) {
    const raw = await readFile(path.join(CLIENTS_DIR, "clients.json"), "utf-8");
    cachedClients = JSON.parse(raw) as ClientProfile[];
  }
  return cachedClients;
}

export async function loadClientTransactions(): Promise<ClientTransaction[]> {
  if (!cachedTransactions) {
    const raw = await readFile(path.join(CLIENTS_DIR, "transactions.json"), "utf-8");
    cachedTransactions = JSON.parse(raw) as ClientTransaction[];
  }
  return cachedTransactions;
}

export async function findClientProfile(id: string): Promise<ClientProfile | null> {
  const normalized = id.trim().toUpperCase();
  const profiles = await loadClientProfiles();
  return profiles.find((p) => p.id.toUpperCase() === normalized) ?? null;
}
