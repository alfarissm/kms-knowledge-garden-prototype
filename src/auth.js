import { createInitialState } from './gamification.js';

export const ACCOUNTS_STORAGE_KEY = 'kms-knowledge-garden-accounts-v1';
export const SESSION_STORAGE_KEY = 'kms-knowledge-garden-session-v1';

function normalizeEmail(email) {
  return email.trim().toLocaleLowerCase('en-US');
}

function readAccounts(storage) {
  try {
    return JSON.parse(storage.getItem(ACCOUNTS_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function publicAccount(account) {
  return {
    name: account.name,
    email: account.email,
    treeState: account.treeState,
    createdAt: account.createdAt,
  };
}

function assertValidIdentity(name, email) {
  if (name.trim().length < 2) {
    throw new Error('Nama harus terdiri dari minimal 2 karakter.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Masukkan alamat email yang valid.');
  }
}

// Prototype tanpa backend: cukup nama dan email, tanpa kata sandi.
// Email yang belum dikenal langsung dibuatkan akun baru di browser ini.
export async function enterGarden({ name, email }, options = {}) {
  const storage = options.storage ?? globalThis.localStorage;
  const now = options.now ?? Date.now();
  const cleanName = String(name ?? '').trim();
  const cleanEmail = normalizeEmail(String(email ?? ''));
  const accounts = readAccounts(storage);
  const existing = accounts[cleanEmail];

  if (existing) {
    storage.setItem(SESSION_STORAGE_KEY, cleanEmail);
    return { account: publicAccount(existing), isNew: false };
  }

  assertValidIdentity(cleanName, cleanEmail);

  const account = {
    name: cleanName,
    email: cleanEmail,
    treeState: createInitialState(now),
    createdAt: now,
  };

  accounts[cleanEmail] = account;
  storage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  storage.setItem(SESSION_STORAGE_KEY, cleanEmail);

  return { account: publicAccount(account), isNew: true };
}

export function readSessionAccount(options = {}) {
  const storage = options.storage ?? globalThis.localStorage;
  const email = storage.getItem(SESSION_STORAGE_KEY);
  if (!email) return null;

  const account = readAccounts(storage)[email];
  return account ? publicAccount(account) : null;
}

export function saveAccountTreeState(email, treeState, options = {}) {
  const storage = options.storage ?? globalThis.localStorage;
  const cleanEmail = normalizeEmail(email);
  const accounts = readAccounts(storage);
  const account = accounts[cleanEmail];

  if (!account) {
    throw new Error('Akun tidak ditemukan.');
  }

  account.treeState = treeState;
  accounts[cleanEmail] = account;
  storage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

export function logoutAccount(options = {}) {
  const storage = options.storage ?? globalThis.localStorage;
  storage.removeItem(SESSION_STORAGE_KEY);
}
