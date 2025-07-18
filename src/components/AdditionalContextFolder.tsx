import React, { useState } from 'react';

export interface AdditionalContextItem {
  id: string;
  type: 'note' | 'file';
  content: string;
  filename?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  timestamp: number;
}

interface AdditionalContextFolderProps {
  items: AdditionalContextItem[];
  onAddItem: (item: AdditionalContextItem) => void;
  onRemoveItem: (id: string) => void;
}

const AdditionalContextFolder: React.FC<AdditionalContextFolderProps> = ({
  items,
  onAddItem,
  onRemoveItem
}) => {
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const handleAddNote = () => {
    if (noteInput.trim()) {
      const newNote: AdditionalContextItem = {
        id: `note-${Date.now()}`,
        type: 'note',
        content: noteInput.trim(),
        timestamp: Date.now()
      };
      onAddItem(newNote);
      setNoteInput('');
      setIsAddingNote(false);
      setShowAddOptions(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      const newFile: AdditionalContextItem = {
        id: `file-${Date.now()}`,
        type: 'file',
        content: file.name,
        filename: file.name,
        fileUrl: fileUrl,
        fileType: file.type,
        fileSize: file.size,
        timestamp: Date.now()
      };
      onAddItem(newFile);
      setShowAddOptions(false);
    }
    // Clear the input
    event.target.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeLabel = (fileType?: string) => {
    if (!fileType) return 'File';
    if (fileType.startsWith('image/')) return 'Image';
    if (fileType.startsWith('video/')) return 'Video';
    if (fileType.startsWith('audio/')) return 'Audio';
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('text') || fileType.includes('document')) return 'Document';
    return 'File';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ 
        fontSize: '14px', 
        fontWeight: 500, 
        margin: 0,
        fontFamily: 'Azeret Mono, monospace',
        letterSpacing: '0.5px'
      }}>
        Additional Context
      </h3>
      
      <div style={{
        fontSize: '11px',
        fontFamily: 'Azeret Mono, monospace',
        fontWeight: 400,
        letterSpacing: '0.5px',
        color: '#666666',
        marginTop: '-8px',
        marginBottom: '8px'
      }}>
        what slipped into your mind now? Are there any memories, reflections, references you want to attach here?
      </div>
      
      {/* Context items grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '240px 240px',
        gap: '8px',
        maxWidth: '480px'
      }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              padding: '16px',
              border: '0.39px solid #666666',
              backgroundColor: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 300,
              letterSpacing: '-4%',
              position: 'relative',
              fontFamily: 'Azeret Mono, monospace',
              height: '240px',
              boxSizing: 'border-box'
            }}
          >
                        {/* Remove button */}
            <button
              type="button"
              onClick={() => onRemoveItem(item.id)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '16px',
                height: '16px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#999999'
              }}
            >
              ×
            </button>

            {/* Main content area */}
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              flex: 1,
              width: '100%'
            }}>
              {item.type === 'file' && (
                <div style={{ 
                  textAlign: 'left', 
                  width: '100%',
                  maxWidth: '220px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.content}
                  </div>
                </div>
              )}

              {/* File preview or note content */}
              {item.type === 'file' && item.fileUrl && (
                <div style={{ width: '100%', textAlign: 'center' }}>
                  {item.fileType?.startsWith('image/') ? (
                    <img
                      src={item.fileUrl}
                      alt={item.filename}
                      style={{
                        width: '100%',
                        maxHeight: '120px',
                        objectFit: 'cover',
                        border: '1px solid #CCCCCC'
                      }}
                    />
                  ) : (
                    <div style={{
                      padding: '8px',
                      backgroundColor: '#F8F8F8',
                      border: '1px solid #CCCCCC',
                      fontSize: '10px',
                      color: '#666666'
                    }}>
                      {item.filename}
                    </div>
                  )}
                </div>
              )}
              
              {/* Note content as body text */}
              {item.type === 'note' && (
                <div style={{ 
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 0',
                  flex: 1,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '1.4',
                    color: '#333333',
                    wordWrap: 'break-word',
                    hyphens: 'auto',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                    scrollbarWidth: 'none', /* Firefox */
                    msOverflowStyle: 'none', /* IE and Edge */
                  }}
                  className="hide-scrollbar">
                    {item.content}
                  </div>
                </div>
              )}
            </div>

            {/* Label pinned to bottom */}
            <div style={{ 
              fontSize: '10px', 
              fontWeight: 400, 
              color: '#666666',
              textAlign: 'center',
              marginTop: 'auto'
            }}>
              {item.type === 'note' ? 'Note' : getFileTypeLabel(item.fileType)}
            </div>
          </div>
        ))}
        
        {/* Add button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          padding: '24px 27px',
          backgroundColor: '#F1EEEA',
          border: '1px solid #666666',
          cursor: 'pointer',
          position: 'relative'
        }}>
          <button
            type="button"
            onClick={() => setShowAddOptions(!showAddOptions)}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '24px',
              height: '24px',
              backgroundColor: '#FFFFFF',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#666666" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          
          {showAddOptions && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              border: '0.39px solid #666666',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 10,
              fontFamily: 'Azeret Mono, monospace'
            }}>
              {/* Add Note button */}
              <button
                type="button"
                onClick={() => {
                  setIsAddingNote(true);
                  setShowAddOptions(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#333333',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  letterSpacing: '0.5px'
                }}
              >
                📝 Add Note
              </button>

              {/* Add Media button */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#333333',
                color: '#FFFFFF',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                letterSpacing: '0.5px'
              }}>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
                />
                📁 Add Media
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Note input modal */}
      {isAddingNote && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #666666',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
            fontFamily: 'Azeret Mono, monospace'
          }}>
            <h4 style={{ 
              fontSize: '14px', 
              fontWeight: 500, 
              margin: '0 0 16px 0',
              letterSpacing: '0.5px'
            }}>
              Add a Note
            </h4>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Enter your note here..."
              style={{
                width: '100%',
                height: '120px',
                padding: '12px',
                border: '1px solid #CCCCCC',
                fontSize: '12px',
                fontFamily: 'Azeret Mono, monospace',
                resize: 'none',
                marginBottom: '16px'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNote(false);
                  setNoteInput('');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F8F8F8',
                  border: '1px solid #CCCCCC',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'Azeret Mono, monospace'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!noteInput.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: noteInput.trim() ? '#333333' : '#CCCCCC',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: noteInput.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  fontFamily: 'Azeret Mono, monospace'
                }}
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdditionalContextFolder; 