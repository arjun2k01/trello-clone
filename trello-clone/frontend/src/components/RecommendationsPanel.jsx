import { useState, useEffect } from 'react';
import { cardAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function RecommendationsPanel({ selectedCard, onRefresh }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCard) {
      fetchRecommendations();
    } else {
      setRecommendations(null);
    }
  }, [selectedCard]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const { data } = await cardAPI.getRecommendations(selectedCard._id);
      setRecommendations(data.data);
    } catch (error) {
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendation = async (rec) => {
    try {
      const updates = {};
      
      if (rec.type === 'due_date') {
        updates.dueDate = rec.suggestedDate;
      } else if (rec.type === 'priority') {
        updates.priority = rec.suggestedPriority;
      }

      if (Object.keys(updates).length > 0) {
        await cardAPI.updateCard(selectedCard._id, updates);
        toast.success('Recommendation applied!');
        onRefresh();
      }
    } catch (error) {
      toast.error('Failed to apply recommendation');
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      due_date: '📅',
      list_movement: '➡️',
      related_cards: '🔗',
      priority: '⚡',
    };
    return icons[type] || '💡';
  };

  const getTypeColor = (type) => {
    const colors = {
      due_date: 'bg-yellow-50 border-yellow-200',
      list_movement: 'bg-blue-50 border-blue-200',
      related_cards: 'bg-green-50 border-green-200',
      priority: 'bg-red-50 border-red-200',
    };
    return colors[type] || 'bg-gray-50 border-gray-200';
  };

  const getConfidenceColor = (confidence) => {
    const colors = {
      high: 'bg-green-500',
      medium: 'bg-yellow-500',
      low: 'bg-red-500',
    };
    return colors[confidence] || 'bg-gray-500';
  };

  const getConfidenceWidth = (confidence) => {
    const widths = {
      high: 'w-11/12',
      medium: 'w-7/12',
      low: 'w-4/12',
    };
    return widths[confidence] || 'w-1/2';
  };

  return (
    <div className="bg-white bg-opacity-95 rounded-lg shadow-md p-5 overflow-y-auto">
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          🤖 Smart Recommendations
        </h2>
        <span className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
          AI
        </span>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-lg mb-4 text-sm">
        <div className="font-semibold mb-1">💡 How It Works:</div>
        <div className="text-white text-opacity-90">
          Our NLP engine analyzes card content using keyword detection, TF-IDF, and pattern matching to suggest improvements.
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : !selectedCard ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-3">🎯</div>
          <div className="font-semibold text-base mb-2">Select a card to see recommendations</div>
          <div className="text-sm text-gray-400">
            Our AI will analyze the card and suggest improvements
          </div>
        </div>
      ) : recommendations?.suggestions?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-3">💭</div>
          <div className="font-semibold text-base mb-2">No recommendations available</div>
          <div className="text-sm text-gray-400">
            This card doesn't have actionable suggestions at the moment
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations?.suggestions?.map((rec, index) => (
            <div
              key={index}
              className={`border-2 rounded-lg p-4 transition-all hover:shadow-md ${getTypeColor(
                rec.type
              )}`}
            >
              {/* Type Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{getTypeIcon(rec.type)}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  {rec.type.replace('_', ' ')}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-gray-800 mb-2">{rec.title}</h3>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">{rec.description}</p>

              {/* Suggestion */}
              {rec.type === 'due_date' && rec.suggestedDate && (
                <div className="bg-blue-100 border-l-4 border-blue-500 p-3 mb-3">
                  <div className="text-sm font-semibold text-blue-800">
                    💡 Suggested: {new Date(rec.suggestedDate).toLocaleDateString()}
                  </div>
                </div>
              )}

              {rec.type === 'list_movement' && rec.suggestedList && (
                <div className="bg-blue-100 border-l-4 border-blue-500 p-3 mb-3">
                  <div className="text-sm font-semibold text-blue-800">
                    💡 Suggested: Move to "{rec.suggestedList}"
                  </div>
                </div>
              )}

              {rec.type === 'priority' && rec.suggestedPriority && (
                <div className="bg-blue-100 border-l-4 border-blue-500 p-3 mb-3">
                  <div className="text-sm font-semibold text-blue-800">
                    💡 Suggested: Change to "{rec.suggestedPriority}" priority
                  </div>
                </div>
              )}

              {/* Related Cards */}
              {rec.type === 'related_cards' && rec.cards && rec.cards.length > 0 && (
                <div className="space-y-2 mb-3">
                  {rec.cards.map((relatedCard, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2 rounded border-l-2 border-blue-500 text-sm"
                    >
                      <div className="font-medium text-gray-800">{relatedCard.title}</div>
                      <div className="text-blue-600 font-semibold text-xs">
                        {relatedCard.similarity}% match
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Confidence Bar */}
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                <span className="font-medium">Confidence:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all ${getConfidenceColor(
                      rec.confidence
                    )} ${getConfidenceWidth(rec.confidence)}`}
                  ></div>
                </div>
                <span className="font-semibold capitalize">{rec.confidence}</span>
              </div>

              {/* Apply Button */}
              {(rec.type === 'due_date' || rec.type === 'priority') && (
                <button
                  onClick={() => applyRecommendation(rec)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Apply Suggestion
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected Card Info */}
      {selectedCard && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Selected Card:</div>
          <div className="text-sm font-medium text-gray-800">{selectedCard.title}</div>
          {selectedCard.description && (
            <div className="text-xs text-gray-600 mt-1">{selectedCard.description}</div>
          )}
        </div>
      )}
    </div>
  );
}