const STORAGE_KEY = "exam-prep-lite-state-v1";
const DB_NAME = "exam-prep-lite";
const MEDIA_STORE = "media";

const defaultState = () => ({
  exam: "ielts",
  attempts: [],
  vocabularyReviews: {},
  importedQuestions: [],
  writingDrafts: {},
  savedAt: Date.now(),
});

export function loadState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultState(), ...value };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  state.savedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...state }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `exam-prep-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(MEDIA_STORE)) {
        request.result.createObjectStore(MEDIA_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transaction(mode, operation) {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const tx = database.transaction(MEDIA_STORE, mode);
    const store = tx.objectStore(MEDIA_STORE);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => database.close();
  }));
}

export function saveMediaFiles(files) {
  return Promise.all([...files].map((file, index) => transaction("readwrite", (store) => store.put({
    id: `media-${Date.now()}-${index}`,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    addedAt: Date.now(),
    blob: file,
  }))));
}

export function listMediaFiles() {
  return transaction("readonly", (store) => store.getAll());
}

export function getMediaFile(id) {
  return transaction("readonly", (store) => store.get(id));
}

export function removeMediaFile(id) {
  return transaction("readwrite", (store) => store.delete(id));
}

export function clearMediaFiles() {
  return transaction("readwrite", (store) => store.clear());
}
