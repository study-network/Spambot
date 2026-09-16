import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Code2, Users, Heart, ShieldCheck } from 'lucide-react';
import { SiteSettings, TeamMember } from '../types.ts';
import { SocialIcon } from './SocialIcon.tsx';
import { fetchPublicTeamMembers } from '../lib/api.ts';
import { FormattedTextWithLinks } from './FormattedTextWithLinks.tsx';

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SiteSettings | null;
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Load team members
      setIsLoadingTeam(true);
      fetchPublicTeamMembers()
        .then((data) => setTeamMembers(data))
        .catch((err) => console.error('Error fetching team members:', err))
        .finally(() => setIsLoadingTeam(false));
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Settings values with defaults
  const brandName = settings?.brandName || 'LINK VERSE';
  const brandTagline = settings?.brandTagline || 'LEARN • EXPLORE • GROW';
  
  const aboutMessageTitle = settings?.aboutMessageTitle || 'Knowledge shared is a brighter tomorrow.';
  const aboutMessageSubtitle = settings?.aboutMessageSubtitle || 'Stay Connected • Stay Curious • Stay Ahead';

  const developerName = settings?.developerName || 'Ritesh';
  const developerRole = settings?.developerRole || 'Founder & Developer';
  const developerDescription = settings?.developerDescription || 
    "Hi! I'm the developer of LINK VERSE. I build this platform to make learning and resources easily accessible for everyone. My goal is to create a simple, fast and helpful platform for students and learners.";
  const developerPhoto = settings?.developerPhoto || '';
  const developerTagline = settings?.developerTagline || 'Code • Create • Contribute • Grow';
  
  // Filter developer social links to only active valid URLs
  const developerLinks = (settings?.developerSocialLinks || []).filter(
    (l) => l && l.url && (l.url.startsWith('http://') || l.url.startsWith('https://'))
  );

  const aboutFooterTitle = settings?.aboutFooterTitle || 'Thanks for being a part of LINK VERSE.';
  const aboutFooterSubtitle = settings?.aboutFooterSubtitle || 'Together, we can make learning simple, free and accessible for everyone.';
  const aboutFooterTagline = settings?.aboutFooterTagline || 'Keep Learning • Keep Exploring • Keep Growing';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="about-us-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            id="about-us-modal-card"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Brand & Close Button */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-800/80 bg-neutral-900/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="about-us-brand-title" className="font-extrabold text-lg text-white tracking-wide leading-tight">
                    {brandName}
                  </h2>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400">
                    <FormattedTextWithLinks text={brandTagline} linkClassName="text-purple-300 underline underline-offset-2" />
                  </p>
                </div>
              </div>

              <button
                id="about-us-close-btn"
                type="button"
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-neutral-200">
              {/* CARD 1: INSPIRING KNOWLEDGE MESSAGE */}
              <div 
                id="about-message-banner"
                className="relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-neutral-900 to-purple-950/30 border border-indigo-900/40 text-center space-y-1.5"
              >
                <div className="text-sm sm:text-base font-semibold text-neutral-100 leading-snug whitespace-pre-wrap break-words">
                  "<FormattedTextWithLinks text={aboutMessageTitle} linkClassName="text-purple-300 hover:text-purple-200 underline underline-offset-2 break-all font-semibold" />"
                </div>
                <div className="text-xs font-medium text-purple-300/90 tracking-wide whitespace-pre-wrap break-words">
                  <FormattedTextWithLinks text={aboutMessageSubtitle} linkClassName="text-purple-200 hover:text-white underline underline-offset-2 break-all font-semibold" />
                </div>
              </div>

              {/* CARD 2: DEVELOPER SECTION */}
              <div 
                id="about-developer-card"
                className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700/80 transition-all space-y-4"
              >
                {/* Developer Profile Top Row */}
                <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-3.5">
                    {/* Developer Avatar */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 shadow-sm">
                      {developerPhoto ? (
                        <img
                          src={developerPhoto}
                          alt={developerName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{developerName.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white leading-none">
                          {developerName}
                        </h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 rounded-full">
                          <FormattedTextWithLinks text={developerRole} linkClassName="text-indigo-200 underline underline-offset-2" />
                        </span>
                      </div>
                      <div className="text-xs font-medium text-purple-400 mt-1 whitespace-pre-wrap break-words">
                        <FormattedTextWithLinks text={developerTagline} linkClassName="text-indigo-300 hover:text-indigo-200 underline underline-offset-2 break-all" />
                      </div>
                    </div>
                  </div>

                  {/* DEVELOPER SOCIAL LINKS - Subtle icons only, rendered only if added */}
                  {developerLinks.length > 0 && (
                    <div id="developer-social-links-row" className="flex items-center gap-1.5 shrink-0">
                      {developerLinks.map((link) => (
                        <SocialIcon key={link.id} link={link} size="sm" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Developer Description / Bio */}
                {developerDescription && (
                  <p className="text-xs sm:text-sm text-neutral-300/90 leading-relaxed pt-2 border-t border-neutral-800/80 whitespace-pre-wrap">
                    <FormattedTextWithLinks 
                      text={developerDescription}
                      linkClassName="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 break-all"
                    />
                  </p>
                )}
              </div>

              {/* CARD 3: OUR TEAM SECTION */}
              {teamMembers.length > 0 && (
                <div id="about-team-section" className="space-y-3 pt-1">
                  <div className="flex items-center gap-2 px-1">
                    <Users className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Our Team
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {teamMembers.map((member) => {
                      const memberLinks = (member.socialLinks || []).filter(
                        (l) => l && l.url && (l.url.startsWith('http://') || l.url.startsWith('https://'))
                      );

                      return (
                        <div
                          key={member.id}
                          id={`team-card-${member.id}`}
                          className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between gap-3"
                        >
                          <div>
                            {/* Member avatar & name */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                                  {member.photo ? (
                                    <img
                                      src={member.photo}
                                      alt={member.name}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <span>{member.name.slice(0, 2).toUpperCase()}</span>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-white truncate">
                                    {member.name}
                                  </h4>
                                  <span className="text-[11px] font-medium text-purple-400 block">
                                    <FormattedTextWithLinks text={member.role} linkClassName="text-purple-300 underline underline-offset-2" />
                                  </span>
                                </div>
                              </div>

                              {/* Member Social Links - rendered only if added */}
                              {memberLinks.length > 0 && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {memberLinks.map((link) => (
                                    <SocialIcon key={link.id} link={link} size="sm" />
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Member Bio */}
                            {member.description && (
                              <p className="text-xs text-neutral-400 mt-2.5 leading-relaxed whitespace-pre-wrap break-words">
                                <FormattedTextWithLinks 
                                  text={member.description}
                                  linkClassName="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 break-all font-medium"
                                />
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CARD 4: FOOTER ANNOUNCEMENT BANNER */}
              <div 
                id="about-footer-banner"
                className="p-4 sm:p-5 rounded-2xl bg-neutral-950/60 border border-neutral-800/90 text-center space-y-1.5"
              >
                <div className="text-xs sm:text-sm font-bold text-white whitespace-pre-wrap break-words">
                  <FormattedTextWithLinks 
                    text={aboutFooterTitle}
                    linkClassName="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 break-all"
                  />
                </div>
                <div className="text-xs text-neutral-400 whitespace-pre-wrap break-words">
                  <FormattedTextWithLinks 
                    text={aboutFooterSubtitle}
                    linkClassName="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 break-all"
                  />
                </div>
                <div className="text-[11px] font-semibold text-purple-400 tracking-wider pt-1 whitespace-pre-wrap break-words">
                  <FormattedTextWithLinks 
                    text={aboutFooterTagline}
                    linkClassName="text-purple-300 hover:text-purple-200 underline underline-offset-2 break-all"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Footer Action */}
            <div className="px-6 py-3.5 border-t border-neutral-800/80 bg-neutral-900/90 flex justify-end shrink-0">
              <button
                id="about-us-modal-dismiss-btn"
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
