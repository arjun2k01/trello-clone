const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const cardController = require('../controllers/cardController');

router.use(protect); // All routes require authentication

router.post('/', cardController.createCard);
router.put('/:id', cardController.updateCard);
router.delete('/:id', cardController.deleteCard);
router.put('/:id/move', cardController.moveCard);
router.post('/:id/comments', cardController.addComment);
router.get('/:id/recommendations', cardController.getCardRecommendations);

module.exports = router;
