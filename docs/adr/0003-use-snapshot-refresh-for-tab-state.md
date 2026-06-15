# Use Snapshot Refresh For Tab State

The service worker will rebuild tab inventory state from fresh Chrome and storage snapshots after relevant events instead of maintaining a complex incremental model. Chrome tabs and windows events can arrive in noisy sequences, and snapshot refresh keeps the MVP easier to verify while preserving enough performance headroom for the expected tab counts.

