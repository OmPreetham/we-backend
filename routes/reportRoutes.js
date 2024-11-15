import express from 'express';
import { reportPost, getAllReports, updateReportStatus } from '../controllers/reportController.js';
import { authenticateToken } from '../middleware/auth.js';
import { authorizeAdmin } from '../middleware/authorize.js';
import { param, body } from 'express-validator';

const router = express.Router();

// Get all reports (Admin only)
router.get(
  '/',
  authenticateToken,
  authorizeAdmin,
  getAllReports
);

// Report a post
router.post(
    '/posts/:postId/report',
    authenticateToken,
    [param('postId').isMongoId().withMessage('Invalid Post ID')],
    reportPost
  );

// Update report status (Admin only)
router.put(
  '/reports/:reportId/status',
  authenticateToken,
  authorizeAdmin,
  [
    param('reportId').isMongoId().withMessage('Invalid Report ID'),
    body('status').isIn(['pending', 'reviewed', 'resolved']).withMessage('Invalid status'),
  ],
  updateReportStatus
);

export default router; 