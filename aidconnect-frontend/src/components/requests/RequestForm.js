import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/RequestForm.css';
import L from 'leaflet';
import { Upload, X } from 'react-feather';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <h2>Something went wrong while rendering the map.</h2>;
    }
    return this.props.children;
  }
}

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} /> : null;
};

const MapComponent = ({ position, setPosition }) => {
  if (!position) return null;

  return (
    <MapContainer
      center={position}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <LocationMarker position={position} setPosition={setPosition} />
    </MapContainer>
  );
};

const RequestForm = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    emergencyLevel: 'medium',
    location: {
      type: 'Point',
      coordinates: [0, 0],
      address: '',
    },
  });
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [images, setImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [uploadError, setUploadError] = useState(null);

  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      return data.display_name;
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Location not specified';
    }
  };

  useEffect(() => {
    const locationTimeout = setTimeout(() => {
      if (locationLoading) {
        console.warn('⏰ Geolocation timeout — using default location.');
        setPosition([51.505, -0.09]);
        setLocationLoading(false);
      }
    }, 8000);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
          const address = await getAddressFromCoordinates(latitude, longitude);
          setFormData((prev) => ({
            ...prev,
            location: {
              type: 'Point',
              coordinates: [longitude, latitude],
              address,
            },
          }));
          clearTimeout(locationTimeout);
          setLocationLoading(false);
        },
        (err) => {
          console.error('❌ Error getting location:', err);
          setPosition([51.505, -0.09]);
          clearTimeout(locationTimeout);
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    } else {
      setPosition([51.505, -0.09]);
      setLocationLoading(false);
    }

    return () => clearTimeout(locationTimeout);
  }, []);

  useEffect(() => {
    const updateLocation = async () => {
      if (position) {
        const address = await getAddressFromCoordinates(position[0], position[1]);
        setFormData((prev) => ({
          ...prev,
          location: {
            type: 'Point',
            coordinates: [position[1], position[0]],
            address,
          },
        }));
      }
    };
    updateLocation();
  }, [position]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setUploadError(null);

    // Validate number of images
    if (images.length + files.length > 2) {
      setUploadError('You can only upload up to 2 images');
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setUploadError('Only image files are allowed');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setUploadError('Image size should be less than 5MB');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreview(prev => [...prev, ...newPreviews]);
    setImages(prev => [...prev, ...validFiles]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreview(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index]); // Clean up the URL
      return newPreviews;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Create FormData to handle file uploads
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('emergencyLevel', formData.emergencyLevel);
      
      // Ensure location coordinates are in the correct order [longitude, latitude]
      const locationData = {
        ...formData.location,
        coordinates: [formData.location.coordinates[0], formData.location.coordinates[1]]
      };
      formDataToSend.append('location', JSON.stringify(locationData));

      // Append images
      images.forEach((image, index) => {
        formDataToSend.append(`images`, image);
      });

      console.log('Sending form data:', {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        emergencyLevel: formData.emergencyLevel,
        location: locationData
      });

      const response = await axios.post('http://localhost:5000/api/requester/requests', formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Response:', response.data);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error creating request:', err);
      setError(err.response?.data?.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  // Clean up preview URLs when component unmounts
  useEffect(() => {
    return () => {
      imagePreview.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreview]);

  if (locationLoading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="card-title">Create New Request</h1>

        {error && <div className="alert alert-danger">{error}</div>}
        {uploadError && <div className="alert alert-danger">{uploadError}</div>}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="form-control"
              placeholder="Brief description of your request"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
              className="form-control"
              placeholder="Detailed description of your request"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="form-control"
            >
              <option value="">Select a category</option>
              <option value="medical">Medical</option>
              <option value="food">Food</option>
              <option value="shelter">Shelter</option>
              <option value="transportation">Transportation</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Urgency</label>
            <select
              name="emergencyLevel"
              value={formData.emergencyLevel}
              onChange={handleChange}
              required
              className="form-control"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <div className="map-container" style={{ height: '400px', width: '100%' }}>
              {position && (
                <ErrorBoundary>
                  <MapComponent position={position} setPosition={setPosition} />
                </ErrorBoundary>
              )}
            </div>
            <p className="form-text">
              Click on the map to set the exact location where help is needed
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Images (Max 2)</label>
            <div className="image-upload-container">
              <div className="image-preview-grid">
                {imagePreview.map((preview, index) => (
                  <div key={index} className="image-preview-item">
                    <img src={preview} alt={`Preview ${index + 1}`} />
                    <button
                      type="button"
                      className="remove-image-button"
                      onClick={() => removeImage(index)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {imagePreview.length < 2 && (
                  <label className="image-upload-button">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                    <Upload size={24} />
                    <span>Upload Image</span>
                  </label>
                )}
              </div>
              <p className="form-text">
                Upload up to 2 images (max 5MB each)
              </p>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestForm;
