/**
 * ScoreDisplay - ABC.js based score renderer with note highlighting
 */
import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import abcjs from 'abcjs';
import './ScoreDisplay.css';

const ScoreDisplay = forwardRef(function ScoreDisplay(
  { abcString, currentNoteIndex, showHints, hintType, onNotesExtracted },
  ref
) {
  const containerRef = useRef(null);
  const renderedRef = useRef(null);
  const notesRef = useRef([]);

  const timingRef = useRef(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getNotes: () => notesRef.current,
    getVisualObj: () => renderedRef.current?.[0] || renderedRef.current,
    
    // Karaoke/strict timing mode methods
    startTiming: (bpm, countInBeats, onNoteEvent, onBeatEvent) => {
      if (timingRef.current) timingRef.current.stop();
      
      // Clear all active note highlights for a fresh start/loop
      document.querySelectorAll('.note-current, .note-passed, .note-correct').forEach(n => {
         n.classList.remove('note-current', 'note-passed', 'note-correct');
         n.querySelector('path')?.removeAttribute('stroke');
         n.querySelector('path')?.removeAttribute('fill');
      });
      
      const visualObj = renderedRef.current?.[0] || renderedRef.current;
      if (!visualObj) return;

      timingRef.current = new abcjs.TimingCallbacks(visualObj, {
        qpm: bpm,
        extraMeasuresAtBeginning: 0, // We handle count-in manually via metronome
        eventCallback: (ev) => {
          if (!ev || !ev.elements) {
            // End of piece or rest without elements
            if (onNoteEvent) onNoteEvent(null);
            return;
          }
          
          // Clear all current highlights
          document.querySelectorAll('.note-current').forEach(n => n.classList.remove('note-current'));
          
          // Apply new highlights explicitly to the current group
          let noteIndex = -1;
          const flatElements = ev.elements ? ev.elements.flat(Infinity) : [];
          
          flatElements.forEach(el => {
            if (el && el.classList) {
              el.classList.add('note-current');
              
              // Find which index this corresponds to in our notesRef
              if (noteIndex === -1 && el.classList.contains('abcjs-note')) {
                const matched = notesRef.current.find(n => n.element === el);
                if (matched) noteIndex = matched.index;
              }
            }
          });

          // カラオケ再生中も現在音符を視領内に保つために自動スクロール
          // (イベントで複数音が来た場合最初の音を採用)
          const firstEl = flatElements.find(el => el?.classList?.contains('abcjs-note'));
          if (firstEl) {
            scrollNoteIntoView(firstEl);
          }
          
          // Add 'passed' class to previous notes
          if (noteIndex > 0) {
            for (let i = 0; i < noteIndex; i++) {
              if (notesRef.current[i]?.element) {
                notesRef.current[i].element.classList.add('note-passed');
              }
            }
          }
          
          if (onNoteEvent) onNoteEvent({ index: noteIndex, ev });
        },
        beatCallback: (beatNumber, totalBeats, totalTime) => {
          if (onBeatEvent) onBeatEvent(beatNumber);
        }
      });
      timingRef.current.start();
    },
    stopTiming: () => {
      if (timingRef.current) {
        timingRef.current.stop();
        timingRef.current = null;
      }
    },
    
    // Explicit manual highlighting (used for non-karaoke modes or hints)
    highlightNote: (idx) => highlightNote(idx),
  }));

  const highlightNote = useCallback((idx) => {
    if (!containerRef.current) return;
    
    // Remove existing highlights
    const allNotes = containerRef.current.querySelectorAll('.abcjs-note');
    allNotes.forEach(n => {
      n.classList.remove('note-current', 'note-next', 'note-passed');
    });
    
    // Apply new highlights
    if (idx >= 0 && idx < notesRef.current.length) {
      const currentEl = notesRef.current[idx]?.element;
      const nextEl = notesRef.current[idx + 1]?.element;
      
      if (currentEl) {
        currentEl.classList.add('note-current');
        // 現在の音符が視領外ならスクロールして見えるようにする
        scrollNoteIntoView(currentEl);
      }
      if (nextEl) nextEl.classList.add('note-next');
      
      // Mark passed notes
      for (let i = 0; i < idx; i++) {
        notesRef.current[i]?.element?.classList.add('note-passed');
      }
    }
  }, []);

  // スクロールコンテナを見つけてノートを早めに表示領域内に入れる
  const scrollNoteIntoView = (el) => {
    if (!el || !containerRef.current) return;
    const scrollParent = containerRef.current.closest(
      '.practice-score-area, .preview-score-area'
    );
    if (!scrollParent) return;
    
    const noteRect = el.getBoundingClientRect();
    const parentRect = scrollParent.getBoundingClientRect();
    
    // スクロールを早めにトリガー（画面下部40%に来たら、上部20%の位置まで一気にスクロール）
    if (noteRect.bottom > parentRect.bottom - (parentRect.height * 0.4)) {
      const targetScrollTop = scrollParent.scrollTop + (noteRect.top - parentRect.top) - (parentRect.height * 0.2);
      scrollParent.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    } else if (noteRect.top < parentRect.top + (parentRect.height * 0.1)) {
      const targetScrollTop = scrollParent.scrollTop + (noteRect.top - parentRect.top) - (parentRect.height * 0.2);
      scrollParent.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!containerRef.current || !abcString) return;

    // Clear previous render
    containerRef.current.innerHTML = '';

    try {
      // staffwidthを固定し、レスポンシブ崩れを防止。ABC側での\n改行命令に従わせる
      const renderOptions = {
        add_classes: true,
        clickListener: null,
        staffwidth: 850,
        scale: 1.3,
        paddingtop: 16,
        paddingbottom: 16,
        paddingleft: 15,
        paddingright: 15,
        wrap: { minSpacing: 1.0, maxSpacing: 2.8, preferredMeasuresPerLine: 4 },
        format: {
          gchordfont: 'Helvetica 14',
          annotationfont: 'Helvetica 12',
        },
      };

      renderedRef.current = abcjs.renderAbc(
        containerRef.current,
        abcString,
        renderOptions
      );

      // Extract note elements from rendered SVG
      setTimeout(() => {
        if (!containerRef.current) return;
        const noteEls = containerRef.current.querySelectorAll('.abcjs-note');
        const notes = [];
        
        noteEls.forEach((el, i) => {
          // Try to get pitch info from data attributes or class names
          const classList = Array.from(el.classList);
          const pitchClass = classList.find(c => c.startsWith('abcjs-p'));
          
          notes.push({
            element: el,
            index: i,
            pitchClass,
          });
        });
        
        notesRef.current = notes;
        if (onNotesExtracted) onNotesExtracted(notes.length);
        
        // Apply initial highlight
        if (currentNoteIndex !== undefined) {
          highlightNote(currentNoteIndex);
        }

        // Apply hints if active
        if (showHints && hintType) {
          applyHints(notes, hintType, abcString);
        }
      }, 100);

    } catch (err) {
      console.error('ABC.js render error:', err);
    }
  }, [abcString]); // Re-render when ABC string changes

  useEffect(() => {
    if (notesRef.current.length > 0) {
      highlightNote(currentNoteIndex);
    }
  }, [currentNoteIndex, highlightNote]);

  return (
    <div className="score-display-wrapper">
      <div ref={containerRef} className="score-display-container" id="abc-render-target" />
    </div>
  );
});

/**
 * Apply visual hints to note elements
 */
function applyHints(notes, hintType, abcString) {
  // Parse note names from ABC string for hint overlay
  const notePattern = /[\^_]?[A-Ga-g][,']*/g;
  const matches = [...abcString.matchAll(notePattern)];
  
  notes.forEach((note, i) => {
    if (!note.element || !matches[i]) return;
    
    // Remove existing hints
    note.element.querySelectorAll('.note-hint-label').forEach(el => el.remove());
    
    const hintEl = document.createElement('text');
    hintEl.className = 'note-hint-label';
    
    if (hintType === 'note') {
      hintEl.textContent = abcNoteToName(matches[i]?.[0] || '');
    } else if (hintType === 'interval') {
      hintEl.textContent = String(i + 1); // Simplified
    }
    
    // Position hint above note head
    const bbox = note.element.getBBox?.();
    if (bbox) {
      hintEl.setAttribute('x', bbox.x + bbox.width / 2);
      hintEl.setAttribute('y', bbox.y - 5);
      hintEl.setAttribute('text-anchor', 'middle');
      note.element.closest('svg')?.appendChild(hintEl);
    }
  });
}

function abcNoteToName(abcNote) {
  if (!abcNote) return '';
  const clean = abcNote.replace(/[,'"]/g, '');
  const map = {
    'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G', 'A': 'A', 'B': 'B',
    'c': 'C', 'd': 'D', 'e': 'E', 'f': 'F', 'g': 'G', 'a': 'A', 'b': 'B',
    '^C': 'C#', '^D': 'D#', '^F': 'F#', '^G': 'G#', '^A': 'A#',
    '_D': 'Db', '_E': 'Eb', '_G': 'Gb', '_A': 'Ab', '_B': 'Bb',
  };
  return map[clean] || clean;
}

export default ScoreDisplay;
