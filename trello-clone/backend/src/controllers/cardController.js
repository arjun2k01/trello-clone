const Card = require('../models/Card');
const List = require('../models/List');
const Board = require('../models/Board');
const RecommendationService = require('../services/recommendationService');

// @desc    Create new card
// @route   POST /api/cards
// @access  Private
exports.createCard = async (req, res) => {
  try {
    const { title, description, listId, boardId, dueDate, priority } = req.body;

    // Verify board access
    const board = await Board.findById(boardId);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    // Get position for new card
    const list = await List.findById(listId);
    const position = list.cards.length;

    const card = await Card.create({
      title,
      description: description || '',
      list: listId,
      board: boardId,
      position,
      dueDate: dueDate || null,
      priority: priority || 'medium',
      createdBy: req.user._id
    });

    // Add card to list
    list.cards.push(card._id);
    await list.save();

    // Populate card data
    await card.populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'assignedTo', select: 'name email avatar' }
    ]);

    // Generate recommendations
    const recommendations = await RecommendationService.generateRecommendations(card._id);

    res.status(201).json({
      success: true,
      message: 'Card created successfully',
      data: {
        card,
        recommendations
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error creating card',
      error: error.message 
    });
  }
};

// @desc    Update card
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

    // Verify board access
    const board = await Board.findById(card.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const { title, description, dueDate, priority, assignedTo } = req.body;
    
    if (title) card.title = title;
    if (description !== undefined) card.description = description;
    if (dueDate !== undefined) card.dueDate = dueDate;
    if (priority) card.priority = priority;
    if (assignedTo !== undefined) card.assignedTo = assignedTo;

    await card.save();
    await card.populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'assignedTo', select: 'name email avatar' }
    ]);

    // Generate fresh recommendations
    const recommendations = await RecommendationService.generateRecommendations(card._id);

    res.status(200).json({
      success: true,
      message: 'Card updated successfully',
      data: {
        card,
        recommendations
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error updating card',
      error: error.message 
    });
  }
};

// @desc    Move card to different list
// @route   PUT /api/cards/:id/move
// @access  Private
exports.moveCard = async (req, res) => {
  try {
    const { newListId, newPosition } = req.body;
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ 
        success: false,
        message: 'Card not found' 
      });
    }

    // Verify board access
    const board = await Board.findById(card.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const oldListId = card.list;
    const oldPosition = card.position;

    // Remove from old list
    const oldList = await List.findById(oldListId);
    oldList.cards.splice(oldPosition, 1);
    await oldList.save();

    // Add to new list
    const newList = await List.findById(newListId);
    newList.cards.splice(newPosition, 0, card._id);
    await newList.save();

    // Update card
    card.list = newListId;
    card.position = newPosition;
    await card.save();

    await card.populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'list', select: 'title' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Card moved successfully',
      data: card
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error moving card',
      error: error.message 
    });
  }
};

// @desc    Delete card
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

    // Verify board access
    const board = await Board.findById(card.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    // Remove from list
    await List.findByIdAndUpdate(card.list, {
      $pull: { cards: card._id }
    });

    await card.deleteOne();

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

// @desc    Get card recommendations
// @route   GET /api/cards/:id/recommendations
// @access  Private
exports.getRecommendations = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ 
        success: false,
        message: 'Card not found' 
      });
    }

    // Verify board access
    const board = await Board.findById(card.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const recommendations = await RecommendationService.generateRecommendations(card._id);

    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error getting recommendations',
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

    // Verify board access
    const board = await Board.findById(card.board);
    if (!board || !board.isMember(req.user._id)) {
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
    await card.populate('comments.user', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: card.comments
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error adding comment',
      error: error.message 
    });
  }
};