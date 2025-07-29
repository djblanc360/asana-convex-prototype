import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { toast } from "sonner";
import { TagInput } from "~/components/tag-input";

interface CreateEventModalProps {
  onClose: () => void;
  initialDate?: Date;
}

const eventColors = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#F97316", // Orange
  "#06B6D4", // Cyan
  "#84CC16", // Lime
];

export function CreateEventModal({ onClose, initialDate }: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(
    initialDate ? initialDate.toISOString().slice(0, 16) : ""
  );
  const [endDate, setEndDate] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<Id<"users">[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState(eventColors[0]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createEvent = useMutation(api.calendar.create);
  const generateUploadUrl = useMutation(api.calendar.generateUploadUrl);
  const teamMembers = useQuery(api.users.getTeamMembers);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) return;

    setIsSubmitting(true);
    try {
      let imageId: Id<"_storage"> | undefined;

      // Upload image if selected
      if (selectedImage) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedImage.type },
          body: selectedImage,
        });
        
        if (result.ok) {
          const { storageId } = await result.json();
          imageId = storageId;
        }
      }

      const startDateTime = new Date(startDate).getTime();
      const endDateTime = endDate ? new Date(endDate).getTime() : startDateTime + (isAllDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000);

      await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDateTime,
        endDate: endDateTime,
        isAllDay,
        assignedUsers: assignedUsers.length > 0 ? assignedUsers : undefined,
        isPrivate,
        labels: labels.length > 0 ? labels : undefined,
        image: imageId,
        color: selectedColor,
      });

      toast.success("Event created successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to create event");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignedUserChange = (userId: Id<"users">, checked: boolean) => {
    if (checked) {
      setAssignedUsers([...assignedUsers, userId]);
    } else {
      setAssignedUsers(assignedUsers.filter(id => id !== userId));
    }
  };

  if (!teamMembers) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Create New Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter event title"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter event description"
            />
          </div>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">All Day Event</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date & Time *
              </label>
              <input
                type={isAllDay ? "date" : "datetime-local"}
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date & Time
              </label>
              <input
                type={isAllDay ? "date" : "datetime-local"}
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned Users
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {teamMembers.map((member) => (
                <label key={member._id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={assignedUsers.includes(member._id)}
                    onChange={(e) => handleAssignedUserChange(member._id, e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">{member.name || member.email}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Labels
            </label>
            <TagInput
              tags={labels}
              onChange={setLabels}
              placeholder="Type a label and press Enter..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Type a label and press Enter to add it. Press Backspace to remove the last label.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Color
            </label>
            <div className="flex gap-2">
              {eventColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedColor === color ? "border-gray-400" : "border-gray-200"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
              Event Image
            </label>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {selectedImage && (
              <p className="text-sm text-gray-600 mt-1">Selected: {selectedImage.name}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Private Event</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !startDate || isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
