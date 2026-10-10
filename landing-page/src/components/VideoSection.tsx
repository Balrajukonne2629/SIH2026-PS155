import React, { useState } from 'react';
import { Play, Clock, Users, ShieldAlert, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { VIDEO_CONFIG, VideoData } from '../data/videoConfig';

export const VideoSection: React.FC = () => {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

  return (
    <section id="videos" className="py-16 md:py-24 bg-app border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-2">
            Demonstration Sessions
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            Video Demonstration Theater
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
            Structured for executive evaluation and technical deep-dives: a 30-second problem/solution executive brief 
            and a 5-minute timestamped operational walkthrough.
          </p>
        </div>

        {/* Dual Video Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {VIDEO_CONFIG.videos.map((video: VideoData) => (
            <div
              key={video.id}
              className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between group"
            >
              <div>
                {/* Video Player Display / Poster Container */}
                <div className="relative aspect-video bg-slate-900 border-b border-slate-200 overflow-hidden">
                  {video.youtubeUrl ? (
                    <iframe
                      src={video.youtubeUrl}
                      title={video.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : video.videoSrc ? (
                    <video
                      controls
                      preload="metadata"
                      poster={video.posterSrc}
                      className="w-full h-full object-cover"
                    >
                      <source src={video.videoSrc} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <>
                      {video.posterSrc && (
                        <img
                          src={video.posterSrc}
                          alt={video.title}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-all duration-300 group-hover:scale-105"
                        />
                      )}

                      {/* Play Action Layer for mock/pending video */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                        <div
                          className="w-14 h-14 rounded-full bg-white/95 border border-sky-300 flex items-center justify-center text-sky-600 shadow-xl mb-3 group-hover:scale-110 group-hover:bg-sky-600 group-hover:text-white transition-all duration-200"
                        >
                          <Play className="w-5 h-5 ml-0.5 fill-current" />
                        </div>
                        <span className="text-xs font-mono font-medium px-3 py-1 rounded-full bg-slate-900/90 text-white border border-slate-800 shadow">
                          {video.statusLabel}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Duration Pill */}
                  <div className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded bg-slate-950/85 text-[11px] font-mono text-white flex items-center gap-1.5 border border-slate-800 pointer-events-none">
                    <Clock className="w-3 h-3 text-sky-400" />
                    <span>{video.durationLabel}</span>
                  </div>
                </div>

                {/* Video Metadata & Purpose */}
                <div className="p-6">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
                    <span className="text-sky-700 font-semibold">{video.category}</span>
                    <span>Audience: {video.targetAudience}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2 font-sans">
                    {video.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans mb-4">
                    {video.purpose}
                  </p>

                  {/* Transcript / Chapter Breakdown */}
                  {video.chapters ? (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 mb-2.5">
                        Timestamp Chapters (5:00 Structure)
                      </h4>
                      <div className="space-y-1.5">
                        {video.chapters.map((ch, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => setActiveChapterIndex(cIdx)}
                            className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-start gap-2.5 ${
                              activeChapterIndex === cIdx
                                ? 'bg-sky-50 border border-sky-200 text-slate-900'
                                : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                            }`}
                          >
                            <span className="font-mono text-sky-700 text-[11px] font-semibold shrink-0">
                              {ch.timeFormatted}
                            </span>
                            <div>
                              <div className="font-semibold text-slate-900">{ch.title}</div>
                              <div className="text-[11px] text-slate-500 line-clamp-1">{ch.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 mb-2">
                        Executive Sequence (0:30 Structure)
                      </h4>
                      <ul className="space-y-1.5">
                        {video.synopsis.map((line, sIdx) => (
                          <li key={sIdx} className="text-xs text-slate-600 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-1.5 shrink-0" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification & Live Status Note */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] font-mono text-slate-500 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {video.youtubeUrl ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span className="text-slate-800 font-semibold">Live Stream: Official 5-minute technical demo embedded via YouTube.</span>
                    </>
                  ) : video.videoSrc ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-700 font-semibold">Active Standalone Video: Live 1080p MP4 with embedded cryptographic poster.</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Zero fabrication guarantee: Video player will stream local MP4 upon final production recording.</span>
                    </>
                  )}
                </div>
                {video.youtubeUrl && (
                  <a
                    href="https://youtu.be/YGzcPgUpD8o"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 hover:underline ml-2"
                  >
                    Watch on YouTube ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
