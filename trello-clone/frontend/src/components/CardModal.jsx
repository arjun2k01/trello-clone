import { useState } from "react";
import { cardAPI } from "../services/api";
import toast from "react-hot-toast";

export default function CardModal({ card, onClose, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card?.title || "");
  const [description, setDescription] = useState(card?.description || "");
  const [priority, setPriority] = useState(card?.priority || "medium");
  const [dueDate, setDueDate] = useState(card?.dueDate ? card.dueDate.slice(0,10) : "");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  if (!card) return null;

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await cardAPI.updateCard(card._id, { title, description, priority, dueDate });
      toast.success("Card updated!");
      setEditing(false);
      onUpdate();
    } catch (e) {
      toast.error("Failed to update card");
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setLoading(true);
    try {
      await cardAPI.addComment(card._id, comment);
      toast.success("Comment added");
      setComment("");
      onUpdate();
    } catch (e) {
      toast.error("Failed to add comment");
    } finally {
      setLoading(false);
    }
  };

  const priorities = ["low", "medium", "high", "urgent"];

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 transition-all">
      <div className="bg-white rounded-lg p-8 max-w-lg w-full shadow-xl relative">
        {/* Header */}
        <h2 className="text-2xl font-bold mb-2">{editing ? "Edit Card" : "Card Details"}</h2>
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-gray-500 hover:text-gray-800 text-2xl"
          aria-label="Close"
        >×</button>
        {/* Card fields */}
        <div className="space-y-3 mb-4">
          {editing ? (
            <>
              <input
                className="w-full px-3 py-2 border rounded"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Card title"
                autoFocus
              />
              <textarea
                className="w-full px-3 py-2 border rounded"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Card description"
              />
              <div className="flex gap-3 items-center">
                <label className="font-medium text-sm">Priority:</label>
                {priorities.map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`px-3 py-1 rounded capitalize border ${p===priority ? 'bg-primary text-white' : 'bg-gray-100'}`}
                    onClick={() => setPriority(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div>
                <label className="font-medium text-sm mr-3">Due Date:</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="px-3 py-1 rounded border"
                />
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold text-lg">{title}</div>
              <div className="mb-2 text-gray-700">{description || <em className="text-gray-400">No description</em>}</div>
              <div className="flex items-center gap-4 mt-2">
                <span className={`px-2 py-1 rounded text-xs bg-gray-200`}>
                  Priority: <span className="font-semibold capitalize">{priority}</span>
                </span>
                {dueDate && (
                  <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                    Due: {new Date(dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        {/* Edit/Save buttons */}
        <div className="flex gap-3 mb-6">
          {editing ? (
            <>
              <button onClick={handleUpdate} disabled={loading}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover"
              >Save</button>
              <button onClick={() => setEditing(false)}
                className="bg-gray-200 px-4 py-2 rounded"
              >Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover"
            >Edit Card</button>
          )}
        </div>
        {/* Comments */}
        <div className="mb-2">
          <div className="font-semibold mb-1">Comments</div>
          <div className="max-h-[120px] overflow-auto space-y-2 mb-2">
            {(card.comments || []).length === 0 ? (
              <div className="text-gray-400">No comments yet</div>
            ) : (
              card.comments.map((c, i) => (
                <div key={i} className="p-2 border rounded mb-1">
                  <span className="font-medium text-sm">{c.user?.name || "User"}</span>
                  <span className="mx-2 text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                  <div>{c.text}</div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              className="px-2 py-1 border rounded w-full"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a comment..."
            />
            <button onClick={handleAddComment} disabled={loading || !comment.trim()}
              className="px-3 py-1 bg-primary text-white rounded"
            >Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
