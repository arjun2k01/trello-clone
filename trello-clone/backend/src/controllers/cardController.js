// Add at the top with other imports
const RecommendationService = require('../services/recommendationService');

// Add this function with other exports
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

    // Check if user has access to the board
    const board = await Board.findById(card.board);
    if (!board.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Generate recommendations
    const recommendations = await RecommendationService.generateRecommendations(card);

    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching recommendations',
      error: error.message
    });
  }
};
