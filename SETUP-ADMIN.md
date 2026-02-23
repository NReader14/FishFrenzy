# Fish Frenzy — Admin & Firebase Setup Guide

## 1. Set Up the Admin Account

Go to the [Firebase Console](https://console.firebase.google.com/) → your project (`fishfrenzy-b26b8`) → **Authentication** → **Sign-in method**.

1. Enable **Email/Password** as a sign-in provider (if not already enabled).
2. Enable **Anonymous** as a sign-in provider (this is for regular players).
3. Go to the **Users** tab → **Add user**.
4. Enter your admin email and a strong password. Click **Add user**.
5. **Copy the UID** of the user you just created. You'll need it for step 2.

## 2. Deploy Firestore Security Rules

Go to **Firestore Database** → **Rules** tab.

Replace the rules with the following, substituting `YOUR_ADMIN_UID_HERE` with the UID you copied in step 1:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ─── HIGH SCORES COLLECTION ───
    match /highscores/{name} {

      // Anyone (authenticated) can read scores
      allow read: if request.auth != null;

      // Writes are allowed if:
      // 1. User is authenticated
      // 2. The score is a valid number between 0 and 99999
      // 3. The name is exactly 3 characters
      // 4. The level is a valid number >= 1
      // 5. The document includes a server timestamp
      // 6. The uid field matches the authenticated user
      allow create, update: if request.auth != null
        && request.resource.data.score is number
        && request.resource.data.score >= 0
        && request.resource.data.score <= 99999
        && request.resource.data.name is string
        && request.resource.data.name.size() == 3
        && request.resource.data.level is number
        && request.resource.data.level >= 1
        && request.resource.data.timestamp == request.time
        && request.resource.data.uid == request.auth.uid;

      // Only the admin can delete scores (for wiping the leaderboard)
      allow delete: if request.auth != null
        && request.auth.uid == 'YOUR_ADMIN_UID_HERE';
    }

    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Click **Publish** to deploy the rules.

## 3. Create the Firestore Database

If you haven't already:

1. Go to **Firestore Database** → **Create database**.
2. Choose **Start in production mode** (the rules above will handle access).
3. Select your preferred region.

The `highscores` collection will be created automatically when the first score is saved.

## 4. Security Summary

| Feature | How It's Secured |
|---|---|
| Score writes | Require anonymous auth + field validation + server timestamp |
| Score cap | Maximum 99,999 enforced in rules AND client |
| Name validation | Must be exactly 3 characters |
| Rate limiting | Server timestamps enable detection of rapid writes |
| Score deletion | Only the admin UID can delete documents |
| Admin login | Email/password auth via Firebase, not stored in client code |
| Offline fallback | localStorage cache, read-only, never synced back |

## 5. Testing

1. Open the game in a browser.
2. Play a game and submit a score — it should appear in Firestore under `highscores`.
3. Click **HI-SCORES** → **WIPE** → enter your admin email/password → scores should be deleted.
4. Try entering invalid credentials — it should show an error and NOT delete anything.
5. Check the Firestore rules playground to verify non-admin users cannot delete scores.
