import express from 'express';
import {
  getProblems,
  getProblemBySlug,
  runCode,
  submitCode,
  getProblemSubmissions,
  getProblemDiscussions,
  createDiscussion,
  upvoteDiscussion,
  addComment
} from '../controllers/problemsController.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuthMiddleware, getProblems);
router.get('/:slug', optionalAuthMiddleware, getProblemBySlug);
router.post('/:slug/run', optionalAuthMiddleware, runCode);
router.post('/:slug/submit', authMiddleware, submitCode);
router.get('/:slug/submissions', authMiddleware, getProblemSubmissions);

// Discussions & Solutions
router.get('/:slug/discussions', getProblemDiscussions);
router.post('/:slug/discussions', authMiddleware, createDiscussion);
router.post('/discussions/:id/upvote', authMiddleware, upvoteDiscussion);
router.post('/discussions/:id/comment', authMiddleware, addComment);

export default router;
