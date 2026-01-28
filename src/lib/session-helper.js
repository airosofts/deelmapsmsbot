
//lib/session-helper.js

// Helper to sanitize string "null" to actual null
function sanitizeValue(value) {
  if (value === 'null' || value === 'undefined' || value === '') {
    return null
  }
  return value
}

export function getUserFromRequest(request) {
  try {
    // Try to get session from cookie first
    const sessionCookie = request.cookies.get('session')
    if (sessionCookie) {
      const session = JSON.parse(sessionCookie.value)
      // Sanitize values
      return {
        ...session,
        userId: sanitizeValue(session.userId),
        workspaceId: sanitizeValue(session.workspaceId),
        messagingProfileId: sanitizeValue(session.messagingProfileId),
        billingGroupId: sanitizeValue(session.billingGroupId)
      }
    }

    // Fallback to header-based session (for compatibility with x-user-id pattern)
    const userId = sanitizeValue(request.headers.get('x-user-id'))
    const workspaceId = sanitizeValue(request.headers.get('x-workspace-id'))
    const messagingProfileId = sanitizeValue(request.headers.get('x-messaging-profile-id'))

    if (userId) {
      return {
        userId,
        workspaceId,
        messagingProfileId
      }
    }

    return null
  } catch (error) {
    console.error('Error parsing session:', error)
    return null
  }
}

// Helper to get workspace context from request
export function getWorkspaceFromRequest(request) {
  const user = getUserFromRequest(request)
  if (!user) return null

  return {
    workspaceId: user.workspaceId,
    messagingProfileId: user.messagingProfileId,
    billingGroupId: user.billingGroupId
  }
}