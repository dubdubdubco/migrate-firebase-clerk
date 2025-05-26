#!/bin/bash

# https://clerk.com/docs/deployments/migrate-from-firebase
# firebase login
# firebase projects:list

PROJECT_ID='PROJECT_ID'
npx firebase auth:export firebase-users.json --format=json --project $PROJECT_ID
