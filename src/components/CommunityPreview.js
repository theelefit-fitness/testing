import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, 
  faArrowRight, 
  faImage, 
  faVideo, 
  faLink, 
  faNewspaper,
  faBold,
  faItalic,
  faListUl,
  faListOl
} from '@fortawesome/free-solid-svg-icons';
import { getPosts, createPost } from '../services/communityService';
import { uploadProfileImage } from '../services/storageService';
import './CommunityPreview.css';

const CommunityPreview = ({ currentUser }) => {
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    const fetchRecentPosts = async () => {
      try {
        const posts = await getPosts();
        // Only show the 3 most recent posts in the preview
        setRecentPosts(posts.slice(0, 3));
      } catch (error) {
        console.error('Error fetching recent posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPosts();
  }, []);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d`;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleEditor = () => {
    setShowEditor(!showEditor);
  };

  const handleFormatText = (format) => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    // If there's no selection, just add the formatting at cursor position
    if (!selectedText) {
      switch (format) {
        case 'bold':
          editor.focus();
          document.execCommand('insertHTML', false, '<strong></strong>');
          break;
        case 'italic':
          editor.focus();
          document.execCommand('insertHTML', false, '<em></em>');
          break;
        case 'ul':
          editor.focus();
          document.execCommand('insertUnorderedList', false, null);
          break;
        case 'ol':
          editor.focus();
          document.execCommand('insertOrderedList', false, null);
          break;
        case 'link':
          const url = prompt('Enter URL:');
          if (url) {
            editor.focus();
            document.execCommand('createLink', false, url);
          }
          break;
        default:
          break;
      }
      return;
    }
    
    // If text is selected, apply formatting to selection
    switch (format) {
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'ul':
        document.execCommand('insertUnorderedList', false, null);
        break;
      case 'ol':
        document.execCommand('insertOrderedList', false, null);
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          document.execCommand('createLink', false, url);
        }
        break;
      default:
        break;
    }
  };

  const handleSubmitPost = async () => {
    if (!currentUser) {
      alert('Please log in to post');
      return;
    }

    if (!postContent.trim() && !selectedFile) {
      alert('Please add some content to your post');
      return;
    }

    setIsPosting(true);

    try {
      const postData = {
        content: postContent,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email.split('@')[0],
        userAvatar: currentUser.photoURL || null,
        userType: currentUser.userType || 'user'
      };

      let imageUrl = null;
      if (selectedFile) {
        // Upload image to storage and get URL
        imageUrl = await uploadProfileImage(
          selectedFile,
          currentUser.email,
          currentUser.uid,
          'posts'
        );
      }

      // Create post with optional image
      const newPost = await createPost(postData, selectedFile);
      
      // Update recent posts list
      setRecentPosts(prevPosts => [newPost, ...prevPosts.slice(0, 2)]);
      
      // Reset form
      setPostContent('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setShowEditor(false);
      
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="community-preview">
      <div className="community-preview-header">
        <div className="community-preview-title">
          <FontAwesomeIcon icon={faUsers} className="community-icon" />
          <h2>Join Our Community</h2>
        </div>
        <Link to="/community" className="view-all-link">
          View All <FontAwesomeIcon icon={faArrowRight} />
        </Link>
      </div>
      
      {currentUser && (
        <div className="post-creation-area">
          <div className="post-input-container">
            {!showEditor ? (
              <>
                <div className="user-avatar">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt={currentUser.displayName || 'User'} />
                  ) : (
                    <div className="avatar-placeholder">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="post-input-wrapper" onClick={toggleEditor}>
                  <input 
                    type="text"
                    placeholder="Start a post..."
                    className="post-input"
                    readOnly
                  />
                </div>
                <button className="article-button" onClick={toggleEditor}>
                  <FontAwesomeIcon icon={faNewspaper} />
                  <span>Article</span>
                </button>
              </>
            ) : (
              <div className="post-editor">
                <div className="editor-header">
                  <h3>Create a post</h3>
                  <button className="close-editor" onClick={toggleEditor}>×</button>
                </div>
                <div className="editor-content">
                  <div className="user-info">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt={currentUser.displayName || 'User'} className="user-avatar" />
                    ) : (
                      <div className="avatar-placeholder">
                        {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span>{currentUser.displayName || currentUser.email.split('@')[0]}</span>
                  </div>
                  <div 
                    className="rich-text-editor" 
                    ref={editorRef}
                    contentEditable="true"
                    onInput={(e) => setPostContent(e.target.innerHTML)}
                    placeholder="What do you want to talk about?"
                  ></div>
                  
                  {previewUrl && (
                    <div className="media-preview">
                      <img src={previewUrl} alt="Preview" />
                      <button className="remove-media" onClick={handleRemoveFile}>×</button>
                    </div>
                  )}
                </div>
                <div className="editor-toolbar">
                  <button className="toolbar-btn" onClick={() => handleFormatText('bold')} title="Bold">
                    <FontAwesomeIcon icon={faBold} />
                  </button>
                  <button className="toolbar-btn" onClick={() => handleFormatText('italic')} title="Italic">
                    <FontAwesomeIcon icon={faItalic} />
                  </button>
                  <button className="toolbar-btn" onClick={() => handleFormatText('ul')} title="Bullet List">
                    <FontAwesomeIcon icon={faListUl} />
                  </button>
                  <button className="toolbar-btn" onClick={() => handleFormatText('ol')} title="Numbered List">
                    <FontAwesomeIcon icon={faListOl} />
                  </button>
                  <button className="toolbar-btn" onClick={() => handleFormatText('link')} title="Add Link">
                    <FontAwesomeIcon icon={faLink} />
                  </button>
                  <button className="toolbar-btn" onClick={triggerFileUpload} title="Add Image">
                    <FontAwesomeIcon icon={faImage} />
                  </button>
                  <button className="toolbar-btn" title="Add Video">
                    <FontAwesomeIcon icon={faVideo} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>
                <div className="editor-actions">
                  <button 
                    className="post-btn" 
                    onClick={handleSubmitPost}
                    disabled={isPosting || (!postContent.trim() && !selectedFile)}
                  >
                    {isPosting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="community-preview-content">
        {loading ? (
          <div className="preview-loading">Loading recent posts...</div>
        ) : recentPosts.length > 0 ? (
          <div className="preview-posts">
            {recentPosts.map((post) => (
              <div key={post.id} className="preview-post">
                <div className="preview-post-header">
                  <img 
                    src={post.userAvatar || 'https://via.placeholder.com/40'} 
                    alt={post.userName} 
                    className="preview-avatar" 
                  />
                  <div className="preview-user-info">
                    <span className="preview-username">{post.userName}</span>
                    <span className="preview-time">{formatDate(post.createdAt)}</span>
                  </div>
                </div>
                <div className="preview-post-content" 
                  dangerouslySetInnerHTML={{ __html: post.content.length > 120 ? 
                    `${post.content.substring(0, 120)}...` : post.content }}>
                </div>
                {post.imageUrl && (
                  <div className="preview-image-container">
                    <img src={post.imageUrl} alt="Post content" className="preview-image" />
                  </div>
                )}
                <div className="preview-post-stats">
                  <span>{post.likes?.length || 0} likes</span>
                  <span>{post.comments?.length || 0} comments</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-posts-preview">
            <p>Be the first to share in our community!</p>
            <Link to="/community" className="join-community-button">
              Join Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityPreview; 