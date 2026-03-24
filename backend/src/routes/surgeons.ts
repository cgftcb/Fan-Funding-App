import { Router } from 'express';
import {
  getSurgeonProfile,
  updateSurgeonProfile,
  subscribe,
  getSuggestedSurgeons,
  signAgreement,
  getSurgeonListings,
} from '../controllers/surgeonController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/surgeons/suggested - public
router.get('/suggested', optionalAuth, getSuggestedSurgeons);

// GET /api/surgeons/profile - requires auth
router.get('/profile', authenticateToken, getSurgeonProfile);

// PUT /api/surgeons/profile
router.put('/profile', authenticateToken, updateSurgeonProfile);

// POST /api/surgeons/subscribe
router.post('/subscribe', authenticateToken, subscribe);

// GET /api/surgeons/listings
router.get('/listings', authenticateToken, getSurgeonListings);

// POST /api/surgeons/agreement/:listingId/sign
router.post('/agreement/:listingId/sign', authenticateToken, signAgreement);

export default router;
