const express = require('express');
const router = express.Router();
const governmentController = require('../controllers/governmentController');
const councilController = require('../controllers/councilController');
const projectAllotmentController = require('../controllers/projectAllotmentController');
const universityController = require('../controllers/universityController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

// All government routes require authentication and government role
router.use(authenticate, requireRole('government'));

// Overview & Analytics
router.get('/overview', governmentController.getOverview);
router.get('/problems', governmentController.getAllProblems);
router.patch('/problems/:id/status', governmentController.updateProblemStatus);
router.post('/challenges', governmentController.publishChallenge);
router.get('/map-problems', governmentController.getMapProblems);
router.get('/ai-insights', governmentController.getAiInsights);

// Council & Department Management
router.get('/categories', councilController.getCategories);
router.post('/categories', councilController.createCategory);
router.patch('/categories/:id', councilController.updateCategory);
router.get('/councils', councilController.getCouncils);
router.post('/councils', councilController.createCouncil);
router.get('/category-mappings', councilController.getCategoryMappings);
router.patch('/category-mappings/:id', councilController.updateCategoryMapping);
router.get('/council-workload', councilController.getCouncilWorkload);

// Problem Council Assignment
router.get('/problems/:id/council-recommendation', councilController.getProblemCouncilRecommendation);
router.post('/problems/:id/assign-council', councilController.assignCouncilToProblem);

// Project Allotment & Implementation Lifecycle
router.get('/projects', projectAllotmentController.getProjects);
router.get('/projects/:id', projectAllotmentController.getProjectById);
router.post('/projects', projectAllotmentController.createProject);
router.get('/projects/:id/recommendations', projectAllotmentController.getProjectPartnerRecommendations);
router.post('/projects/:id/allot', projectAllotmentController.allotProject);
router.post('/projects/:id/verify', projectAllotmentController.verifyProject);
router.patch('/milestones/:milestoneId', universityController.updateMilestone);
router.post('/projects/:projectId/milestones', universityController.addMilestone);

module.exports = router;

