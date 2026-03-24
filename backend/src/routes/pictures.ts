import { Router } from 'express';
import {
  uploadPicture,
  getPicture,
  getListingPictures,
  releasePictures,
} from '../controllers/pictureController';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { uploadPicture as uploadPictureMiddleware } from '../middleware/upload';

const router = Router();

// POST /api/pictures/listing/:listingId/upload
router.post(
  '/listing/:listingId/upload',
  authenticateToken,
  uploadPictureMiddleware.single('picture'),
  uploadPicture
);

// GET /api/pictures/listing/:listingId
router.get('/listing/:listingId', optionalAuth, getListingPictures);

// POST /api/pictures/listing/:listingId/release
router.post('/listing/:listingId/release', authenticateToken, releasePictures);

// GET /api/pictures/:pictureId/view
router.get('/:pictureId/view', optionalAuth, getPicture);

export default router;
