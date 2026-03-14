/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Timer, User, Play, RotateCcw, Star, CheckCircle2, Sparkles } from 'lucide-react';

// --- Types ---
interface Card {
  id: number;
  emoji: string;
}

interface RankingEntry {
  name: string;
  score: number;
}

type Screen = 'START' | 'GAME' | 'RESULT' | 'RANKING';
type Difficulty = 'EASY' | 'NORMAL'; // EASY: 4x4, NORMAL: 5x5

// --- Constants ---
// Expanded emoji pool to ensure uniqueness
const EMOJI_POOL = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐯', '🦁', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦',
  '🐤', '🐣', '🐥', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷',
  '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
  '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃',
  '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃',
  '🦚', '🦜', '🦢', '🦩', '🕊', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿', '🦔'
];

const INITIAL_TIME = 15;
const MATCH_SCORE = 100;
const RANKING_KEY = 'emoji_rank_v4';

// --- Audio Utility ---
const playSound = (type: 'correct' | 'incorrect') => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  
  const ctx = new AudioContextClass();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === 'correct') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } else {
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }
};

export default function App() {
  // --- State ---
  const [screen, setScreen] = useState<Screen>('START');
  const [nickname, setNickname] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [pangEffect, setPangEffect] = useState<{ x: number, y: number, id: number } | null>(null);
  const [timeBonus, setTimeBonus] = useState(false);
  
  const scoreRef = useRef(0);
  const hasEndedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Sync scoreRef with score state for endGame access
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // --- Game Logic ---

  const generateInitialBoard = useCallback(() => {
    const size = difficulty === 'EASY' ? 16 : 25;
    hasEndedRef.current = false;
    
    // 1. Pick S-1 unique emojis
    const shuffledPool = [...EMOJI_POOL].sort(() => Math.random() - 0.5);
    const uniqueEmojis = shuffledPool.slice(0, size - 1);
    
    // 2. Pick one of them to be the pair
    const pairEmoji = uniqueEmojis[Math.floor(Math.random() * uniqueEmojis.length)];
    
    // 3. Create board with one duplicate
    const boardEmojis = [...uniqueEmojis, pairEmoji];
    
    const shuffledBoard = boardEmojis
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
      }));
    setCards(shuffledBoard);
  }, [difficulty]);

  const startGame = () => {
    if (!nickname.trim()) {
      alert('닉네임을 적어주세요!');
      return;
    }
    setScore(0);
    setTimeLeft(INITIAL_TIME);
    setSelectedIndices([]);
    generateInitialBoard();
    setScreen('GAME');
  };

  const showRankings = () => {
    const currentRankings: RankingEntry[] = JSON.parse(localStorage.getItem(RANKING_KEY) || '[]');
    setRankings(currentRankings);
    setScreen('RANKING');
  };

  const endGame = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);
    setScreen('RESULT');
    
    const finalScore = scoreRef.current;
    const currentRankings: RankingEntry[] = JSON.parse(localStorage.getItem(RANKING_KEY) || '[]');
    const newRankings = [...currentRankings, { name: nickname, score: finalScore }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    localStorage.setItem(RANKING_KEY, JSON.stringify(newRankings));
    setRankings(newRankings);
  }, [nickname]);

  useEffect(() => {
    if (screen === 'GAME') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen, endGame]);

  const triggerPang = (index1: number, index2: number) => {
    if (!gridRef.current) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    const cardElements = gridRef.current.children;
    
    const rect1 = cardElements[index1].getBoundingClientRect();
    const rect2 = cardElements[index2].getBoundingClientRect();
    
    const centerX = (rect1.left + rect2.left) / 2 + rect1.width / 2 - gridRect.left;
    const centerY = (rect1.top + rect2.top) / 2 + rect1.height / 2 - gridRect.top;
    
    setPangEffect({ x: centerX, y: centerY, id: Date.now() });
    setTimeout(() => setPangEffect(null), 1000);
  };

  const handleCardClick = (index: number) => {
    if (selectedIndices.includes(index)) return;

    // If 2 are already selected (waiting for timeout), clicking a 3rd one
    // immediately clears the old selection and starts a new one.
    if (selectedIndices.length === 2) {
      setSelectedIndices([index]);
      return;
    }

    const newSelected = [...selectedIndices, index];
    setSelectedIndices(newSelected);

    if (newSelected.length === 2) {
      const [first, second] = newSelected;
      if (cards[first].emoji === cards[second].emoji) {
        // MATCH FOUND!
        playSound('correct');
        triggerPang(first, second);
        setTimeLeft((prev) => prev + 5);
        setTimeBonus(true);
        setTimeout(() => setTimeBonus(false), 1000);
        
        setTimeout(() => {
          setCards((prev) => {
            const currentEmojisOnBoard = prev.map(c => c.emoji);
            const matchedEmoji = prev[first].emoji;
            
            const potentialTargets = currentEmojisOnBoard.filter(e => e !== matchedEmoji);
            const nextPairEmoji = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
            
            const pool = [...EMOJI_POOL];
            const availableInPool = pool.filter(e => !currentEmojisOnBoard.includes(e));
            const brandNewEmoji = availableInPool[Math.floor(Math.random() * availableInPool.length)];
            
            const updated = [...prev];
            updated[first] = { ...updated[first], emoji: nextPairEmoji };
            updated[second] = { ...updated[second], emoji: brandNewEmoji };
            
            return updated;
          });
          setScore((s) => s + MATCH_SCORE);
          setSelectedIndices([]);
        }, 300);
      } else {
        // WRONG PAIR
        playSound('incorrect');
        // We still set a timeout to clear it automatically if they don't click anything else
        setTimeout(() => {
          setSelectedIndices(prev => prev.length === 2 ? [] : prev);
        }, 600);
      }
    }
  };

  // --- Render Helpers ---

  const renderStartScreen = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <div className="relative">
        <h1 className="text-5xl font-black text-yellow-500 drop-shadow-sm tracking-tight">
          이모지 팡!
        </h1>
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -top-6 -right-8 text-4xl"
        >
          🌟
        </motion.div>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-100 space-y-2">
        <p className="text-stone-700 font-bold">🎯 게임 규칙</p>
        <p className="text-stone-600 text-sm leading-relaxed">
          화면에서 <span className="text-orange-500 font-black underline">똑같은 이모지 딱 2개</span>를 찾으세요!<br/>
          맞추면 새로운 이모지가 생기며 짝이 바뀝니다.
        </p>
      </div>
      
      <div className="w-full max-w-xs space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">닉네임</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 적어주세요"
            maxLength={8}
            className="w-full px-4 py-3 text-xl text-center border-4 border-yellow-200 rounded-2xl focus:border-yellow-400 outline-none transition-colors font-bold text-stone-700 bg-white shadow-inner"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">난이도 선택</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDifficulty('EASY')}
              className={`py-3 rounded-xl font-bold transition-all ${
                difficulty === 'EASY' 
                ? 'bg-green-400 text-white shadow-md scale-105' 
                : 'bg-stone-100 text-stone-400'
              }`}
            >
              쉬움 (4x4)
            </button>
            <button
              onClick={() => setDifficulty('NORMAL')}
              className={`py-3 rounded-xl font-bold transition-all ${
                difficulty === 'NORMAL' 
                ? 'bg-orange-400 text-white shadow-md scale-105' 
                : 'bg-stone-100 text-stone-400'
              }`}
            >
              보통 (5x5)
            </button>
          </div>
        </div>

        <button
          onClick={startGame}
          className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-stone-800 font-black text-xl rounded-2xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
        >
          <Play fill="currentColor" size={24} />
          게임 시작!
        </button>

        <button
          onClick={showRankings}
          className="w-full py-3 bg-white hover:bg-stone-50 text-stone-600 font-bold text-lg rounded-2xl border-2 border-stone-100 shadow-sm transform active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Trophy size={20} className="text-yellow-500" />
          실시간 랭킹보기
        </button>
      </div>
    </motion.div>
  );

  const renderGameScreen = () => (
    <div className="w-full max-w-md mx-auto relative">
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full border-2 border-red-100 relative">
          <Timer className="text-red-500" size={20} />
          <span className={`text-2xl font-black ${timeLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-red-500'}`}>
            {timeLeft}초
          </span>
          <AnimatePresence>
            {timeBonus && (
              <motion.span
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: -20 }}
                exit={{ opacity: 0 }}
                className="absolute right-0 -top-4 text-green-500 font-black text-lg"
              >
                +5s
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 text-xs font-bold text-stone-400 uppercase tracking-widest">
            <Sparkles size={12} className="text-orange-400" />
            Score
          </div>
          <span className="text-3xl font-black text-orange-500">{score}</span>
        </div>
      </div>

      <div 
        ref={gridRef}
        className={`grid gap-2 sm:gap-3 bg-stone-100 p-3 rounded-3xl shadow-inner relative ${
          difficulty === 'EASY' ? 'grid-cols-4' : 'grid-cols-5'
        }`}
      >
        {cards.map((card, index) => {
          const isSelected = selectedIndices.includes(index);
          return (
            <motion.div
              key={card.id}
              layout
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCardClick(index)}
              className={`aspect-square rounded-xl cursor-pointer flex items-center justify-center text-3xl sm:text-4xl transition-all duration-300 relative bg-white border-2 shadow-sm ${
                isSelected ? 'ring-4 ring-yellow-400 border-yellow-400 bg-yellow-50 scale-110 z-10' : 'border-stone-200'
              }`}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={card.emoji}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {card.emoji}
                </motion.span>
              </AnimatePresence>
              
              {isSelected && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-0.5 shadow-md z-20"
                >
                  <CheckCircle2 size={16} className="text-white" />
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {/* Pang! Animation Overlay */}
        <AnimatePresence>
          {pangEffect && (
            <motion.div
              key={pangEffect.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              style={{
                position: 'absolute',
                left: pangEffect.x,
                top: pangEffect.y,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 50
              }}
              className="flex items-center justify-center"
            >
              <div className="relative">
                <span className="text-4xl font-black text-orange-500 drop-shadow-lg italic">팡!</span>
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0 }}
                    animate={{ 
                      x: Math.cos(i * 45 * Math.PI / 180) * 80, 
                      y: Math.sin(i * 45 * Math.PI / 180) * 80,
                      scale: 0
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute top-1/2 left-1/2 w-3 h-3 bg-yellow-400 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-stone-400 font-bold text-sm">
        <User size={16} />
        플레이어: {nickname} ({difficulty === 'EASY' ? '쉬움' : '보통'})
      </div>
    </div>
  );

  const renderResultScreen = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center w-full max-w-sm mx-auto"
    >
      <div className="space-y-1">
        <h2 className="text-3xl font-black text-red-500">시간 종료!</h2>
        <p className="text-stone-600 font-bold text-lg">
          <span className="text-yellow-600">{nickname}</span> 친구의 점수
        </p>
      </div>

      <div className="bg-orange-50 w-full py-6 rounded-3xl border-4 border-orange-100">
        <h1 className="text-6xl font-black text-orange-500 drop-shadow-sm">
          {score}점
        </h1>
      </div>

      <div className="w-full bg-stone-50 p-6 rounded-3xl border-2 border-stone-100 text-left">
        <div className="flex items-center gap-2 mb-4 text-stone-800 font-black border-b-2 border-stone-200 pb-2">
          <Trophy className="text-yellow-500" size={20} />
          🏆 실시간 랭킹
        </div>
        <div className="space-y-3">
          {rankings.map((r, i) => (
            <div key={i} className={`flex justify-between items-center p-2 rounded-xl ${r.name === nickname && r.score === score ? 'bg-yellow-100' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                  i === 0 ? 'bg-yellow-400 text-white' : 'bg-stone-200 text-stone-600'
                }`}>
                  {i + 1}
                </span>
                <span className="font-bold text-stone-700">{r.name}</span>
              </div>
              <span className="font-black text-stone-500">{r.score}점</span>
            </div>
          ))}
          {rankings.length === 0 && (
            <p className="text-center text-stone-400 py-4 italic">아직 랭킹이 없어요!</p>
          )}
        </div>
      </div>

      <button
        onClick={() => setScreen('START')}
        className="w-full py-4 bg-stone-800 hover:bg-stone-900 text-white font-black text-xl rounded-2xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <RotateCcw size={24} />
        다시 하기
      </button>
    </motion.div>
  );

  const renderRankingScreen = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center w-full max-w-sm mx-auto"
    >
      <div className="space-y-1">
        <h2 className="text-3xl font-black text-yellow-500">실시간 랭킹</h2>
        <p className="text-stone-500 font-medium">최고의 이모지 팡! 고수는 누구?</p>
      </div>

      <div className="w-full bg-stone-50 p-6 rounded-3xl border-2 border-stone-100 text-left">
        <div className="space-y-3">
          {rankings.map((r, i) => (
            <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-white border border-stone-100">
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                  i === 0 ? 'bg-yellow-400 text-white' : 'bg-stone-200 text-stone-600'
                }`}>
                  {i + 1}
                </span>
                <span className="font-bold text-stone-700">{r.name}</span>
              </div>
              <span className="font-black text-stone-500">{r.score}점</span>
            </div>
          ))}
          {rankings.length === 0 && (
            <p className="text-center text-stone-400 py-4 italic">아직 랭킹이 없어요!</p>
          )}
        </div>
      </div>

      <button
        onClick={() => setScreen('START')}
        className="w-full py-4 bg-stone-800 hover:bg-stone-900 text-white font-black text-xl rounded-2xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <RotateCcw size={24} />
        돌아가기
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#fff9c4] flex flex-col items-center justify-center p-4 font-sans selection:bg-yellow-200 overflow-hidden">
      <motion.div
        layout
        className="bg-white w-full max-w-md p-8 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-8 border-white"
      >
        <AnimatePresence mode="wait">
          {screen === 'START' && renderStartScreen()}
          {screen === 'GAME' && renderGameScreen()}
          {screen === 'RESULT' && renderResultScreen()}
          {screen === 'RANKING' && renderRankingScreen()}
        </AnimatePresence>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        className="mt-6 text-stone-500 font-bold text-[10px] tracking-[0.2em] uppercase"
      >
        made by kkh
      </motion.div>
    </div>
  );
}
