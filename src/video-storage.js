const DATABASE_NAME = 'knowledge-garden-prototype';
const DATABASE_VERSION = 1;
const STORE_NAME = 'sharing-videos';

function getVideoKey(accountEmail, submissionId) {
  return `${String(accountEmail).trim().toLocaleLowerCase('id-ID')}:${submissionId}`;
}

function openDatabase() {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error('Penyimpanan video lokal tidak tersedia di browser ini.'));
  }

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Gagal membuka penyimpanan video lokal.'));
    request.onblocked = () => reject(new Error('Penyimpanan video sedang dipakai tab lain. Muat ulang halaman lalu coba lagi.'));
  });
}

export async function saveSharingVideo(accountEmail, submissionId, file) {
  const database = await openDatabase();
  const id = getVideoKey(accountEmail, submissionId);

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      blob: file,
    });

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Gagal menyimpan video di browser.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error('Penyimpanan video dibatalkan browser.'));
    };
  });
}

export async function getSharingVideo(accountEmail, submissionId) {
  const database = await openDatabase();
  const id = getVideoKey(accountEmail, submissionId);

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(id);
    let video = null;

    request.onsuccess = () => {
      video = request.result ?? null;
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(video);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Gagal membaca video dari browser.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error('Pembacaan video dibatalkan browser.'));
    };
  });
}
