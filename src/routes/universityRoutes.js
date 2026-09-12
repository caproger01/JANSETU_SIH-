const express = require('express');
const router = express.Router();
const universityController = require('../controllers/universityController');
const projectAllotmentController = require('../controllers/projectAllotmentController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

// All university routes require authentication and university role
router.use(authenticate, requireRole('university'));

router.get('/overview', universityController.getOverview);
router.get('/challenges', universityController.getChallenges);
router.post('/challenges/accept', universityController.acceptChallenge);
router.post('/projects/:projectId/milestones', universityController.addMilestone);
router.patch('/milestones/:milestoneId', universityController.updateMilestone);

// Implementation Projects & Progress
router.get('/projects', projectAllotmentController.getProjects);
router.get('/projects/:id', projectAllotmentController.getProjectById);
router.post('/projects/:id/progress', projectAllotmentController.submitProjectProgress);
router.post('/projects/:id/team', projectAllotmentController.updateProjectTeam);

module.exports = router;
