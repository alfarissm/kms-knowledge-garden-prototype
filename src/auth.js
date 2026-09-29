import { createInitialState } from './gamification.js';

export const ACCOUNTS_STORAGE_KEY = 'kms-knowledge-garden-accounts-v1';
export const SESSION_STORAGE_KEY = 'kms-knowledge-garden-session-v1';

const PBKDF2_ITERATIONS = 120_000;

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

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  return Uint8Array.from(hex.match(/.{1,2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

async function derivePasswordHash(password, salt, cryptoApi) {
  const passwordKey = await cryptoApi.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const passwordBits = await cryptoApi.subtle.deriveBits({
    name: 'PBKDF2',
    salt: hexToBytes(salt),
    iterations: PBKDF2_ITERATIONS,
    hash: 'SHA-256',
  }, passwordKey, 256);

  return bytesToHex(new Uint8Array(passwordBits));
}

function publicAccount(account) {
  return {
    name: account.name,
    email: account.email,
    treeState: account.treeState,
    createdAt: account.createdAt,
  };
}

export async function registerAccount({ name, email, password }, options = {}) {
  const storage = options.storage ?? globalThis.localStorage;
  const cryptoApi = options.cryptoApi ?? globalThis.crypto;
  const now = options.now ?? Date.now();
  const cleanName = name.trim();
  const cleanEmail = normalizeEmail(email);

  if (cleanName.length < 2) {
    throw new Error('Nama harus terdiri dari minimal 2 karakter.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Masukkan alamat email yang valid.');
  }

  if (password.length < 8) {
    throw new Error('Kata sandi minimal 8 karakter.');
  }

  const accounts = readAccounts(storage);
  if (accounts[cleanEmail]) {
    throw new Error('Email sudah terdaftar. Silakan masuk.');
  }

  const saltBytes = cryptoApi.getRandomValues(new Uint8Array(16));
  const passwordSalt = bytesToHex(saltBytes);
  const account = {
    name: cleanName,
    email: cleanEmail,
    passwordSalt,
    passwordHash: await derivePasswordHash(password, passwordSalt, cryptoApi),
    treeState: createInitialState(now),
    createdAt: now,
  };

  accounts[cleanEmail] = account;
  storage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));

  return publicAccount(account);
}

export async function loginAccount({ email, password }, options = {}) {
  const storage = options.storage ?? globalThis.localStorage;
  const cryptoApi = options.cryptoApi ?? globalThis.crypto;
  const cleanEmail = normalizeEmail(email);
  const account = readAccounts(storage)[cleanEmail];

  if (!account) {
    throw new Error('Email atau kata sandi tidak cocok.');
  }

  const submittedHash = await derivePasswordHash(password, account.passwordSalt, cryptoApi);
  if (submittedHash !== account.passwordHash) {
    throw new Error('Email atau kata sandi tidak cocok.');
  }

  storage.setItem(SESSION_STORAGE_KEY, cleanEmail);
  return publicAccount(account);
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
