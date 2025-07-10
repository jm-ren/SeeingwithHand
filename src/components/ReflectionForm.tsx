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
    <div style={{ 
      fontFamily: 'Azeret Mono, monospace',
      width: '100%'
    }}>
      <form onSubmit={handleSubmit}>
        {/* Form input section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12.64px',
          marginBottom: '32px'
        }}>
          {/* Nickname */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '3.16px'
          }}>
            <label style={{
              fontFamily: 'Azeret Mono, monospace',
              fontSize: '12px',
              fontWeight: 500,
              lineHeight: '1.22em',
              letterSpacing: '0.5px',
              color: '#757575'
            }}>
              Your nickname
            </label>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '0.39px solid #666666',
              padding: '8px 12px',
              backgroundColor: '#FFFFFF'
            }}>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontFamily: 'Azeret Mono, monospace',
                  fontSize: '12px',
                  fontWeight: 400,
                  letterSpacing: '-4%',
                  color: '#333333',
                  width: '100%'
                }}
                placeholder=""
              />
            </div>
          </div>

          {/* Location */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '3.16px'
          }}>
                         <label style={{
               fontFamily: 'Azeret Mono, monospace',
               fontSize: '12px',
               fontWeight: 500,
               lineHeight: '1.22em',
               letterSpacing: '0.5px',
               color: '#757575'
             }}>
               Your location
             </label>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '0.39px solid #666666',
              padding: '8px 12px',
              backgroundColor: '#FFFFFF'
            }}>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontFamily: 'Azeret Mono, monospace',
                  fontSize: '12px',
                  fontWeight: 400,
                  letterSpacing: '-4%',
                  color: '#333333',
                  width: '100%'
                }}
                placeholder=""
              />
            </div>
          </div>

          {/* Weather */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '3.16px'
          }}>
                         <label style={{
               fontFamily: 'Azeret Mono, monospace',
               fontSize: '12px',
               fontWeight: 500,
               lineHeight: '1.22em',
               letterSpacing: '0.5px',
               color: '#757575'
             }}>
               What is the weather like now?
             </label>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              {weatherOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleInputChange('weather', option.value)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flex: 1,
                    padding: '12px 8px',
                    border: '0.39px solid #666666',
                    backgroundColor: formData.weather === option.value ? '#666666' : '#FFFFFF',
                    color: formData.weather === option.value ? '#FFFFFF' : '#333333',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '16.58px',
                    height: '16.58px'
                  }}>
                    <span style={{ fontSize: '15.4px' }}>{option.icon}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '3.16px'
          }}>
                         <label style={{
               fontFamily: 'Azeret Mono, monospace',
               fontSize: '12px',
               fontWeight: 500,
               lineHeight: '1.22em',
               letterSpacing: '0.5px',
               color: '#757575'
             }}>
               How are you feeling?
             </label>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              {moodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleInputChange('mood', option.value)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flex: 1,
                    padding: '12px 8px',
                    border: '0.39px solid #666666',
                    backgroundColor: formData.mood === option.value ? '#666666' : '#FFFFFF',
                    color: formData.mood === option.value ? '#FFFFFF' : '#333333',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '16.58px',
                    height: '16.58px'
                  }}>
                    <span style={{ fontSize: '15.4px' }}>{option.icon}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Additional thoughts */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '3.16px'
          }}>
                         <label style={{
               fontFamily: 'Azeret Mono, monospace',
               fontSize: '12px',
               fontWeight: 500,
               lineHeight: '1.22em',
               letterSpacing: '0.5px',
               color: '#757575'
             }}>
               share more about how you feel (optional)
             </label>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              border: '0.39px solid #666666',
              padding: '8px 12px',
              backgroundColor: '#FFFFFF',
              minHeight: '60px'
            }}>
              <textarea
                value={formData.additionalThoughts}
                onChange={(e) => handleInputChange('additionalThoughts', e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontFamily: 'Azeret Mono, monospace',
                  fontSize: '12px',
                  fontWeight: 400,
                  letterSpacing: '-4%',
                  color: '#333333',
                  width: '100%',
                  resize: 'none',
                  minHeight: '44px'
                }}
                placeholder=""
              />
            </div>
          </div>
        </div>

        {/* Question cards section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '313px',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            height: '100%',
            gap: '0px'
          }}>
            {/* Question 1 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              padding: '16px',
              border: '1px solid #666666',
              backgroundColor: '#FFFFFF'
            }}>
              <div style={{
                fontFamily: 'Azeret Mono, monospace',
                fontSize: '12px',
                fontWeight: 300,
                lineHeight: '1.167em',
                letterSpacing: '-4%',
                color: '#333333',
                textAlign: 'left',
                width: '100%'
              }}>
                what does the image make you think of?
              </div>
              <textarea
                value={formData.imageThoughts}
                onChange={(e) => handleInputChange('imageThoughts', e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontFamily: 'Azeret Mono, monospace',
                  fontSize: '12px',
                  fontWeight: 400,
                  letterSpacing: '-4%',
                  color: '#333333',
                  width: '100%',
                  height: '14px',
                  resize: 'none'
                }}
                placeholder=""
              />
            </div>

            {/* Question 2 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              padding: '16px',
              border: '1px solid #666666',
              backgroundColor: '#FFFFFF'
            }}>
              <div style={{
                fontFamily: 'Azeret Mono, monospace',
                fontSize: '12px',
                fontWeight: 300,
                lineHeight: '1.167em',
                letterSpacing: '-4%',
                color: '#333333',
                textAlign: 'left',
                width: '100%'
              }}>
                if there is a song that represent this seeing session, what would that be?
              </div>
              <textarea
                value={formData.songAssociation}
                onChange={(e) => handleInputChange('songAssociation', e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontFamily: 'Azeret Mono, monospace',
                  fontSize: '12px',
                  fontWeight: 400,
                  letterSpacing: '-4%',
                  color: '#333333',
                  width: '100%',
                  height: '14px',
                  resize: 'none'
                }}
                placeholder=""
              />
            </div>

            {/* Question 3 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              padding: '16px',
              border: '1px solid #666666',
              backgroundColor: '#FFFFFF'
            }}>
              <div style={{
                fontFamily: 'Azeret Mono, monospace',
                fontSize: '12px',
                fontWeight: 300,
                lineHeight: '1.167em',
                letterSpacing: '-4%',
                color: '#333333',
                textAlign: 'left',
                width: '100%'
              }}>
                anything that you can think of
              </div>
              <textarea
                value={formData.anythingElse}
                onChange={(e) => handleInputChange('anythingElse', e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontFamily: 'Azeret Mono, monospace',
                  fontSize: '12px',
                  fontWeight: 400,
                  letterSpacing: '-4%',
                  color: '#333333',
                  width: '100%',
                  height: '14px',
                  resize: 'none'
                }}
                placeholder=""
              />
            </div>

            {/* Plus card */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              padding: '24px 27px',
              backgroundColor: '#F1EEEA'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '24px',
                height: '24px',
                backgroundColor: '#FFFFFF'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="#666666" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            type="submit"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '297px',
              height: '51px',
              backgroundColor: '#323232',
              border: '0.39px solid #666666',
              cursor: 'pointer'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '7.9px',
              padding: '0px 7.9px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '16.58px',
                height: '16.58px',
                padding: '7.9px'
              }}>
                <svg width="15.4" height="13.03" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2l-7 20-4-9-9-4z" fill="#FFFFFF"/>
                  <path d="M22 2l-10 10" stroke="#FFFFFF" strokeWidth="2"/>
                </svg>
              </div>
                             <span style={{
                 fontFamily: 'Azeret Mono, monospace',
                 fontSize: '12.64px',
                 fontWeight: 500,
                 lineHeight: '1.22em',
                 letterSpacing: '0.5px',
                 color: '#FFFFFF'
               }}>
                 Share
               </span>
            </div>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReflectionForm; 