# Admin Assets

The admin backend is split into ordered browser scripts. They are still loaded as
classic scripts so existing global functions and inline `onclick` handlers keep
working.

Load order matters:

- `00-gas-guard.js`: legacy GAS read-only guard and fetch timeout handling
- `01-state.js`: shared constants and global state
- `02-firebase-api.js`: Firebase Auth, Firestore REST mapping, and Function calls
- `03-ui-utils.js`: login, role filtering, date/format helpers, and navigation
- `04-refunds.js`: refund status helpers and message templates
- `05-orders.js`: dashboard, order list, filters, and quick order actions
- `06-checkin-actions.js`: staff order check-in action and quick save helpers
- `07-calendar.js`: calendar view
- `08-finance.js`: finance reports
- `09-reconcile.js`: reconciliation views, auto-scan, and CSV export
- `10-orders-edit.js`: order edit modal and anomaly banner
- `11-refunds-edit.js`: refund account parsing and refund edit helpers
- `12-ui-admin-tools.js`: permissions, archive, charts, and admin utility views
- `13-weather.js`: weather widget
- `14-checkins.js`: check-in center view
- `15-walkin-reconcile.js`: walk-in monthly reconciliation and invoice view
- `16-audit-email.js`: audit log and confirmation email entry points
- `17-walkin-orders.js`: walk-in order creation modal
- `18-employees.js`: Firebase/GAS employee management
- `19-tour.js`: admin training and guided tour
