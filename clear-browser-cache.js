/**
 * 🧹 BROWSER CACHE CLEARING SCRIPT
 * Run this in browser console to clear all caches
 */

console.log('🧹 CLEARING ALL BROWSER STORAGE...');

// 1. Clear localStorage
console.log('📦 Clearing localStorage...');
const localStorageKeys = Object.keys(localStorage);
console.log(`Found ${localStorageKeys.length} localStorage items:`, localStorageKeys);
localStorage.clear();

// 2. Clear sessionStorage
console.log('📦 Clearing sessionStorage...');
const sessionStorageKeys = Object.keys(sessionStorage);
console.log(`Found ${sessionStorageKeys.length} sessionStorage items:`, sessionStorageKeys);
sessionStorage.clear();

// 3. Clear IndexedDB (React Query cache)
console.log('📦 Clearing IndexedDB...');
if ('indexedDB' in window) {
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      if (db.name) {
        console.log(`Deleting IndexedDB: ${db.name}`);
        indexedDB.deleteDatabase(db.name);
      }
    });
  });
}

// 4. Clear service worker cache
console.log('📦 Clearing Service Worker cache...');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      console.log('Unregistering service worker...');
      registration.unregister();
    });
  });
}

// 5. Clear cookies for current domain
console.log('🍪 Clearing cookies...');
document.cookie.split(";").forEach(cookie => {
  const eqPos = cookie.indexOf("=");
  const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
  if (name) {
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    console.log(`Cleared cookie: ${name}`);
  }
});

console.log('✅ CACHE CLEARING COMPLETE!');
console.log('🔄 Please perform hard refresh: Ctrl+F5 (Windows) / Cmd+Shift+R (Mac)');
console.log('🎯 Then test booking from: /hotel/dusit-thani-bangkok');