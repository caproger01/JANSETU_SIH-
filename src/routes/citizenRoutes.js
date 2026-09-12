const express = require('express');
const router = express.Router();
const citizenController = require('../controllers/citizenController');
const projectAllotmentController = require('../controllers/projectAllotmentController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// All citizen routes require authentication and citizen role
router.use(authenticate, requireRole('citizen'));

router.get('/overview', citizenController.getOverview);
router.get('/problems', citizenController.getProblems);
router.get('/problems/:id', citizenController.getProblemById);
router.get('/problems/:id/progress', projectAllotmentController.getCitizenProblemProgress);
router.post('/pre-screen', citizenController.preScreen);
router.post('/problems', upload.array('images', 5), citizenController.createProblem);
router.get('/notices', citizenController.getPublicNotices);
router.delete('/problems/:id', citizenController.deleteProblem);

module.exports = router;
