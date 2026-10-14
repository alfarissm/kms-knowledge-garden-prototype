import { describe, expect, it } from 'vitest';
import {
  ACCOUNTS_STORAGE_KEY,
  enterGarden,
  readSessionAccount,
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
  it('creates an account on first entry without a password and reuses it afterwards', async () => {
    const storage = new MemoryStorage();
    const first = await enterGarden({
      name: 'Nadia Demo',
      email: ' Nadia@Example.com ',
    }, { storage, now: 1_000 });

    expect(first.isNew).toBe(true);
    expect(first.account.email).toBe('nadia@example.com');
    expect(first.account.treeState).toEqual(createInitialState(1_000));
    expect(readSessionAccount({ storage }).email).toBe('nadia@example.com');
    expect(storage.getItem(ACCOUNTS_STORAGE_KEY)).not.toContain('password');

    const second = await enterGarden({ name: 'Nama Lain', email: 'nadia@example.com' }, { storage });
    expect(second.isNew).toBe(false);
    expect(second.account.name).toBe('Nadia Demo');

    const changedTree = { ...second.account.treeState, air: 8 };
    saveAccountTreeState(second.account.email, changedTree, { storage });
    expect(readSessionAccount({ storage }).treeState.air).toBe(8);
  });

  it('rejects short names and invalid emails for new accounts only', async () => {
    const storage = new MemoryStorage();

    await expect(enterGarden({ name: 'A', email: 'baru@example.com' }, { storage }))
      .rejects.toThrow('minimal 2 karakter');
    await expect(enterGarden({ name: 'Baru', email: 'bukan-email' }, { storage }))
      .rejects.toThrow('email yang valid');
    expect(readSessionAccount({ storage })).toBeNull();
  });
});
