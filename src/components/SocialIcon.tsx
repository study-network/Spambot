import React from 'react';
import { 
  Send, 
  MessageCircle, 
  Instagram, 
  Youtube, 
  Github, 
  Twitter, 
  Facebook, 
  Linkedin, 
  Globe, 
  Link2 
} from 'lucide-react';
import { SocialLink, SocialPlatform } from '../types.ts';

interface SocialIconProps {
  link: SocialLink;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const PLATFORM_INFO: Record<string, { label: string; icon: React.FC<{ className?: string }>; colorClass: string; hoverBg: string; placeholder: string }> = {
  telegram: {
    label: 'Telegram',
    icon: Send,
    colorClass: 'text-sky-400',
    hoverBg: 'hover:border-sky-500/50 hover:bg-sky-500/10 hover:text-sky-300',
    placeholder: 'https://t.me/username',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    colorClass: 'text-emerald-400',
    hoverBg: 'hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300',
    placeholder: 'https://wa.me/1234567890',
  },
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    colorClass: 'text-pink-400',
    hoverBg: 'hover:border-pink-500/50 hover:bg-pink-500/10 hover:text-pink-300',
    placeholder: 'https://instagram.com/username',
  },
  youtube: {
    label: 'YouTube',
    icon: Youtube,
    colorClass: 'text-red-400',
    hoverBg: 'hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300',
    placeholder: 'https://youtube.com/@channel',
  },
  github: {
    label: 'GitHub',
    icon: Github,
    colorClass: 'text-slate-200',
    hoverBg: 'hover:border-slate-400/50 hover:bg-slate-700/50 hover:text-white',
    placeholder: 'https://github.com/username',
  },
  twitter: {
    label: 'X (Twitter)',
    icon: Twitter,
    colorClass: 'text-sky-300',
    hoverBg: 'hover:border-sky-400/50 hover:bg-sky-400/10 hover:text-sky-200',
    placeholder: 'https://x.com/username',
  },
  facebook: {
    label: 'Facebook',
    icon: Facebook,
    colorClass: 'text-blue-400',
    hoverBg: 'hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300',
    placeholder: 'https://facebook.com/username',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: Linkedin,
    colorClass: 'text-blue-400',
    hoverBg: 'hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300',
    placeholder: 'https://linkedin.com/in/username',
  },
  website: {
    label: 'Website',
    icon: Globe,
    colorClass: 'text-teal-400',
    hoverBg: 'hover:border-teal-500/50 hover:bg-teal-500/10 hover:text-teal-300',
    placeholder: 'https://example.com',
  },
  custom: {
    label: 'Custom Link',
    icon: Link2,
    colorClass: 'text-purple-400',
    hoverBg: 'hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-300',
    placeholder: 'https://example.com',
  },
};

export const SocialIcon: React.FC<SocialIconProps> = ({ link, size = 'sm', showLabel = false }) => {
  if (!link || !link.url) return null;

  const pKey = (link.platform || 'website').toLowerCase();
  const info = PLATFORM_INFO[pKey] || PLATFORM_INFO.custom;
  const IconComp = info.icon;
  const label = link.customName || info.label;

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-9 h-9 text-base',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  };

  return (
    <a
      id={`social-link-${link.id || pKey}`}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-full bg-slate-800/80 border border-slate-700/70 text-slate-300 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm ${sizeClasses[size]} ${info.hoverBg}`}
      onClick={(e) => e.stopPropagation()}
    >
      <IconComp className={`${iconSizes[size]} ${info.colorClass}`} />
      {showLabel && (
        <span className="ml-1.5 text-xs font-medium text-slate-200 truncate">{label}</span>
      )}
    </a>
  );
};
