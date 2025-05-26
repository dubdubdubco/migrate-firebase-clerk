const fetch = require('node-fetch')
const firebaseUsers = require('./firebase-users.json')
require('dotenv').config()

// Helper function to wait for a specified time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to handle rate limits with exponential backoff
async function fetchWithRetry(url, options, maxRetries = 5) {
  let retries = 0
  while (true) {
    try {
      const result = await fetch(url, options)

      if (result.status === 429) {
        if (retries >= maxRetries) {
          throw new Error('Max retries reached for rate limit')
        }

        // Get retry-after header or use exponential backoff
        const retryAfter = result.headers.get('retry-after')
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retries) * 1000

        console.log(`Rate limited. Waiting ${waitTime/1000} seconds before retry...`)
        await wait(waitTime)
        retries++
        continue
      }

      return result
    } catch (error) {
      if (retries >= maxRetries) {
        throw error
      }
      retries++
      const waitTime = Math.pow(2, retries) * 1000
      console.log(`Request failed. Waiting ${waitTime/1000} seconds before retry...`)
      await wait(waitTime)
    }
  }
}

async function migrateToClerk() {
  // You can find these values on your Firebase project's authentication settings
  const signerKey = process.env.FIREBASE_SIGNER_KEY
  const saltSeparator = process.env.FIREBASE_SALT_SEPARATOR
  const rounds = process.env.FIREBASE_ROUNDS
  const memoryCost = process.env.FIREBASE_MEMORY_COST

  // You can find this value on your Clerk application's dashboard
  const clerkBackendApiKey = process.env.CLERK_BACKEND_API_KEY

  const totalUsers = firebaseUsers.users.length
  let processedUsers = 0
  for (let user of firebaseUsers.users) {
    const { email, localId, passwordHash, salt } = user

    const body = passwordHash
      ? {
          email_address: [email],
          external_id: localId,
          password_hasher: 'scrypt_firebase',
          password_digest: `${passwordHash}$${salt}$${signerKey}$${saltSeparator}$${rounds}$${memoryCost}`,
        }
      : {
          email_address: [email],
          external_id: localId,
          skip_password_requirement: true,
        }

    try {
      const result = await fetchWithRetry('https://api.clerk.com/v1/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clerkBackendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      processedUsers++

      if (!result.ok) {
        const json = await result.json()
        if (json.errors[0].code === 'form_identifier_exists') {
          console.log(`[${processedUsers}/${totalUsers}] ${email} already exists. Skipping...`)
          continue
        }

        throw Error(`${result.status}: ${result.statusText} (${JSON.stringify(json)})`)
      } else {
        console.log(`[${processedUsers}/${totalUsers}] ${email} added successfully`)
      }
    } catch (error) {
      console.error(`[${processedUsers}/${totalUsers}] Error migrating ${email}: ${error}`)
    }
  }
}

migrateToClerk()
