import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { boardAPI, cardAPI } from '../services/api';
import RecommendationsPanel from '../components/RecommendationsPanel';
import CardModal from '../components/CardModal';
import InviteModal from '../components/InviteModal';
import toast from 'react-hot-toast';

export default function BoardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newCardData, setNewCardData] = useState({ listId: null, title: '' });

  useEffect(() => {
    fetchBoard();
  }, [id]);

  const fetchBoard = async () => {
    try {
      const { data } = await boardAPI.getBoard(id);
      setBoard(data.data);
    } catch (error) {
      toast.error('Failed to load board');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // If dropped in same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    try {
      await cardAPI.moveCard(draggableId, {
        newListId: destination.droppableId,
        newPosition: destination.index,
      });

      // Update local state
      await fetchBoard();
      toast.success('Card moved!');
    } catch (error) {
      toast.error('Failed to move card');
    }
  };

  const handleCardClick = (card) => {
    setSelectedCard(card);
  };

  const handleCreateCard = async (listId) => {
    if (!newCardData.title.trim()) return;

    try {
      await cardAPI.createCard({
        title: newCardData.title,
        listId,
        boardId: id,
      });
      setNewCardData({ listId: null, title: '' });
      await fetchBoard();
      toast.success('Card created!');
    } catch (error) {
      toast.error('Failed to create card');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="bg-white bg-opacity-95 rounded-lg shadow-md p-4 mb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{board.title}</h1>
            {board.description && (
              <p className="text-sm text-gray-600">{board.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
          >
            + Invite
          </button>
          <div className="flex -space-x-2">
            {board.members?.slice(0, 3).map((member) => (
              <img
                key={member.user._id}
                src={member.user.avatar}
                alt={member.user.name}
                title={member.user.name}
                className="w-8 h-8 rounded-full border-2 border-white"
              />
            ))}
            {board.members?.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-semibold">
                +{board.members.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Board Area */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4 h-[calc(100vh-140px)]">
        {/* Lists Container */}
        <div className="bg-white bg-opacity-10 rounded-lg p-4 overflow-x-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full">
              {board.lists?.map((list) => (
                <Droppable key={list._id} droppableId={list._id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`bg-white rounded-lg p-3 min-w-[280px] max-w-[280px] flex flex-col ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : ''
                      }`}
                    >
                      {/* List Header */}
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-gray-800">{list.title}</h3>
                        <span className="bg-gray-200 px-2 py-1 rounded-full text-xs">
                          {list.cards?.length || 0}
                        </span>
                      </div>

                      {/* Cards */}
                      <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                        {list.cards?.map((card, index) => (
                          <Draggable key={card._id} draggableId={card._id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => handleCardClick(card)}
                                className={`bg-white p-3 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                                  selectedCard?._id === card._id
                                    ? 'border-l-primary bg-blue-50'
                                    : 'border-l-transparent'
                                } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                              >
                                <p className="text-sm text-gray-800 mb-2">{card.title}</p>
                                {card.dueDate && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                    📅 {new Date(card.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                                {card.priority && card.priority !== 'medium' && (
                                  <span className={`text-xs px-2 py-1 rounded ml-1 ${
                                    card.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                    card.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {card.priority === 'urgent' ? '🔥' :
                                     card.priority === 'high' ? '⚡' : '📌'} {card.priority}
                                  </span>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>

                      {/* Add Card */}
                      {newCardData.listId === list._id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={newCardData.title}
                            onChange={(e) => setNewCardData({ ...newCardData, title: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateCard(list._id)}
                            placeholder="Enter card title..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCreateCard(list._id)}
                              className="px-3 py-1 bg-primary text-white rounded text-sm"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => setNewCardData({ listId: null, title: '' })}
                              className="px-3 py-1 bg-gray-200 rounded text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setNewCardData({ listId: list._id, title: '' })}
                          className="text-left px-2 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm"
                        >
                          + Add card
                        </button>
                      )}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </div>

        {/* Smart Recommendations Panel - THE KEY FEATURE! */}
        <RecommendationsPanel selectedCard={selectedCard} onRefresh={fetchBoard} />
      </div>

      {/* Modals */}
      {showCardModal && (
        <CardModal
          card={selectedCard}
          onClose={() => setShowCardModal(false)}
          onUpdate={fetchBoard}
        />
      )}

      {showInviteModal && (
        <InviteModal
          boardId={id}
          onClose={() => setShowInviteModal(false)}
          onInvite={fetchBoard}
        />
      )}
    </div>
  );
}