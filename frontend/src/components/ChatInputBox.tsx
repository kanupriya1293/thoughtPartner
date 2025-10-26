import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

interface ChatInputBoxProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  initialValue?: string;
  onChange?: (value: string) => void;
  onInitialValueSet?: (length: number) => void;
}

export interface ChatInputBoxRef {
  focus: () => void;
  setSelectionRange: (start: number, end: number) => void;
}

const ChatInputBox = forwardRef<ChatInputBoxRef, ChatInputBoxProps>(({ 
  onSubmit, 
  placeholder = "Type your message here...", 
  disabled = false,
  initialValue = "",
  onChange,
  onInitialValueSet
}, ref) => {
  const [message, setMessage] = useState(initialValue);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialValueSetRef = useRef(false);

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
    setSelectionRange: (start: number, end: number) => {
      textareaRef.current?.setSelectionRange(start, end);
    }
  }));

  // Set initial value when it changes
  useEffect(() => {
    setMessage(initialValue);
    initialValueSetRef.current = false;
  }, [initialValue]);

  // Call onInitialValueSet after the value is set and rendered
  useEffect(() => {
    if (initialValue && !initialValueSetRef.current && onInitialValueSet && message === initialValue) {
      // Wait for next tick to ensure DOM is updated
      const timer = setTimeout(() => {
        onInitialValueSet(message.length);
        initialValueSetRef.current = true;
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [message, initialValue, onInitialValueSet]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !disabled) {
      onSubmit(message);
      setMessage('');
      onChange?.('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleAttachClick = () => {
    // TODO: Implement file picker functionality later
    console.log('Attach button clicked - functionality to be implemented');
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* Main Chat Input Box */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-100 transition-all duration-200">
        {/* Attached Files Display */}
        {attachedFiles.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 rounded p-2 w-1/3 min-w-[120px]">
                  <div className="flex items-center space-x-1 flex-1 min-w-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-xs text-gray-700 truncate">{file}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-gray-500 hover:text-gray-700 text-xs ml-1 flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            onChange?.(e.target.value);
          }}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-4 text-gray-900 placeholder-gray-400 bg-transparent border-0 rounded-2xl resize-none focus:outline-none min-h-[96px] max-h-[300px] text-sm leading-relaxed placeholder:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          rows={3}
        />
        
        {/* Action Bar */}
        <div className="flex items-center justify-between px-2 py-2">
          {/* Left Side Actions */}
          <div className="flex items-center space-x-2">
            {/* Attach File */}
            <button
              type="button"
              onClick={handleAttachClick}
              disabled={disabled}
              className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span>Attach{attachedFiles.length > 0 ? ` (${attachedFiles.length})` : ''}</span>
            </button>
          </div>

          {/* Right Side - Send Button */}
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="flex items-center justify-center w-8 h-8 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Hidden File Input - for future implementation */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
      />
    </form>
  );
});

ChatInputBox.displayName = 'ChatInputBox';

export default ChatInputBox;
