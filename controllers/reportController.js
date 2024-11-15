import Report from '../models/Report.js';
import Post from '../models/Post.js';
import logger from '../config/logger.js';

/**
 * @desc    Report a Post
 * @route   POST /reports/posts/:postId/report
 * @access  Protected
 */
export const reportPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) {
      logger.warn('Post not found in reportPost: %s', postId);
      return res.status(404).json({ error: 'Post not found' });
    }

    const report = new Report({
      user: userId,
      post: postId,
      reason,
    });

    await report.save();

    res.status(201).json({ message: 'Post reported successfully' });
    logger.info('Post reported by user %s: %s', userId, postId);
  } catch (error) {
    logger.error('Error reporting post: %o', error);
    res.status(500).json({ error: 'Failed to report post' });
  }
};

/**
 * @desc    Get All Reports
 * @route   GET /reports
 * @access  Admin
 */
export const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('user', 'id username')
      .populate('post', 'title');

    res.status(200).json(reports);
    logger.info('All reports fetched');
  } catch (error) {
    logger.error('Error fetching reports: %o', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

/**
 * @desc    Update Report Status
 * @route   PUT /reports/:reportId/status
 * @access  Admin
 */
export const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      logger.warn('Report not found: %s', reportId);
      return res.status(404).json({ error: 'Report not found' });
    }

    report.status = status;
    await report.save();

    res.status(200).json({ message: 'Report status updated' });
    logger.info('Report status updated: %s', reportId);
  } catch (error) {
    logger.error('Error updating report status: %o', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
}; 