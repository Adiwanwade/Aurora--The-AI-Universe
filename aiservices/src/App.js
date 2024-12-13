import React, { useState } from 'react';
import {  Type, Image, FileText, Mic, MessageSquare, Languages, Volume2Icon } from 'lucide-react';
import './App.css';

const App = () => {
  const [activeService, setActiveService] = useState('sentiment');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [inputText, setInputText] = useState('');
  const [question, setQuestion] = useState(''); // For document QA
  const [imageUrl, setImageUrl] = useState(''); // For image URL input
  const [audioUrl, setAudioUrl] = useState(''); // For audio URL input

  const services = [
    {
      id: 'sentiment',
      title: 'Sentiment Analysis',
      description: 'Analyze the sentiment of your text',
      icon: <MessageSquare className="service-icon" />,
      inputType: 'text',
      gradient: 'gradient-purple'
    },
    {
      id: 'asr',
      title: 'Speech Recognition',
      description: 'Convert speech to text using Whisper',
      icon: <Mic className="service-icon" />,
      inputType: 'audio',
      gradient: 'gradient-blue'
    },
    {
      id: 'translation',
      title: 'Translation',
      description: 'Translate text between languages',
      icon: <Languages className="service-icon" />,
      inputType: 'text',
      gradient: 'gradient-green'
    },
    {
      id: 'text-generation',
      title: 'Text Generation',
      description: 'Generate text using LaMini-Flan-T5',
      icon: <Type className="service-icon" />,
      inputType: 'text',
      gradient: 'gradient-orange'
    },
    {
      id: 'image-classification',
      title: 'Image Classification',
      description: 'Classify images into categories',
      icon: <Image className="service-icon" />,
      inputType: 'image',
      gradient: 'gradient-pink'
    },
    
   
    {
      id: 'text-to-speech',
      title: 'Text to Speech',
      description: 'Convert text to natural-sounding speech',
      icon: <Volume2Icon className="service-icon" />,
      inputType: 'text',
      gradient: 'gradient-yellow'
    },
    {
      id: 'image-to-text',
      title: 'Image to Text',
      description: 'Extract text from images',
      icon: <FileText className="service-icon" />,
      inputType: 'image',
      gradient: 'gradient-indigo'
    },
    
  ];

  const handleSubmit = async (serviceId) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let requestBody;
      const headers = {};

      // Handle different types of requests based on service
       if (['asr', 'image-classification', 'image-to-text'].includes(serviceId)) {
        requestBody = JSON.stringify({ imageUrl: imageUrl || audioUrl });
        headers['Content-Type'] = 'application/json';
      } else {
        requestBody = JSON.stringify({ text: inputText });
        headers['Content-Type'] = 'application/json';
      }

      // Configure fetch options based on the service
      const fetchOptions = {
        method: 'POST',
        headers,
        body: requestBody,
      };

      // Set response type for binary data (e.g., audio file)
      if (serviceId === 'text-to-speech') {
        fetchOptions.headers['Accept'] = 'audio/wav';
      }

      const response = await fetch(`http://localhost:5000/api/${serviceId}`, fetchOptions);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Service request failed');
      }

      if (serviceId === 'text-to-speech') {
        // Handle audio response and trigger download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Create a temporary link to download the file
        const link = document.createElement('a');
        link.href = url;
        link.download = 'generated_audio.wav'; // Filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up URL object after download
        URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        setResult(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (service) => {
    switch (service.inputType) {
      case 'text':
        return (
          <textarea
            placeholder="Enter your text here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="text-input"
          />
        );

      case 'image':
        return (
          <div className="image-url-container">
            <label className="image-url-label">
              <input
                type="text"
                placeholder="Enter Image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="url-input"
              />
              <span>Enter Image URL</span>
            </label>
            {imageUrl && (
              <div className="image-preview">
                <img
                  src={imageUrl}
                  alt="Preview"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = ''; // Clear if URL is invalid
                    alert('Invalid image URL');
                  }}
                />
              </div>
            )}
           
          </div>
        );

      case 'audio':
        return (
          <div className="audio-url-container">
            <label className="audio-url-label">
              <input
                type="text"
                placeholder="Enter Audio URL"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                className="url-input"
              />
              <span>Enter Audio URL</span>
            </label>
            {audioUrl && (
              <div className="audio-preview">
                <audio controls src={audioUrl} />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderResult = (result) => {
    if (!result) return null;

    if (Array.isArray(result)) {
      return result.map((item, index) => (
        <div key={index} className="result-item">
          {Object.entries(item).map(([key, value]) => (
            <div key={key}>
              <strong>{key}:</strong> {typeof value === 'number' ? value.toFixed(4) : value}
            </div>
          ))}
        </div>
      ));
    }

    return (
      <pre className="result-content">
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  };

  return (
    <div className="app-container">
      <div className="background-animation"></div>
      <div className="content-wrapper">
        <h1 className="main-title">
          <span className="gradient-text">Aurora- The AI-Universe</span>
        </h1>

        <div className="services-grid">
          {services.map((service) => (
            <button
              key={service.id}
              className={`service-button ${service.gradient} ${activeService === service.id ? 'active' : ''}`}
              onClick={() => {
                setActiveService(service.id);
                setResult(null);
                setError(null);
                setInputText('');
                setImageUrl('');
                setAudioUrl('');
                setQuestion('');
              }}
            >
              {service.icon}
              <span className="service-title">{service.title}</span>
            </button>
          ))}
        </div>

        <div className="service-content">
          {services.map((service) => (
            service.id === activeService && (
              <div key={service.id} className={`service-card ${service.gradient}`}>
                <div className="card-header">
                  {service.icon}
                  <h2>{service.title}</h2>
                  <p>{service.description}</p>
                </div>

                <div className="card-content">
                  {renderInput(service)}

                  <button
                    onClick={() => handleSubmit(service.id)}
                    disabled={loading || (!imageUrl && !audioUrl && !inputText && (service.id !== 'document-qa' || !question))}
                    className="submit-button"
                  >
                    {loading ? (
                      <div className="loading-spinner"></div>
                    ) : (
                      'Process'
                    )}
                  </button>
                </div>

                {error && (
                  <div className="error-message">
                    <p>{error}</p>
                  </div>
                )}

                {result && (
                  <div className="result-container">
                    <h3>Result</h3>
                    {renderResult(result)}
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
