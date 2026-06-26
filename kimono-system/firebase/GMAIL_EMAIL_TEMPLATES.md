# Gmail API Email Templates

Firebase Functions reads email templates from Firestore before sending. If no template is configured, the built-in default template is used.

## Firestore Location

Create or edit this document:

```text
settings/emailTemplates
```

Supported template keys:

- `confirm`
- `refund_confirmed`
- `booking_reminder`
- `proof_received`

Each key can contain:

```json
{
  "subject": "【Foreveryoung 和服體驗】訂單確認 {{orderNo}}",
  "text": "{{name}} 您好：\n您的訂單 {{orderNo}} 已確認。",
  "html": "<p>{{name}} 您好：</p><p>您的訂單 <b>{{orderNo}}</b> 已確認。</p>"
}
```

`html` is optional. If omitted, Functions converts `text` into a simple HTML email automatically.

## Available Variables

- `{{name}}`
- `{{orderNo}}`
- `{{bookingAt}}`
- `{{guests}}`
- `{{plan}}`
- `{{hair}}`
- `{{makeup}}`
- `{{makeupPlan}}`
- `{{photo}}`
- `{{total}}`
- `{{deposit}}`
- `{{kimonoPrice}}`
- `{{hairFee}}`
- `{{makeupFee}}`
- `{{photoFee}}`
- `{{discountRefundAmount}}`
- `{{onsiteDue}}`
- `{{storeActualReceived}}`
- `{{balanceDue}}`
- `{{refundAmount}}`
- `{{refundTime}}`
- `{{refundReason}}`
- `{{proofNote}}`
- `{{proofUrl}}`
- `{{phone}}`
- `{{email}}`

## Notes

- Template changes take effect immediately and do not require redeploying Functions.
- Email send failures are retried 3 times.
- Successful sends and final failures are written to `auditLogs`.
