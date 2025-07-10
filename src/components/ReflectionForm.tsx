import React, { useState } from 'react';

interface ReflectionFormProps {
  onSubmit: (data: any) => void;
}

const ReflectionForm: React.FC<ReflectionFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    nickname: '',
    location: '',
    weather: '',
    mood: '',
    additionalThoughts: '',
    imageThoughts: '',
    songAssociation: '',
    anythingElse: ''
  });

  const weatherOptions = [
    { value: 'sunny', icon: '☀️' },
    { value: 'cloudy', icon: '☁️' },
    { value: 'rainy', icon: '🌧️' },
    { value: 'snowy', icon: '❄️' }
  ];

  const moodOptions = [
    { value: 'happy', icon: '😊' },
    { value: 'calm', icon: '😌' },
    { value: 'excited', icon: '😄' },
    { value: 'thoughtful', icon: '🤔' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nickname */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your nickname
        </label>
        <input
          type="text"
          value={formData.nickname}
          onChange={(e) => handleInputChange('nickname', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your nickname"
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your location
        </label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your location"
        />
      </div>

      {/* Weather */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What is the weather like now?
        </label>
        <div className="flex gap-2">
          {weatherOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleInputChange('weather', option.value)}
              className={`flex items-center justify-center w-12 h-12 border rounded-md transition-colors ${
                formData.weather === option.value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{option.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mood */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How are you feeling?
        </label>
        <div className="flex gap-2">
          {moodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleInputChange('mood', option.value)}
              className={`flex items-center justify-center w-12 h-12 border rounded-md transition-colors ${
                formData.mood === option.value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{option.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Additional thoughts */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Share more about how you feel (optional)
        </label>
        <textarea
          value={formData.additionalThoughts}
          onChange={(e) => handleInputChange('additionalThoughts', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Tell us more about your feelings..."
        />
      </div>

      {/* Open-ended questions */}
      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            What does the image make you think of?
          </h4>
          <textarea
            value={formData.imageThoughts}
            onChange={(e) => handleInputChange('imageThoughts', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Share your thoughts..."
          />
        </div>

        <div className="p-4 border border-gray-200 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            If there is a song that represents this seeing session, what would that be?
          </h4>
          <textarea
            value={formData.songAssociation}
            onChange={(e) => handleInputChange('songAssociation', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Song title, artist, or description..."
          />
        </div>

        <div className="p-4 border border-gray-200 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Anything else you can think of?
          </h4>
          <textarea
            value={formData.anythingElse}
            onChange={(e) => handleInputChange('anythingElse', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any other thoughts or reflections..."
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center pt-4">
        <button
          type="submit"
          className="flex items-center gap-2 px-8 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2l-7 20-4-9-9-4z"/>
            <path d="M22 2l-10 10"/>
          </svg>
          Share
        </button>
      </div>
    </form>
  );
};

export default ReflectionForm; 