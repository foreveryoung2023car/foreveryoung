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


## Admin localization (2026-09-16)

Both Japan Go and Foreveryoung admin portals support `zh-Hant`, `zh-Hans`,
`ja`, and `en`. The selector is available before sign-in and remembers the
preference in `kimono_admin_lang`; on first use, a supported `kimono_lang`
preference from the public site is reused. Otherwise the default is Traditional Chinese.

Load `i18n-catalog.js`, `i18n-extra.js`, `i18n-training.js`, then `i18n.js`
before the numbered scripts. Keep these four files identical in both brands.
The runtime translates UI text and accessibility attributes, observes dynamic
updates, and retains source text so switching back restores the latest copy.
Use `adminT()` for non-DOM copy and `adminAlert` / `adminConfirm` / `adminPrompt`
for native dialogs. New UI copy belongs in the catalogs; unknown copy keeps its
source text. Dates use the selected locale while money and stored values retain
their original units and semantics.

Inputs and textarea values, explicit option values, backend status codes and
customer records are not translated. Mark new customer-generated display
containers with `data-i18n-ignore` (or `translate="no"`). Options without explicit
values have their original value preserved before their label is translated.

Training scenarios have four-language operational summaries. The complete
original Traditional Chinese training documents are available in collapsed,
explicitly labeled reference sections because they include legacy GAS / Sheet
instructions. Existing scenario IDs, role filtering and completion records are
retained. Outgoing customer message drafts remain in their original language.

Regression tests: from the site directory run `npm install --prefix tests`, then
`npm test --prefix tests` (Node 22.13+ or Node 24). Tests cover language roundtrips,
updated text and attributes, input/option preservation, private data, native
dialogs, dates and all training summaries. The neighboring brand is tested too
when it is present in the usual workspace layout. Browser checks use synthetic
pages and do not sign in, update real orders or send emails.
