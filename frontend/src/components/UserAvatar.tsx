import React, { useState, useEffect } from 'react';
import { fileService } from '../services/api';
import type { AvatarUpload } from '../services/api';

interface UserAvatarProps {
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showInitials?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  username = '',
  firstName = '',
  lastName = '',
  size = 'md',
  className = '',
  showInitials = true
}) => {
  const [avatar, setAvatar] = useState<AvatarUpload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6', 
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  useEffect(() => {
    loadAvatar();
  }, [userId]);

  const loadAvatar = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await fileService.getUserAvatar(userId);
      if (response.success && response.data) {
        setAvatar(response.data);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`;
    } else if (firstName) {
      return `${firstName.charAt(0)}${firstName.charAt(1) || ''}`;
    } else if (username) {
      return `${username.charAt(0)}${username.charAt(1) || ''}`;
    }
    return '??';
  };

  const getAvatarUrl = (size: 'small' | 'medium' | 'large' = 'medium') => {
    if (avatar?.paths?.[size]) {
      return fileService.getFileUrl(avatar.paths[size]);
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-200 rounded-full animate-pulse ${className}`} />
    );
  }

  if (avatar && !error) {
    return (
      <img
        src={getAvatarUrl() || ''}
        alt={`${firstName} ${lastName}`.trim() || username}
        className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200 ${className}`}
        onError={() => setError(true)}
      />
    );
  }

  if (showInitials) {
    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold ${textSizes[size]} ${className}`}>
        {getInitials()}
      </div>
    );
  }

  // Fallback icon
  return (
    <svg className={`${sizeClasses[size]} text-gray-400 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

export default UserAvatar;