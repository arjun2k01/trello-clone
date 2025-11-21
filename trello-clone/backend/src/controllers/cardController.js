const Card = require('../models/Card');
const List = require('../models/List');
const Board = require('../models/Board');
const RecommendationService = require('../services/recommendationService');

// @desc    Create a new card
// @route   POST /api/cards
// @access  Private
exports.createCard = async (req, res) => {
  try {
    const { title, description, listId, boardId, priority } = req.body;

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    const board = await Board.findById(boardId);
    if (!board.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const lastCard = await Card.findOne({ list: listId }).sort({ position: -1 });
    const position = lastCard ? lastCard.position + 1 : 0;

    const card = await Card.create({
      title,
      description,
      list: listId,
      board: boardId,
      position,
      priority: priority || 'medium',
      createdBy: req.user._id
    });

    list.cards.push(card._id);
    await list.save();

    const populatedCard = await Card.findById(card._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar');

    res.status(201).json({
      success: true,
      data: populatedCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating card',
      error: error.message
    });
  }
};

// @desc    Update a card
// @route   PUT /api/cards/:id
// @access  Private
exports.updateCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const board = await Board.findById(card.board);
    if (!board.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedCard = await Card.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar');

    res.status(200).json({
      success: true,
      data: updatedCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating card',
      error: error.message
    });
  }
};

// @desc    Delete a card
// @route   DELETE /api/cards/:id
// @access  Private
exports.deleteCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const board = await Board.findById(card.board);
    if (!board.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await List.findByIdAndUpdate(card.list, {
      $pull: { cards: card._id }
    });

    await Card.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting card',
      error: error.message
    });
  }
};

// @desc    Move a card
// @route   PUT /api/cards/:id/move
// @access  Private
exports.moveCard = async (req, res) => {
  try {
    const { listId, position } = req.body;
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const board = await Board.findById(card.board);
    if (!board.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (listId && listId !== card.list.toString()) {
      await List.findByIdAndUpdate(card.list, {
        $pull: { cards: card._id }
      });

      await List.findByIdAndUpdate(listId, {
        $push: { cards: card._id }
      });

      card.list = listId;
    }

    if (position !== undefined) {
      card.position = position;
    }

    await card.save();

    const updatedCard = await Card.findById(card._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar');

    res.status(200).json({
      success: true,
      data: updatedCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error moving card',
      error: error.message
    });
  }
};

// @desc    Add comment to card
// @route   POST /api/cards/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const board = await Board.findById(card.board);
    if (!board.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    card.comments.push({
      user: req.user._id,
      text,
      createdAt: new Date()
    });

    await card.save();

    const updatedCard = await Card.findById(card._id)
      .populate('comments.user', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar');

    res.status(201).json({
      success: true,
      data: updatedCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message
    });
  }
};

// @desc    Get card recommendations
// @route   GET /api/cards/:id/recommendations
// @access  Private
exports.getCardRecommendations = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)
      .populate('list')
      .populate('board');

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const board = await Board.findById(card.board);
    if (!board.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const recommendations = await RecommendationService.generateRecommendations(card);

    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recommendations',
      error: error.message
    });
  }
};
