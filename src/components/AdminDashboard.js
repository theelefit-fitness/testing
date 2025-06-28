import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './AdminDashboard.css';

const timeRangeOptions = [
  { value: '10m', label: 'Last 10 Minutes' },
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
];

const COLORS = ['#28a745', '#1976d2', '#ffc107', '#dc3545', '#6f42c1'];

const AdminDashboard = ({ experts, users, timeRange, setTimeRange, theme, loading, onChangeTab }) => {
  const [activityData, setActivityData] = useState([]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [pendingApplications, setPendingApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true);

  // Generate data for dashboard when component mounts
  useEffect(() => {
    const generateData = async () => {
      // Mock data generation for demonstration
      // In a real app, you would fetch this from your database

      // 1. Activity data (for bar chart) - Updated with more meaningful labels
      const activityTypes = ['New Users', 'New Experts', 'Bookings', 'Completed Sessions'];
      const activitySeries = [
        { name: 'Last Month', data: [15, 5, 25, 18] },
        { name: 'This Month', data: [20, 8, 32, 22] }
      ];
      
      const activityChartData = activityTypes.map((type, index) => ({
        name: type,
        'Last Month': activitySeries[0].data[index],
        'This Month': activitySeries[1].data[index]
      }));
      
      setActivityData(activityChartData);
      
      // 2. Time series data (for line chart)
      const today = new Date();
      const timePoints = [];
      const userCounts = [];
      const expertCounts = [];
      const bookingCounts = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        timePoints.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        
        // Random growth trend
        const baseUsers = users.length - (Math.random() * 5 * i);
        const baseExperts = experts.length - (Math.random() * 2 * i);
        const baseBookings = Math.round((baseUsers + baseExperts) * 0.3);
        
        userCounts.push(Math.max(0, Math.round(baseUsers)));
        expertCounts.push(Math.max(0, Math.round(baseExperts)));
        bookingCounts.push(Math.max(0, baseBookings));
      }
      
      const timeSeriesChartData = timePoints.map((time, index) => ({
        name: time,
        users: userCounts[index],
        experts: expertCounts[index],
        bookings: bookingCounts[index]
      }));
      
      setTimeSeriesData(timeSeriesChartData);
      
      // 3. Distribution data (for pie chart)
      const totalUsers = users.length;
      const totalExperts = experts.length;
      const totalInactive = Math.round((totalUsers + totalExperts) * 0.15); // 15% inactive for demo
      
      const distributionChartData = [
        { name: 'Regular Users', value: totalUsers },
        { name: 'Experts', value: totalExperts },
        { name: 'Inactive', value: totalInactive }
      ];
      
      setDistributionData(distributionChartData);
    };
    
    generateData();
  }, [users, experts, timeRange, loading]);
  
  // Initial load and periodic refresh
  useEffect(() => {
    // Load initial data
    loadPendingApplications();
    
    // Set up refresh interval
    const interval = setInterval(() => {
      loadPendingApplications();
      setLastRefresh(new Date());
    }, 300000); // 5 minutes
    
    setRefreshInterval(interval);
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);
  
  // Function to load pending expert applications
  const loadPendingApplications = async () => {
    setLoadingApplications(true);
    try {
      // Get all applications from the collection
      const applicationsCollection = collection(db, 'expertApplications');
      // Query for applications where status is null, undefined, or doesn't exist
      // (which means they're pending)
      const applicationsSnapshot = await getDocs(applicationsCollection);
      
      const applicationsList = applicationsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }))
        .filter(app => !app.status); // Filter for applications without a status
      
      // Sort by creation date, newest first
      applicationsList.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log("Pending applications found:", applicationsList.length);
      setPendingApplications(applicationsList);
    } catch (error) {
      console.error("Error loading pending applications:", error);
    } finally {
      setLoadingApplications(false);
    }
  };
  
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };
  
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>Analytics Dashboard</h2>
        <div className="dashboard-filters">
          {timeRangeOptions.map(option => (
            <button
              key={option.value}
              className={`filter-button ${timeRange === option.value ? 'active' : ''}`}
              onClick={() => handleTimeRangeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stats-card total-users">
          <h3>Total Active Users</h3>
          <div className="stats-value">{users.length + experts.length}</div>
          <div className="stats-change positive">
            <span className="stats-change-icon">↑</span>
            <span>Updated {formatTimestamp(lastRefresh)}</span>
          </div>
        </div>
        
        <div className="stats-card active-experts">
          <h3>Active Experts</h3>
          <div className="stats-value">{experts.length}</div>
          <div className="stats-change positive">
            <span className="stats-change-icon">↑</span>
            <span>{(experts.length / (users.length + experts.length) * 100).toFixed(1)}% of total</span>
          </div>
        </div>
        
        <div className="stats-card active-users">
          <h3>Regular Users</h3>
          <div className="stats-value">{users.length}</div>
          <div className="stats-change positive">
            <span className="stats-change-icon">↑</span>
            <span>{(users.length / (users.length + experts.length) * 100).toFixed(1)}% of total</span>
          </div>
        </div>
      </div>
      
      {/* Action Required Section */}
      {pendingApplications.length > 0 && (
        <div className="dashboard-section action-required">
          <div className="section-header">
            <h3>Action Required</h3>
          </div>
          <div className="action-required-content">
            <div className="action-required-message">
              <span className="action-icon">⚠️</span>
              <span>You have <strong>{pendingApplications.length}</strong> pending expert application{pendingApplications.length > 1 ? 's' : ''} that need{pendingApplications.length === 1 ? 's' : ''} your review.</span>
            </div>
            <button 
              className="action-required-button"
              onClick={() => onChangeTab('applications')}
            >
              Review Applications
            </button>
          </div>
        </div>
      )}
      
     
      
      {/* Charts */}
      <div className="dashboard-charts">
        <div className="chart-container activity">
          <h3>Monthly Activity Comparison</h3>
          <p className="chart-description">Comparison of platform activity between this month and last month</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={activityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Last Month" name="Last Month" fill="#8884d8" />
              <Bar dataKey="This Month" name="This Month" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-container growth">
          <h3>User Growth Trends</h3>
          <p className="chart-description">Weekly growth of users, experts, and bookings over time</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="users" name="Users" stroke="#8884d8" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="experts" name="Experts" stroke="#82ca9d" />
              <Line type="monotone" dataKey="bookings" name="Bookings" stroke="#ffc658" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-container distribution">
          <h3>Platform User Distribution</h3>
          <p className="chart-description">Breakdown of platform users by type</p>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 