const express = require('express');
const router = express.Router();
const industryController = require('../controllers/industryController');
const projectAllotmentController = require('../controllers/projectAllotmentController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

// All industry routes require authentication and industry role
router.use(authenticate, requireRole('industry'));

router.get('/overview', industryController.getOverview);
router.get('/projects', industryController.getDiscoverProjects);
router.post('/support', industryController.submitSupportOffer);

// Implementation projects view
router.get('/allotted-projects', projectAllotmentController.getProjects);
router.get('/projects/:id', projectAllotmentController.getProjectById);

module.exports = router;
