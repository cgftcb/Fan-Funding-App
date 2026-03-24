import { Router } from 'express';
import {
  contribute,
  getMyContributions,
  getListingContributions,
} from '../controllers/contributionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/contributions/:listingId
router.post('/:listingId', authenticateToken, contribute);

// GET /api/contributions/my
router.get('/my', authenticateToken, getMyContributions);

// GET /api/contributions/listing/:listingId
router.get('/listing/:listingId', authenticateToken, getListingContributions);

export default router;
