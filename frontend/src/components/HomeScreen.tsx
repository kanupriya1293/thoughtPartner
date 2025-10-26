import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { threadsApi, messagesApi } from '../services/api';
import ChatInputBox from './ChatInputBox';

const HomeScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSendMessage = async (messageContent: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Create a new thread first
      const newThread = await threadsApi.createThread({});
      
      // Send the first message
      await messagesApi.sendMessage(newThread.id, { content: messageContent }, true);
      
      // Navigate to the chat view
      navigate(`/chat/${newThread.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create thread and send message');
      console.error('Error creating thread and sending message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-start justify-center pt-12 bg-white h-full">
        {error && (
          <div className="bg-red-500 text-white px-8 py-3 rounded">
            {error}
          </div>
        )}

        <div className="w-full max-w-4xl mx-auto">
          {/* Grid Lines Container */}
          <div className="relative w-full mx-auto">
            {/* Vertical Grid Lines */}
            <div className="absolute w-0 border-l border-black/5 left-0 top-0 bottom-0 pointer-events-none"></div>
            <div className="absolute w-0 border-r border-black/5 right-0 top-0 bottom-0 pointer-events-none"></div>
            <div className="relative pointer-events-auto">
              <div className="w-full text-center">
                {/* Nested container to match title text width */}
                <div className="max-w-2xl mx-auto">
                  {/* Headline and Subtitle wrapper with mb-12 spacing */}
                  <div className="mb-12">
                    {/* Title with wrapper */}
                    <div className="flex justify-center my-8">
                      <div className="relative inline-block p-2">
                        <div className="absolute h-0 border-t border-black/5 top-0 left-0 right-0 pointer-events-none"></div>
                        <div className="absolute h-0 border-b border-black/5 bottom-0 left-0 right-0 pointer-events-none"></div>
                        <div className="relative pointer-events-auto">
                          <h1 className="font-[450] tracking-tighter text-4xl sm:text-5xl text-center">
                            Be Curious!
                          </h1>
                        </div>
                      </div>
                    </div>

                    {/* Subtitle with wrapper */}
                    <div className="flex justify-center my-0">
                      <div className="relative inline-block p-2">
                        <div className="absolute h-0 border-t border-black/5 top-0 left-0 right-0 pointer-events-none"></div>
                        <div className="absolute h-0 border-b border-black/5 bottom-0 left-0 right-0 pointer-events-none"></div>
                        <div className="relative pointer-events-auto">
                          <p className="text-lg text-center text-neutral-700 font-light whitespace-nowrap">
                            Pursue every thought. There are no wrong directions—only new discoveries.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chat Input */}
                  <div className="mb-8">
                    <ChatInputBox 
                      onSubmit={handleSendMessage}
                      placeholder="Type your message here..."
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default HomeScreen;
