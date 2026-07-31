## Goal

Make invite delivery honest and free: no email service, no Resend. The copyable invite link becomes the primary action in both share dialogs.

Verified current state: `sendInviteEmail()` in `src/services/folderSharing.ts` is a stub that logs in dev and returns `{ delivered: false }` — no email is ever sent. Both `FolderShareDialog` and `AnalysisShareDialog` already generate and display a link; the "Invite by email" label is misleading.

## Changes

**1. `src/services/folderSharing.ts`**
- Delete the `sendInviteEmail` stub and its `InviteEmailPayload` type.
- Remove the `void sendInviteEmail(...)` call in `createFolderInvite`.

**2. `src/services/analysisSharing.ts`**
- Drop the `sendInviteEmail` import and its call in `createAnalysisInvite`.

**3. `src/components/FolderShareDialog.tsx`**
- Label: "Invite by email" → "Who is this link for?" with helper text "We'll generate a private link addressed to them — you send it however you like."
- Button label: "Invite" → "Create link".
- Toast: "Invite link ready" → "Link created and copied".
- Link panel copy stays; keep the 14-day expiry note.

**4. `src/components/AnalysisShareDialog.tsx`**
- Same relabeling; dialog description updated to say a private link is created that you share yourself.
- Keep the icon button but switch it to a link icon for clarity.

The email address stays required (it scopes who can redeem the invite and shows in "People with access") — only the delivery promise changes.

## Not doing

No email domain, no Lovable Emails setup, no third-party provider. If you later want auto-sent branded invites, that's a separate step using your existing `foundermodeadvice.com` domain.
