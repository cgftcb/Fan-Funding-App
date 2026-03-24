import { Router } from 'express';
import {
  createListing,
  getListings,
  getListing,
  updateListing,
  payInsuranceFee,
  fundedCheck,
  signAgreement,
  getMyListings,
} from '../controllers/listingController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/listings - public with optional auth
router.get('/', optionalAuth, getListings);

// GET /api/listings/my - get patient's own listings
router.get('/my', authenticateToken, getMyListings);

// POST /api/listings
router.post('/', authenticateToken, createListing);

// GET /api/listings/:id
router.get('/:id', optionalAuth, getListing);

// PUT /api/listings/:id
router.put('/:id', authenticateToken, updateListing);

// POST /api/listings/:id/pay-insurance
router.post('/:id/pay-insurance', authenticateToken, payInsuranceFee);

// POST /api/listings/:id/funded-check
router.post('/:id/funded-check', authenticateToken, fundedCheck);

// POST /api/listings/:id/agreement/sign
router.post('/:id/agreement/sign', authenticateToken, signAgreement);

export default router;
