# Migrate Firebase users to Clerk

## Setup

```bash
npm install
```

## Export Firebase users

Update the project ID in the `export-firebase.sh` script. Then run:

```bash
./export-firebase.sh
```

This will create a `firebase-users.json` file in the root of the project.

## Migrate to Clerk

Copy `.env.example` to `.env` and update the values. For more information on where to find the values, see [Clerk's documentation](https://clerk.com/docs/deployments/migrate-from-firebase).

```bash
node migrate-to-clerk.js
```

This script will create users in Clerk using the backend API.
