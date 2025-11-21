import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { boardAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoard, setNewBoard] = useState({ title: '', description: '', background: '#0079bf' });
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const { data } = await boardAPI.getBoards();
      setBoards(data.data);
    } catch (error) {
      toast.error('Failed to fetch boards');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    try {
      const { data } = await boardAPI.createBoard(newBoard);
      toast.success('Board created!');
      setBoards([data.data, ...boards]);
      setShowCreateModal(false);
      setNewBoard({ title: '', description: '', background: '#0079bf' });
      navigate(`/board/${data.data._id}`);
    } catch (error) {
      toast.error('Failed to create board');
    }
  };

  const bgColors = [
    { name: 'Blue', value: '#0079bf' },
    { name: 'Green', value: '#61bd4f' },
    { name: 'Purple', value: '#c377e0' },
    { name: 'Red', value: '#eb5a46' },
    { name: 'Orange', value: '#ff9f1a' },
    { name: 'Teal', value: '#00aecc' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🎯 My Boards</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Boards Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Create New Board Card */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 border-2 border-dashed border-white rounded-lg p-8 flex flex-col items-center justify-center min-h-[160px] transition-all"
          >
            <div className="text-5xl mb-3">➕</div>
            <div className="text-white font-semibold text-lg">Create New Board</div>
          </button>

          {/* Existing Boards */}
          {boards.map((board) => (
            <div
              key={board._id}
              onClick={() => navigate(`/board/${board._id}`)}
              className="rounded-lg p-6 cursor-pointer transition-all hover:opacity-90 hover:shadow-xl min-h-[160px] flex flex-col"
              style={{ background: board.background || '#0079bf' }}
            >
              <h3 className="text-white font-bold text-xl mb-2">{board.title}</h3>
              {board.description && (
                <p className="text-white text-opacity-90 text-sm line-clamp-2 mb-3">
                  {board.description}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between text-white text-sm">
                <span>{board.lists?.length || 0} lists</span>
                <span>{board.members?.length || 0} members</span>
              </div>
            </div>
          ))}
        </div>

        {boards.length === 0 && (
          <div className="text-center text-white mt-16">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-semibold mb-2">No boards yet</h3>
            <p className="text-white text-opacity-80">Create your first board to get started!</p>
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Create Board</h2>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Board Title *
                </label>
                <input
                  type="text"
                  value={newBoard.title}
                  onChange={(e) => setNewBoard({ ...newBoard, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Project Management"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newBoard.description}
                  onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  rows="3"
                  placeholder="What is this board about?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {bgColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewBoard({ ...newBoard, background: color.value })}
                      className={`w-full h-10 rounded-lg transition-all ${
                        newBoard.background === color.value ? 'ring-4 ring-gray-400' : ''
                      }`}
                      style={{ background: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
                >
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}