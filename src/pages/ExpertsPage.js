import React, { useState, useEffect } from 'react';
import ExpertCard from '../components/ExpertCard';
import expertsService from '../services/expertsService';
import LoadingSpinner from '../components/LoadingSpinner';
import './ExpertsPage.css';

const ExpertsPage = () => {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch all experts
    const fetchExperts = async () => {
      try {
        const data = await expertsService.getAllExperts();
        setExperts(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching experts:', error);
        setError('Failed to load experts. Please try again later.');
        setLoading(false);
      }
    };

    fetchExperts();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Filter experts based on search term
  const filteredExperts = experts.filter(expert => {
    const searchLower = searchTerm.toLowerCase();
    return (
      expert.name.toLowerCase().includes(searchLower) ||
      expert.specialty.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="experts-page">
      <div className="experts-header">
        <h1>Find Your Nutrition Expert</h1>
        <p>Browse our listing of qualified nutrition experts and find the perfect match for your needs</p>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by name or specialty..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading experts..." />
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="experts-grid">
          {filteredExperts.length > 0 ? (
            filteredExperts.map(expert => (
              <ExpertCard key={expert.id} expert={expert} />
            ))
          ) : (
            <div className="no-results">
              No experts found matching "{searchTerm}".
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpertsPage; 