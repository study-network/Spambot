import React, { useState } from 'react';
import studyNetworkLogoImg from '../assets/images/study_network_logo_1789601604393.jpg';

interface StudyNetworkLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

/**
 * StudyNetworkLogo
 * Renders the official Study Network emblem image attached by the user:
 * - Circular emblem with gold metallic border
 * - Black badge with mortarboard cap, open book, and STUDY NETWORK typography
 * - Fallback to public asset or vector if image fails
 */
export const StudyNetworkLogo: React.FC<StudyNetworkLogoProps> = ({
  className = '',
  size = 40,
  alt = 'Study Network Logo'
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 select-none rounded-full ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={alt}
    >
      {!imgError ? (
        <img
          src={studyNetworkLogoImg || '/study-network-logo.png'}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain rounded-full drop-shadow-[0_2px_8px_rgba(212,175,55,0.35)] hover:scale-105 transition-transform duration-200"
          style={{ width: size, height: size }}
        />
      ) : (
        <img
          src="/study-network-logo.svg"
          alt={alt}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain rounded-full"
          style={{ width: size, height: size }}
        />
      )}
    </div>
  );
};
