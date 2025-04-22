/**
 * Format user data into a beautiful profile structure
 */
export function formatUserProfile(userData: any) {
  const formattedProfile = {
    id: userData.id,
    personalInfo: {
      firstName: userData.firstName,
      lastName: userData.lastName,
      fullName: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      username: userData.username,
      phoneNumber: userData.phoneNumber || 'Not provided',
    },
    accountInfo: {
      role: userData.role,
      status: userData.status,
      emailVerified: userData.emailVerified,
      termsAccepted: userData.termsAccepted,
      createdAt: userData.createdAt,
      lastUpdated: userData.updatedAt,
    }
  };
  
  // Add role-specific information
  if (userData.role === 'candidate') {
    formattedProfile['documents'] = {
      studentPermitImage: userData.studentPermitImage || null,
      proofOfEnrollmentImage: userData.proofOfEnrollmentImage || null,
    };
  }
  
  return formattedProfile;
} 