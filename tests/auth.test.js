import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ACCOUNTS_STORAGE_KEY,
  loginAccount,
  readSessionAccount,
  registerAccount,
  saveAccountTreeState,
} from '../src/auth.js';
import { createInitialState } from '../src/gamification.js';

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

describe('prototype account flow', () => {
  it('registers first, requires a separate login, and keeps the password out of local account data', async () => {
    const storage = new MemoryStorage();
    const account = await registerAccount({
      name: 'Nadia Demo',
      email: ' Nadia@Example.com ',
      password: 'kebunaman123',
    }, { storage, cryptoApi: webcrypto, now: 1_000 });

    expect(account.email).toBe('nadia@example.com');
    expect(account.treeState).toEqual(createInitialState(1_000));
    expect(readSessionAccount({ storage })).toBeNull();
    expect(storage.getItem(ACCOUNTS_STORAGE_KEY)).not.toContain('kebunaman123');

    await expect(loginAccount({ email: account.email, password: 'salah1234' }, { storage, cryptoApi: webcrypto }))
      .rejects.toThrow('Email atau kata sandi tidak cocok.');

    const loggedIn = await loginAccount({ email: account.email, password: 'kebunaman123' }, { storage, cryptoApi: webcrypto });
    expect(readSessionAccount({ storage }).email).toBe('nadia@example.com');
    expect(loggedIn.name).toBe('Nadia Demo');

    const changedTree = { ...loggedIn.treeState, air: 8 };
    saveAccountTreeState(loggedIn.email, changedTree, { storage });
    expect(readSessionAccount({ storage }).treeState.air).toBe(8);
  });

  it('rejects registering the same normalized email twice', async () => {
    const storage = new MemoryStorage();
    const details = { name: 'Nadia', email: 'nadia@example.com', password: 'kebunaman123' };

    await registerAccount(details, { storage, cryptoApi: webcrypto, now: 1_000 });
    await expect(registerAccount({ ...details, email: ' NADIA@example.com ' }, { storage, cryptoApi: webcrypto }))
      .rejects.toThrow('Email sudah terdaftar. Silakan masuk.');
  });
});
