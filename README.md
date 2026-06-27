# PorgDutyEmergency - Teacher Duty Booking System

A modern, responsive web application for managing teacher duties, emergency covers, and booking administration.

## Features

- **Shift Booking:** Teachers can book available duty slots and emergency covers.
- **My Bookings:** Teachers can review and cancel their own booked shifts.
- **Admin Dashboard:** Admins can import schedules from CSV and export booking data for HR.
- **Google Sign-In:** Teachers sign in with Google and must use an `@novyporg.cz` account.
- **Shared Database Persistence:** Slots, colleagues, cooldowns, and admin emails are stored in Firestore.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lucide React icons
- Motion animations

## Setup

### Prerequisites

- Node.js (v16+)
- npm

### Install

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Change to the project folder:
   ```bash
   cd emergency-lesson-&-duty-booking
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

4. Create your local env file:
   ```bash
   cp .env.example .env
   ```

5. Fill all Firebase values in `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID` (optional; can be empty)

### Run locally

```bash
npm run dev
```

Open the app at `http://localhost:3000`.

### Build for production

```bash
npm run build
```

The production build output is written to `dist`.

## Firebase and Google Sign-In

- The app uses Firebase Authentication + Firestore.
- Firebase config is loaded from Vite env vars in `src/firebase.ts`.
- Data is synced in real time through Firestore listeners.
- On first startup with an empty database, the app seeds default duty slots.
- For Google sign-in to work, your Firebase project must have:
  - Google Sign-In enabled under Firebase Authentication.
  - Authorized domains including `localhost` and any deployed domain.
- The app enforces access for `@novyporg.cz` accounts only.
- Admin access is managed in Firestore collection `admins`.

## Firestore Collections

- `slots`:
   - Booking slots and assigned colleague IDs.
- `colleagues`:
   - Teacher profiles used by the booking system.
- `cooldowns`:
   - Per-colleague booking cooldown timestamps.
- `admins`:
   - Admin email list for elevated UI actions.

## Deploy to Firebase Hosting

1. Ensure Firebase CLI access:
    ```bash
    npx firebase-tools login
    ```
2. Select your project:
    ```bash
    npx firebase-tools use <your-firebase-project-id>
    ```
3. Deploy Firestore rules + hosting:
    ```bash
    npm run firebase:deploy
    ```

This deploys:
- Firestore security rules from `firestore.rules`
- Frontend build from `dist` to Firebase Hosting

## Production Checklist

- Firebase Authentication:
   - Google provider enabled
   - Authorized domains configured
- Firestore:
   - Database created in production mode
   - Rules deployed from `firestore.rules`
- Environment:
   - All `VITE_FIREBASE_*` variables configured in your hosting environment
- App behavior:
   - Login with a valid `@novyporg.cz` account
   - Confirm booking appears for another user/browser session
   - Confirm admin updates are reflected across sessions

## Notes

- Some dependencies in `package.json` may come from scaffolding and are not used by the current app logic.

## License

This project is licensed under the MIT License.
