import { Router } from 'express';
import {
  requireNeonPocAdmin,
  requireNeonPocAuth,
} from '../middlewares/neonAuthPoc.middleware.js';
import ApiResponse from '../utils/ApiResponse.js';

const router = Router();

router.get('/session', requireNeonPocAuth, (req, res) => {
  res.status(200).json(
    new ApiResponse(200, {
      userId: req.neonAuth.sub,
      role: req.neonAuth.role,
    })
  );
});

router.get('/admin', requireNeonPocAuth, requireNeonPocAdmin, (req, res) => {
  res.status(200).json(
    new ApiResponse(200, {
      userId: req.neonAuth.sub,
      role: req.neonAuth.applicationRole,
    })
  );
});

export default router;
