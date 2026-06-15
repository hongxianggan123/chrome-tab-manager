# Use Local Chrome Storage Only

The extension will use `chrome.storage.local` for MVP persisted state and will not use `chrome.storage.sync`. The product scope is a single Chrome profile with no cross-device synchronization, and local storage avoids sync capacity limits, latency, and conflict rules that would otherwise complicate archived tab state and view preferences.

