import { Router } from 'express';
import { getProfile, updateProfile, uploadAvatar } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { uploadAvatar as uploadAvatarMiddleware } from '../middleware/upload';

const router = Router();

// GET /api/users/profile
router.get('/profile', authenticateToken, getProfile);

// PUT /api/users/profile
router.put('/profile', authenticateToken, updateProfile);

// POST /api/users/profile/avatar
router.post('/profile/avatar', authenticateToken, uploadAvatarMiddleware.single('avatar'), uploadAvatar);

export default router;
