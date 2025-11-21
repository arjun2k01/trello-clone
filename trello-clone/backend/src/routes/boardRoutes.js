const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const boardController = require('../controllers/boardController');

router.use(protect); // All routes require authentication

router.route('/')
  .get(boardController.getBoards)
  .post(boardController.createBoard);

router.route('/:id')
  .get(boardController.getBoard)
  .put(boardController.updateBoard)
  .delete(boardController.deleteBoard);

router.post('/:id/invite', boardController.inviteMember);
router.delete('/:id/members/:userId', boardController.removeMember);

module.exports = router;