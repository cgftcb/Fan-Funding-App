import { Router } from 'express';
import {
  getSurgeryTypes,
  createSurgeryType,
  updateSurgeryType,
  setListingAdminFee,
  getSubscriptionTiers,
  createSubscriptionTier,
  updateSubscriptionTier,
  getDashboard,
  getAllListings,
  getAllUsers,
  handleInsuranceClaim,
  getInsuranceFeeConfigs,
  createInsuranceFeeConfig,
} from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticateToken, adminOnly);

// Dashboard
router.get('/dashboard', getDashboard);

// Surgery types
router.get('/surgery-types', getSurgeryTypes);
router.post('/surgery-types', createSurgeryType);
router.put('/surgery-types/:id', updateSurgeryType);

// Listing admin fee override
router.put('/listings/:listingId/admin-fee', setListingAdminFee);

// All listings & users
router.get('/listings', getAllListings);
router.get('/users', getAllUsers);

// Subscription tiers
router.get('/subscription-tiers', getSubscriptionTiers);
router.post('/subscription-tiers', createSubscriptionTier);
router.put('/subscription-tiers/:id', updateSubscriptionTier);

// Insurance claims
router.post('/listings/:listingId/insurance-claim', handleInsuranceClaim);

// Insurance fee configs
router.get('/insurance-fee-configs', getInsuranceFeeConfigs);
router.post('/insurance-fee-configs', createInsuranceFeeConfig);

export default router;
