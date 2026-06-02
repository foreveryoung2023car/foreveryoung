# Firebase Backend

This is the Firebase/Firestore replacement backend for the kimono system.

## What It Provides

- Cloud Functions v2 HTTP APIs
- Firestore database rules and indexes
- Storage rules for order proof assets
- Backend-controlled order number generation
- Backend-controlled order transitions
- Refund request handling
- Check-in handling
- Audit log writing
- Public booking endpoint compatible with the old static `kimono/index.html`

## Functions

Region: `asia-northeast1`

- `createPublicOrder`
- `transitionOrder`
- `requestRefund`
- `requestRefundByStaff`
- `checkInOrder`
- `checkInOrderByStaff`
- `getAuditLogs`

## Setup

```bash
cd kimono-system/firebase/functions
npm install
npm run typecheck
```

Configure project:

```bash
cd kimono-system/firebase
cp .firebaserc.example .firebaserc
# edit .firebaserc with your Firebase project id
```

Deploy:

```bash
firebase deploy --config firebase.json
```

## Firestore Collections

- `users/{uid}`: Firebase Auth user profiles and roles
- `stores/{storeId}`
- `customers/{customerId}`
- `orders/{orderId}`
- `orders/{orderId}/events/{eventId}`
- `refundRequests/{refundId}`
- `checkins/{checkinId}`
- `auditLogs/{auditId}`
- `idempotencyKeys/{key}`
- `settings/orderCounters/days/{yyMMdd}`

## Old Site Cutover

After deploying functions, set in `kimono/config.js`:

```js
API_BASE_URL: 'https://asia-northeast1-YOUR_PROJECT.cloudfunctions.net',
USE_NEW_API: true
```

Then public bookings will call:

```text
POST /createPublicOrder
```
