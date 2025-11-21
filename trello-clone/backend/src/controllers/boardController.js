const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');
const User = require('../models/User');

// @desc    Get all boards for user
// @route   GET /api/boards
// @access  Private
exports.getBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ],
      isArchived: false
    })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: boards.length,
      data: boards
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching boards',
      error: error.message 
    });
  }
};

// @desc    Get single board with lists and cards
// @route   GET /api/boards/:id
// @access  Private
exports.getBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .populate({
        path: 'lists',
        populate: {
          path: 'cards',
          populate: [
            { path: 'createdBy', select: 'name email avatar' },
            { path: 'assignedTo', select: 'name email avatar' }
          ]
        }
      });

    if (!board) {
      return res.status(404).json({ 
        success: false,
        message: 'Board not found' 
      });
    }

    // Check if user has access
    if (!board.isMember(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    res.status(200).json({
      success: true,
      data: board
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching board',
      error: error.message 
    });
  }
};

// @desc    Create new board
// @route   POST /api/boards
// @access  Private
exports.createBoard = async (req, res) => {
  try {
    const { title, description, background } = req.body;

    const board = await Board.create({
      title,
      description,
      background: background || '#0079bf',
      owner: req.user._id,
      members: [{
        user: req.user._id,
        role: 'owner'
      }]
    });

    // Add board to user's boards
    await User.findByIdAndUpdate(req.user._id, {
      $push: { boards: board._id }
    });

    // Create default lists
    const defaultLists = ['To Do', 'In Progress', 'Done'];
    const lists = await Promise.all(
      defaultLists.map((title, index) => 
        List.create({
          title,
          board: board._id,
          position: index
        })
      )
    );

    // Add lists to board
    board.lists = lists.map(list => list._id);
    await board.save();

    // Populate board data
    await board.populate('owner', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Board created successfully',
      data: board
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error creating board',
      error: error.message 
    });
  }
};

// @desc    Update board
// @route   PUT /api/boards/:id
// @access  Private
exports.updateBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ 
        success: false,
        message: 'Board not found' 
      });
    }

    // Check if user is owner or member
    if (!board.isMember(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const { title, description, background } = req.body;
    
    if (title) board.title = title;
    if (description !== undefined) board.description = description;
    if (background) board.background = background;

    await board.save();

    res.status(200).json({
      success: true,
      message: 'Board updated successfully',
      data: board
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error updating board',
      error: error.message 
    });
  }
};

// @desc    Delete board
// @route   DELETE /api/boards/:id
// @access  Private
exports.deleteBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ 
        success: false,
        message: 'Board not found' 
      });
    }

    // Only owner can delete
    if (!board.isOwner(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Only owner can delete board' 
      });
    }

    // Delete all lists and cards
    await List.deleteMany({ board: board._id });
    await Card.deleteMany({ board: board._id });
    
    // Remove board from users
    await User.updateMany(
      { boards: board._id },
      { $pull: { boards: board._id } }
    );

    await board.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Board deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error deleting board',
      error: error.message 
    });
  }
};

// @desc    Invite member to board
// @route   POST /api/boards/:id/invite
// @access  Private
exports.inviteMember = async (req, res) => {
  try {
    const { email } = req.body;
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ 
        success: false,
        message: 'Board not found' 
      });
    }

    // Only owner can invite
    if (!board.isOwner(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Only owner can invite members' 
      });
    }

    // Find user by email
    const userToInvite = await User.findOne({ email });
    if (!userToInvite) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found with this email' 
      });
    }

    // Check if already member
    if (board.isMember(userToInvite._id)) {
      return res.status(400).json({ 
        success: false,
        message: 'User is already a member' 
      });
    }

    // Add member
    board.members.push({
      user: userToInvite._id,
      role: 'member'
    });
    await board.save();

    // Add board to user
    await User.findByIdAndUpdate(userToInvite._id, {
      $push: { boards: board._id }
    });

    await board.populate('members.user', 'name email avatar');

    res.status(200).json({
      success: true,
      message: 'Member invited successfully',
      data: board
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error inviting member',
      error: error.message 
    });
  }
};

// @desc    Remove member from board
// @route   DELETE /api/boards/:id/members/:userId
// @access  Private
exports.removeMember = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ 
        success: false,
        message: 'Board not found' 
      });
    }

    // Only owner can remove
    if (!board.isOwner(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Only owner can remove members' 
      });
    }

    // Cannot remove owner
    if (board.owner.toString() === req.params.userId) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot remove board owner' 
      });
    }

    // Remove member
    board.members = board.members.filter(
      member => member.user.toString() !== req.params.userId
    );
    await board.save();

    // Remove board from user
    await User.findByIdAndUpdate(req.params.userId, {
      $pull: { boards: board._id }
    });

    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error removing member',
      error: error.message 
    });
  }
};