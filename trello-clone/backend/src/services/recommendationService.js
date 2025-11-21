const Card = require('../models/Card');
const List = require('../models/List');

class RecommendationService {
  // Keywords for NLP analysis
  static urgentKeywords = ['urgent', 'asap', 'critical', 'emergency', 'immediately', 'high priority'];
  static todoKeywords = ['need to', 'should', 'must', 'have to', 'todo', 'task'];
  static inProgressKeywords = ['working on', 'started', 'in progress', 'currently', 'doing'];
  static doneKeywords = ['completed', 'finished', 'done', 'resolved', 'fixed'];
  static dateKeywords = ['today', 'tomorrow', 'next week', 'deadline', 'due', 'by'];

  // Main recommendation generator
  static async generateRecommendations(card) {
    const suggestions = [];
    
    try {
      // Get all cards in the same board for context
      const boardCards = await Card.find({ 
        board: card.board, 
        _id: { $ne: card._id },
        isArchived: false 
      }).populate('list');

      // Get all lists in the board
      const lists = await List.find({ board: card.board, isArchived: false });

      const cardText = `${card.title} ${card.description}`.toLowerCase();

      // 1. Due Date Recommendations
      const dueDateRec = this.analyzeDueDate(cardText, card);
      if (dueDateRec) suggestions.push(dueDateRec);

      // 2. List Movement Recommendations
      const listMovementRec = this.analyzeListMovement(cardText, card, lists);
      if (listMovementRec) suggestions.push(listMovementRec);

      // 3. Priority Recommendations
      const priorityRec = this.analyzePriority(cardText, card);
      if (priorityRec) suggestions.push(priorityRec);

      // 4. Related Cards (using TF-IDF similarity)
      const relatedCardsRec = await this.findRelatedCards(card, boardCards);
      if (relatedCardsRec) suggestions.push(relatedCardsRec);

      return {
        cardId: card._id,
        suggestions,
        analyzedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  // Analyze due date based on content
  static analyzeDueDate(text, card) {
    if (card.dueDate) return null; // Already has a due date

    let confidence = 'low';
    let suggestedDate = null;
    let reason = '';

    // Check for urgent keywords
    const hasUrgent = this.urgentKeywords.some(keyword => text.includes(keyword));
    
    // Check for date-related keywords
    const hasDateMention = this.dateKeywords.some(keyword => text.includes(keyword));

    if (hasUrgent) {
      // Suggest tomorrow for urgent tasks
      suggestedDate = new Date();
      suggestedDate.setDate(suggestedDate.getDate() + 1);
      confidence = 'high';
      reason = 'Contains urgent keywords suggesting immediate action';
    } else if (hasDateMention) {
      // Suggest 3 days for tasks with date mentions
      suggestedDate = new Date();
      suggestedDate.setDate(suggestedDate.getDate() + 3);
      confidence = 'medium';
      reason = 'Contains time-related keywords';
    } else if (text.length > 100) {
      // Complex tasks get a week
      suggestedDate = new Date();
      suggestedDate.setDate(suggestedDate.getDate() + 7);
      confidence = 'low';
      reason = 'Complex task detected - allocating more time';
    }

    if (suggestedDate) {
      return {
        type: 'due_date',
        title: 'Due Date Suggestion',
        description: reason,
        suggestedDate: suggestedDate.toISOString(),
        confidence
      };
    }

    return null;
  }

  // Analyze which list the card should be in
  static analyzeListMovement(text, card, lists) {
    const currentList = lists.find(l => l._id.toString() === card.list.toString());
    if (!currentList) return null;

    let suggestedList = null;
    let confidence = 'low';
    let reason = '';

    // Check if card content suggests it's done
    const isDone = this.doneKeywords.some(keyword => text.includes(keyword));
    if (isDone && currentList.title.toLowerCase() !== 'done') {
      const doneList = lists.find(l => l.title.toLowerCase().includes('done'));
      if (doneList) {
        suggestedList = doneList.title;
        confidence = 'high';
        reason = 'Card description contains completion keywords';
      }
    }

    // Check if card suggests work has started
    const isInProgress = this.inProgressKeywords.some(keyword => text.includes(keyword));
    if (isInProgress && !currentList.title.toLowerCase().includes('progress')) {
      const progressList = lists.find(l => l.title.toLowerCase().includes('progress'));
      if (progressList) {
        suggestedList = progressList.title;
        confidence = 'medium';
        reason = 'Card description indicates work has begun';
      }
    }

    if (suggestedList) {
      return {
        type: 'list_movement',
        title: 'List Movement Suggestion',
        description: reason,
        suggestedList,
        confidence
      };
    }

    return null;
  }

  // Analyze priority based on content
  static analyzePriority(text, card) {
    if (card.priority === 'urgent') return null; // Already highest priority

    let suggestedPriority = null;
    let confidence = 'low';
    let reason = '';

    // Check for urgent keywords
    const urgentCount = this.urgentKeywords.filter(keyword => text.includes(keyword)).length;
    
    if (urgentCount >= 2) {
      suggestedPriority = 'urgent';
      confidence = 'high';
      reason = 'Multiple urgent indicators found in text';
    } else if (urgentCount === 1) {
      suggestedPriority = 'high';
      confidence = 'medium';
      reason = 'Urgent keyword detected';
    } else if (text.includes('important') || text.includes('priority')) {
      suggestedPriority = 'high';
      confidence = 'medium';
      reason = 'Priority keyword mentioned';
    }

    if (suggestedPriority && suggestedPriority !== card.priority) {
      return {
        type: 'priority',
        title: 'Priority Adjustment',
        description: reason,
        suggestedPriority,
        confidence
      };
    }

    return null;
  }

  // Find related cards using simple keyword matching (TF-IDF-like approach)
  static async findRelatedCards(card, boardCards) {
    const cardText = `${card.title} ${card.description}`.toLowerCase();
    const words = cardText.split(/\W+/).filter(w => w.length > 3); // Filter short words
    
    const relatedCards = [];

    for (const otherCard of boardCards) {
      const otherText = `${otherCard.title} ${otherCard.description}`.toLowerCase();
      const otherWords = otherText.split(/\W+/).filter(w => w.length > 3);

      // Calculate simple similarity
      const commonWords = words.filter(word => otherWords.includes(word));
      const similarity = Math.round((commonWords.length / Math.max(words.length, otherWords.length)) * 100);

      if (similarity > 30) { // 30% similarity threshold
        relatedCards.push({
          title: otherCard.title,
          similarity,
          cardId: otherCard._id
        });
      }
    }

    if (relatedCards.length > 0) {
      // Sort by similarity and take top 3
      relatedCards.sort((a, b) => b.similarity - a.similarity);
      const topRelated = relatedCards.slice(0, 3);

      return {
        type: 'related_cards',
        title: 'Related Cards Found',
        description: 'These cards have similar content and might be grouped together',
        cards: topRelated,
        confidence: topRelated.length >= 2 ? 'high' : 'medium'
      };
    }

    return null;
  }
}

module.exports = RecommendationService;
