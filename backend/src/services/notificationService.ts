// Notification service - console-log based with email placeholders

export function notifyGoalReached(listingId: string, amount: number): void {
  console.log(`[NOTIFICATION] Goal reached for listing ${listingId}. Amount: $${amount.toFixed(2)}`);
  // TODO: Send email to patient notifying funds released to surgeon
  // TODO: Send email to surgeon notifying payment incoming
  // TODO: Send email to all contributors notifying goal reached
}

export function notifyExpired(listingId: string, refundedCount: number): void {
  console.log(`[NOTIFICATION] Listing ${listingId} expired. Refunded ${refundedCount} contributions.`);
  // TODO: Send email to patient notifying listing expired + insurance fee returned
  // TODO: Send email to contributors notifying refund issued
}

export function notifyPhotosReleased(listingId: string): void {
  console.log(`[NOTIFICATION] After photos released for listing ${listingId}.`);
  // TODO: Send email to qualifying contributors notifying after photos are available
  // TODO: Send email to patient confirming photo compliance complete
}

export function notifyAgreementRequired(listingId: string, role: 'patient' | 'surgeon'): void {
  console.log(`[NOTIFICATION] Agreement signature required by ${role} for listing ${listingId}.`);
  // TODO: Send email to patient or surgeon requesting signature
}

export function notifyContributionReceived(listingId: string, contributorEmail: string, amount: number): void {
  console.log(`[NOTIFICATION] Contribution of $${amount.toFixed(2)} received for listing ${listingId} from ${contributorEmail}.`);
  // TODO: Send receipt email to contributor
  // TODO: Send notification to patient
}

export function notifyInsuranceClaim(listingId: string, patientEmail: string): void {
  console.log(`[NOTIFICATION] Insurance claim filed for listing ${listingId}. Patient: ${patientEmail}`);
  // TODO: Send email to patient notifying insurance claim
  // TODO: Send admin alert
}

export function notifyNewListing(listingId: string, patientEmail: string): void {
  console.log(`[NOTIFICATION] New listing created: ${listingId} by ${patientEmail}`);
  // TODO: Send confirmation email to patient
}

export function notifySubscriptionActivated(surgeonEmail: string, tierName: string, endDate: Date): void {
  console.log(`[NOTIFICATION] Subscription activated for ${surgeonEmail}. Tier: ${tierName}. Expires: ${endDate.toISOString()}`);
  // TODO: Send subscription confirmation email
}

export function notifySubscriptionExpiring(surgeonEmail: string, daysLeft: number): void {
  console.log(`[NOTIFICATION] Subscription expiring soon for ${surgeonEmail}. Days left: ${daysLeft}`);
  // TODO: Send subscription renewal reminder email
}

export function notifyPhotoComplianceDeadline(listingId: string, patientEmail: string, daysLeft: number): void {
  console.log(`[NOTIFICATION] Photo upload deadline approaching for listing ${listingId}. Patient: ${patientEmail}. Days left: ${daysLeft}`);
  // TODO: Send reminder email to patient to upload required photos
}
