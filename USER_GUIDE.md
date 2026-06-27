# PorgDutyEmergency - Teacher User Guide

Welcome to **PorgDutyEmergency**, the teacher duty booking and emergency cover portal.

> **Tip:** Print this guide to PDF (`Ctrl + P` or `Cmd + P`) if you want to share it with staff.

---

## 1. Signing In

When you open the application, the first screen asks you to sign in with Google.

- Click **Sign in with Google**.
- Use your official `@novyporg.cz` school email account.
- If your email is not from `@novyporg.cz`, the app will reject the login.

> Note: The current app only supports Google sign-in, not manual name/email entry.

---

## 2. Booking a Shift

After signing in, you land on the booking view.

- The default tab is **Book Slots**.
- Browse the available duties or emergency covers.
- Use the filters and the list to find the slot you want.
- Click **Book** on a slot to reserve it.
- The app prevents booking the same slot twice and enforces a short cooldown after booking.

> The booking state is stored locally in your browser. Refreshing the page will preserve your current data in that browser.

---

## 3. Viewing Your Bookings

Open the **My Schedule** tab to see all slots you have booked.

- Your bookings appear in chronological order.
- You can cancel any booking you made yourself.
- The booking list updates immediately.

---

## 4. Admin Features

Administrators see two extra tabs: **Spreadsheet Import** and **HR Export**.

### Spreadsheet Import
- Upload a CSV file with duty slot data.
- Choose to **Append** to the existing schedule or **Replace** it entirely.
- Use this feature to load a new roster quickly.

### HR Export
- View a complete ledger of all bookings stored in the browser.
- Filter by teacher, date, or slot type.
- Export the current view to CSV for payroll or HR reporting.
- You can also update the admin email list here.

> Note: Admin permissions are saved in browser localStorage. This is not currently enforced by a shared backend.

---

## 5. Important Limitations

- The app uses Firebase only for Google authentication.
- Booking data is not stored in Firestore or a shared database yet.
- This means bookings are saved in your browser only, not synced between users or devices.
- To make this full multi-user app, a backend persistence layer is needed.

---

## Need Help?

If you have issues signing in, ask your IT administrator to verify your school Google account and Firebase authorized domains.

If you have questions about booking or admin access, contact the school administration.
