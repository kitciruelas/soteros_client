interface AvatarProps {
  name?: string;
  email?: string;
  profilePicture?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBadge?: boolean;
  badgeColor?: 'green' | 'red' | 'yellow' | 'blue';
  badgeIcon?: string;
  onClick?: () => void;
}

export default function Avatar({
  name,
  email,
  profilePicture,
  size = 'md',
  className = '',
  showBadge = false,
  badgeColor = 'green',
  badgeIcon = 'ri-check-line',
  onClick
}: AvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl'
  };

  const badgeSizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
    '2xl': 'w-8 h-8'
  };

  const badgeColorClasses = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500'
  };

  const badgePositionClasses = {
    xs: '-bottom-0.5 -right-0.5',
    sm: '-bottom-0.5 -right-0.5',
    md: '-bottom-1 -right-1',
    lg: '-bottom-1 -right-1',
    xl: '-bottom-2 -right-2',
    '2xl': '-bottom-2 -right-2'
  };

  // Get initials from name or email
  const getInitials = () => {
    if (name) {
      const nameParts = name.trim().split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase();
      }
      return nameParts[0].charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const baseClasses = `bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg text-white font-bold relative overflow-hidden`;
  const clickableClass = onClick ? 'cursor-pointer hover:shadow-xl transition-shadow duration-200' : '';

  // Build the full URL for the profile picture
  const getProfilePictureUrl = () => {
    if (!profilePicture) return null;
    
    // If it's already a full URL, return as is
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    
    // If it starts with /uploads, it's a relative path from the backend
    if (profilePicture.startsWith('/uploads')) {
      // Get the backend URL from environment or use localhost
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      return `${backendUrl}${profilePicture}`;
    }
    
    // Otherwise, assume it's a relative path
    return profilePicture;
  };

  const profilePictureUrl = getProfilePictureUrl();

  return (
    <div className="relative inline-block">
      <div
        className={`${baseClasses} ${sizeClasses[size]} ${clickableClass} ${className}`}
        onClick={onClick}
      >
        {profilePictureUrl ? (
          <img
            src={profilePictureUrl}
            alt={name || email || 'Profile'}
            className="w-full h-full object-cover"
            onError={(e) => {
              // If image fails to load, hide the img and show initials
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          getInitials()
        )}
      </div>
      
      {showBadge && (
        <div
          className={`absolute ${badgePositionClasses[size]} ${badgeSizeClasses[size]} ${badgeColorClasses[badgeColor]} rounded-full border-2 border-white flex items-center justify-center`}
        >
          <i className={`${badgeIcon} text-white text-xs`}></i>
        </div>
      )}
    </div>
  );
}
