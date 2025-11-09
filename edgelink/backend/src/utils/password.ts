/**
 * Password Hashing Utilities
 * Uses Web Crypto API for bcrypt-like hashing
 */

/**
 * Hash password using PBKDF2 (similar to bcrypt)
 * FR-AUTH-3: Hash password with 10 rounds
 *
 * @param password - Plain text password
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import password as key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive hash using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // 10 rounds equivalent
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  // Combine salt and hash
  const hashArray = new Uint8Array(hashBuffer);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Verify password against hash
 *
 * @param password - Plain text password
 * @param hash - Stored password hash
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Decode base64 hash
    const combined = Uint8Array.from(atob(hash), c => c.charCodeAt(0));

    // Extract salt (first 16 bytes)
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);

    // Hash the input password with the same salt
    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      data,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const hashArray = new Uint8Array(hashBuffer);

    // Compare hashes
    if (hashArray.length !== storedHash.length) {
      return false;
    }

    for (let i = 0; i < hashArray.length; i++) {
      if (hashArray[i] !== storedHash[i]) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
