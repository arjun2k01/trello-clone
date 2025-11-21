const natural = require('natural');
const Card = require('../models/Card');

// NLP tokenizer and TF-IDF
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

class RecommendationService {
  
  // Analyze card content and generate recommendations
  static async generateRecommendations(cardId) {
    try {
      const card = await Card.findById(cardId)
        .populate('list')
        .populate('board');
      
      if (!card) return null;

      const recommendations = {
        cardId: card._id,
        suggestions: []
      };

      // 1. Due Date Recommendations
      const dueDateSuggestion = this.suggestDueDate(card);
      if (dueDateSuggestion) {
        recommendations.suggestions.push(dueDateSuggestion);
      }

      // 2. List Movement Recommendations
      const listMovementSuggestion = this.suggestListMovement(card);
      if (listMovementSuggestion) {
        recommendations.suggestions.push(listMovementSuggestion);
      }

      // 3. Related Cards Recommendations
      const relatedCards = await this.findRelatedCards(card);
      if (relatedCards.length > 0) {
        recommendations.suggestions.push({
          type: 'related_cards',
          title: 'Related Cards',
          description: 'These cards have similar content and might be grouped together',
          cards: relatedCards,
          confidence: 'medium'
        });
      }

      // 4. Priority Recommendations
      const prioritySuggestion = this.suggestPriority(card);
      if (prioritySuggestion) {
        recommendations.suggestions.push(prioritySuggestion);
      }

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return null;
    }
  }

  // Suggest due date based on keywords
  static suggestDueDate(card) {
    const content = `${card.title} ${card.description}`.toLowerCase();
    const tokens = tokenizer.tokenize(content);

    const urgencyKeywords = {
      today: ['today', 'now', 'immediate', 'asap', 'immediately'],
      tomorrow: ['tomorrow', 'urgent', 'critical'],
      thisWeek: ['this week', 'soon', 'shortly', 'quickly'],
      nextWeek: ['next week', 'upcoming', 'later'],
      twoWeeks: ['two weeks', 'couple weeks', 'fortnight']
    };

    let suggestedDate = null;
    let reason = '';
    let confidence = 'low';

    for (const token of tokens) {
      if (urgencyKeywords.today.includes(token)) {
        suggestedDate = new Date();
        suggestedDate.setHours(23, 59, 59, 999);
        reason = `Detected urgent keyword: "${token}"`;
        confidence = 'high';
        break;
      } else if (urgencyKeywords.tomorrow.includes(token)) {
        suggestedDate = new Date();
        suggestedDate.setDate(suggestedDate.getDate() + 1);
        reason = `Detected high priority keyword: "${token}"`;
        confidence = 'high';
        break;
      } else if (urgencyKeywords.thisWeek.some(kw => content.includes(kw))) {
        suggestedDate = new Date();
        suggestedDate.setDate(suggestedDate.getDate() + 3);
        reason = 'Detected "this week" timeframe';
        confidence = 'medium';
        break;
      } else if (urgencyKeywords.nextWeek.some(kw => content.includes(kw))) {
        suggestedDate = new Date();
        suggestedDate.setDate(suggestedDate.getDate() + 7);
        reason = 'Detected "next week" timeframe';
        confidence = 'medium';
        break;
      }
    }

    // Default suggestion if no specific keywords found but no due date set
    if (!suggestedDate && !card.dueDate) {
      suggestedDate = new Date();
      suggestedDate.setDate(suggestedDate.getDate() + 5);
      reason = 'Recommended default due date (5 days)';
      confidence = 'low';
    }

    if (suggestedDate && !card.dueDate) {
      return {
        type: 'due_date',
        title: 'Suggested Due Date',
        description: reason,
        suggestedDate: suggestedDate.toISOString(),
        confidence
      };
    }

    return null;
  }

  // Suggest list movement based on status keywords
  static suggestListMovement(card) {
    const content = `${card.title} ${card.description}`.toLowerCase();
    const tokens = tokenizer.tokenize(content);

    const statusKeywords = {
      inProgress: ['started', 'working', 'began', 'begun', 'implementing', 'developing', 'in progress'],
      done: ['done', 'completed', 'finished', 'complete', 'resolved', 'fixed', 'closed'],
      blocked: ['blocked', 'stuck', 'issue', 'problem', 'waiting', 'pending', 'hold'],
      testing: ['testing', 'test', 'qa', 'review', 'checking']
    };

    let suggestedList = null;
    let reason = '';
    let confidence = 'low';

    // Check for status keywords
    for (const token of tokens) {
      if (statusKeywords.done.includes(token)) {
        suggestedList = 'Done';
        reason = `Detected completion keyword: "${token}"`;
        confidence = 'high';
        break;
      } else if (statusKeywords.blocked.includes(token)) {
        suggestedList = 'Blocked';
        reason = `Detected blocking keyword: "${token}"`;
        confidence = 'high';
        break;
      } else if (statusKeywords.inProgress.some(kw => content.includes(kw))) {
        suggestedList = 'In Progress';
        reason = 'Detected work-in-progress indicators';
        confidence = 'medium';
        break;
      } else if (statusKeywords.testing.includes(token)) {
        suggestedList = 'Testing';
        reason = `Detected testing keyword: "${token}"`;
        confidence = 'medium';
        break;
      }
    }

    if (suggestedList && card.list && card.list.title !== suggestedList) {
      return {
        type: 'list_movement',
        title: 'Suggested List Movement',
        description: reason,
        currentList: card.list.title,
        suggestedList,
        confidence
      };
    }

    return null;
  }

  // Find related cards using TF-IDF and cosine similarity
  static async findRelatedCards(card) {
    try {
      const allCards = await Card.find({
        board: card.board,
        _id: { $ne: card._id },
        isArchived: false
      }).limit(50);

      if (allCards.length === 0) return [];

      const tfidf = new TfIdf();
      
      // Add current card
      const currentContent = `${card.title} ${card.description}`;
      tfidf.addDocument(currentContent);

      // Add all other cards
      const cardContents = allCards.map(c => `${c.title} ${c.description}`);
      cardContents.forEach(content => tfidf.addDocument(content));

      // Calculate similarity scores
      const relatedCards = [];
      tfidf.tfidfs(currentContent, (i, measure) => {
        if (i > 0 && measure > 0.3) { // i=0 is current card, threshold 0.3
          relatedCards.push({
            card: allCards[i - 1],
            similarity: measure
          });
        }
      });

      // Sort by similarity and return top 3
      return relatedCards
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
        .map(item => ({
          _id: item.card._id,
          title: item.card.title,
          list: item.card.list,
          similarity: Math.round(item.similarity * 100)
        }));
    } catch (error) {
      console.error('Error finding related cards:', error);
      return [];
    }
  }

  // Suggest priority based on keywords
  static suggestPriority(card) {
    const content = `${card.title} ${card.description}`.toLowerCase();
    const tokens = tokenizer.tokenize(content);

    const priorityKeywords = {
      urgent: ['urgent', 'critical', 'asap', 'immediately', 'emergency'],
      high: ['important', 'high', 'priority', 'crucial', 'essential'],
      low: ['minor', 'low', 'trivial', 'nice to have', 'optional']
    };

    let suggestedPriority = null;
    let reason = '';
    let confidence = 'low';

    for (const token of tokens) {
      if (priorityKeywords.urgent.includes(token)) {
        suggestedPriority = 'urgent';
        reason = `Detected urgent keyword: "${token}"`;
        confidence = 'high';
        break;
      } else if (priorityKeywords.high.includes(token)) {
        suggestedPriority = 'high';
        reason = `Detected high priority keyword: "${token}"`;
        confidence = 'medium';
        break;
      } else if (priorityKeywords.low.includes(token)) {
        suggestedPriority = 'low';
        reason = `Detected low priority keyword: "${token}"`;
        confidence = 'medium';
        break;
      }
    }

    if (suggestedPriority && card.priority !== suggestedPriority) {
      return {
        type: 'priority',
        title: 'Suggested Priority',
        description: reason,
        currentPriority: card.priority,
        suggestedPriority,
        confidence
      };
    }

    return null;
  }

  // Get board-level recommendations
  static async getBoardRecommendations(boardId) {
    try {
      const cards = await Card.find({ 
        board: boardId, 
        isArchived: false 
      }).populate('list');

      const recommendations = [];

      for (const card of cards) {
        const cardRecommendations = await this.generateRecommendations(card._id);
        if (cardRecommendations && cardRecommendations.suggestions.length > 0) {
          recommendations.push(cardRecommendations);
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Error generating board recommendations:', error);
      return [];
    }
  }
}

module.exports = RecommendationService;